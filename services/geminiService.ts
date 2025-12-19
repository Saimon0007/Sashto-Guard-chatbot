import { 
  GoogleGenAI, 
  GenerateContentResponse, 
  Chat, 
  FunctionDeclaration, 
  Type,
  Tool,
  Content,
  Part
} from "@google/genai";
import { UserProfile, Reminder, ConsentSettings, HealthRecord } from '../types';

// Define the function tool for creating reminders
const createReminderTool: FunctionDeclaration = {
  name: 'createReminder',
  description: 'Set a reminder for the user to take medication, eat, or attend an appointment.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'The content of the reminder (e.g., "Take Aspirin", "Lunch time").'
      },
      time: {
        type: Type.STRING,
        description: 'The time for the reminder (e.g., "2023-10-27T10:00:00" or "8:00 PM"). If relative (e.g. "in 1 hour"), calculate the approximate absolute time based on current context.'
      },
      type: {
        type: Type.STRING,
        description: 'Type of reminder: "medication", "diet", "appointment", or "general".',
        enum: ['medication', 'diet', 'appointment', 'general']
      }
    },
    required: ['title', 'time', 'type']
  }
};

// Add Google Search Tool alongside function declarations
const tools: Tool[] = [
  { functionDeclarations: [createReminderTool] },
  { googleSearch: {} }
];

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

export const initializeGemini = (apiKey: string) => {
  genAI = new GoogleGenAI({ apiKey });
};

export const startChat = async (
  profile: UserProfile, 
  consent: ConsentSettings, 
  records: HealthRecord[], 
  history?: Content[]
) => {
  if (!genAI) throw new Error("Gemini not initialized");

  // Filter data based on consent
  const demographicContext = consent.shareDemographics 
    ? `Name: ${profile.name || 'User'}, Age: ${profile.age || 'Unknown'}, Language: ${profile.language || 'English'}`
    : "Demographics withheld by user privacy settings.";

  const conditionContext = consent.shareConditions
    ? `Known Conditions: ${profile.conditions || 'None'}. Vault Records: ${records.filter(r => r.category === 'condition').map(r => r.title).join(', ')}`
    : "Condition history withheld by user privacy settings.";

  const medicationContext = consent.shareMedications
    ? `Current Medication: ${profile.medicationName ? `${profile.medicationName} (${profile.dosage || 'Dosage N/A'})` : 'None listed'}. Vault Records: ${records.filter(r => r.category === 'medication').map(r => r.title).join(', ')}`
    : "Medication history withheld by user privacy settings.";

  const labContext = consent.shareLabs
    ? `Recent Labs: ${records.filter(r => r.category === 'lab').map(r => `${r.title}: ${r.value}`).join('; ')}`
    : "Lab results withheld by user privacy settings.";

  const systemInstruction = `
    You are HealthGuard, an advanced, empathetic, and medically aware AI health assistant.
    
    SYSTEM DIRECTIVE: EXTREME CONTEXT AWARENESS
    You must actively synthesize all provided user data (Profile, Conditions, Meds, Labs) to provide highly personalized safety checks and advice.
    - If a user asks about a food, check their medications for interactions AND their conditions/dietary restrictions.
    - If a user reports a symptom, cross-reference with known side effects of their current medications.
    
    USER PROFILE CONTEXT (Access controlled by Patient Consent):
    ${demographicContext}
    ${conditionContext}
    ${medicationContext}
    ${labContext}
    Dietary Restrictions: ${profile.dietaryRestrictions || 'None'}
    Location: ${profile.location.city ? profile.location.city : `Lat: ${profile.location.lat}, Lng: ${profile.location.lng}`} (Used for local resource finding).
    
    YOUR RESPONSIBILITIES:
    1. RESEARCH FIRST: Use the Google Search tool to find the most up-to-date medical info, guidelines, outbreaks, or drug interactions before answering medical queries.
    2. SAFETY DISCLAIMER: ALWAYS start or end with: "I am an AI, not a doctor. Please consult a medical professional."
    3. LANGUAGE: Tailor your response to the user's language preference (${profile.language || 'English'}).
    4. TOOLS: Use 'createReminder' for scheduling. Use 'googleSearch' for information.
    5. CONTINUITY: Remember past turns in the conversation.
    6. PRIVACY: Respect withheld data.
    7. ANALYSIS: Analyze attached reports carefully.
    
    CURRENT TIME: ${new Date().toLocaleString()}
  `;

  // Ensure history is valid content array
  const validHistory = history && history.length > 0 ? history : undefined;

  chatSession = genAI.chats.create({
    model: 'gemini-3-pro-preview', 
    config: {
      systemInstruction: systemInstruction,
      tools: tools,
    },
    history: validHistory
  });

  return chatSession;
};

interface SendMessageResult {
  text: string;
  sources?: { title: string; uri: string }[];
}

export const sendMessage = async (
  message: string, 
  attachment: { mimeType: string; data: string } | null,
  onReminderCreate: (reminder: Omit<Reminder, 'id' | 'completed'>) => void
): Promise<SendMessageResult> => {
  if (!chatSession) throw new Error("Chat session not started");

  try {
    // Construct the message payload
    let msgContent: string | Part[] = message;

    if (attachment) {
        msgContent = [
            {
                inlineData: {
                    mimeType: attachment.mimeType,
                    data: attachment.data
                }
            },
            { text: message }
        ];
    }

    // Explicitly pass message as object to match SDK requirements
    // The SDK's sendMessage supports string or Part[] in the 'message' field (or strictly 'message' parameter as per custom instruction wrapper assumption)
    const result = await chatSession.sendMessage({ message: msgContent as any });
    
    let textResponse = "";
    let sources: { title: string; uri: string }[] = [];

    // Helper to extract grounding
    const extractGrounding = (response: GenerateContentResponse) => {
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach(chunk => {
          if (chunk.web) {
            sources.push({
              title: chunk.web.title || 'Source',
              uri: chunk.web.uri || '#'
            });
          }
        });
      }
    };

    // Extract grounding from initial response
    extractGrounding(result);

    // Handle Function Calls
    const functionCalls = result.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      const functionResponses = [];
      
      for (const call of functionCalls) {
        if (call.name === 'createReminder') {
          const args = call.args as any;
          console.log("Tool called: createReminder", args);
          
          // Execute the tool logic on the client side
          onReminderCreate({
            title: args.title,
            time: args.time,
            type: args.type
          });

          // Prepare the response for the model
          functionResponses.push({
            id: call.id,
            name: call.name,
            response: { result: `Reminder set for ${args.title} at ${args.time}` }
          });
          
          textResponse += `(I've set a reminder for: ${args.title})\n`;
        }
      }

      // Send the tool execution result back to the model to get the final text response
      if (functionResponses.length > 0) {
        const toolResult = await chatSession.sendToolResponse({
            functionResponses: functionResponses
        });
        textResponse += toolResult.text;
        // Extract grounding from tool response as well
        extractGrounding(toolResult);
      }
    } else {
        textResponse = result.text;
    }

    // Remove duplicate sources
    const uniqueSources = sources.filter((source, index, self) =>
      index === self.findIndex((t) => (
        t.uri === source.uri
      ))
    );

    return { text: textResponse, sources: uniqueSources };
  } catch (error) {
    console.error("Gemini Error:", error);
    // Return a user-friendly error but log the specific SDK error above
    return { text: "I'm having trouble connecting to my medical database right now. Please try again." };
  }
};