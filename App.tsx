import React, { useState, useEffect, useRef } from 'react';
import { Message, Reminder, UserProfile, ViewState, HealthRecord, ConsentSettings, AuditLogEntry } from './types';
import ChatBubble from './components/ChatBubble';
import ReminderList from './components/ReminderList';
import SettingsModal from './components/SettingsModal';
import HealthVault from './components/HealthVault';
import { initializeGemini, startChat, sendMessage } from './services/geminiService';
import { Content } from '@google/genai';
import { t } from './translations';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: '',
  language: 'English',
  conditions: '',
  dietaryRestrictions: '',
  medicationName: '',
  dosage: '',
  frequency: '',
  medicationInstructions: '',
  location: { lat: null, lng: null }
};

const DEFAULT_CONSENT: ConsentSettings = {
  shareDemographics: true,
  shareMedications: true,
  shareConditions: true,
  shareLabs: false,
  shareWithResearch: false,
  retentionPeriod: '30_days'
};

const App: React.FC = () => {
  // State
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'model',
    text: "Hello! I'm HealthGuard. I can help you with medical information, diet planning, and reminders. Please set up your profile for a personalized experience.",
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.CHAT);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // New State for Vault
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [consent, setConsent] = useState<ConsentSettings>(DEFAULT_CONSENT);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<{
    data: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to add audit log
  const addAuditLog = (action: AuditLogEntry['action'], actor: AuditLogEntry['actor'], details: string) => {
    const newLog: AuditLogEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
      action,
      actor,
      details
    };
    setAuditLogs(prev => [...prev, newLog]);
  };

  // Initialize
  useEffect(() => {
    // Check environment variable for API Key
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      initializeGemini(apiKey);
    } else {
      console.error("API_KEY not found in environment variables");
      setMessages(prev => [...prev, {
        id: 'error-key',
        role: 'system',
        text: 'CRITICAL: API Key not found. Please configure the application with a valid API Key.',
        timestamp: new Date(),
        isError: true
      }]);
    }

    // Load from local storage
    const savedProfile = localStorage.getItem('health_profile');
    if (savedProfile) {
        setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(savedProfile) });
    }
    
    const savedReminders = localStorage.getItem('health_reminders');
    if (savedReminders) setReminders(JSON.parse(savedReminders));

    const savedRecords = localStorage.getItem('health_records');
    if (savedRecords) setRecords(JSON.parse(savedRecords));

    const savedConsent = localStorage.getItem('health_consent');
    if (savedConsent) setConsent(JSON.parse(savedConsent));

    const savedLogs = localStorage.getItem('health_audit_logs');
    if (savedLogs) setAuditLogs(JSON.parse(savedLogs));

    // Get Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setProfile(prev => ({
            ...prev,
            location: {
              ...prev.location,
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
        },
        (error) => console.log("Location access denied or failed", error)
      );
    }
  }, []);

  // Save to local storage on change
  useEffect(() => { localStorage.setItem('health_profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('health_reminders', JSON.stringify(reminders)); }, [reminders]);
  useEffect(() => { localStorage.setItem('health_records', JSON.stringify(records)); }, [records]);
  useEffect(() => { localStorage.setItem('health_consent', JSON.stringify(consent)); }, [consent]);
  useEffect(() => { localStorage.setItem('health_audit_logs', JSON.stringify(auditLogs)); }, [auditLogs]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,") to get just the base64 data
        const base64Data = base64String.split(',')[1];
        
        setSelectedFile({
          data: base64Data,
          mimeType: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
      attachment: selectedFile ? {
        type: 'image', // generalizing for UI, even if PDF
        mimeType: selectedFile.mimeType,
        data: selectedFile.data,
        name: selectedFile.name
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    
    // Store temp file reference for the API call then clear state
    const currentFile = selectedFile;
    const currentInput = input;
    
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);

    try {
      // Create history from existing messages (excluding system messages and errors)
      // Map existing 'Message' type to SDK 'Content' type
      const history: Content[] = messages
        .filter(m => !m.isError && (m.role === 'user' || m.role === 'model'))
        .map(m => {
          const parts: any[] = [{ text: m.text }];
          // Add history attachment if present
          if (m.attachment) {
             parts.unshift({
               inlineData: {
                 mimeType: m.attachment.mimeType,
                 data: m.attachment.data
               }
             });
          }
          return {
            role: m.role as 'user' | 'model',
            parts: parts
          };
        });

      // Initialize chat with history so context is preserved
      await startChat(profile, consent, records, history);
      
      // We only log the view access once per session or significantly, but for now log on send
      addAuditLog('VIEW', 'AI_Assistant', 'AI accessed allowed context for response generation');

      const response = await sendMessage(
        currentInput || (currentFile ? "Please analyze this attached report." : ""),
        currentFile, 
        (newReminderData) => {
          const newReminder: Reminder = {
            id: Date.now().toString() + Math.random().toString(),
            completed: false,
            ...newReminderData
          };
          setReminders(prev => [...prev, newReminder]);
          addAuditLog('MODIFY', 'AI_Assistant', `Created reminder: ${newReminder.title}`);
        }
      );

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        sources: response.sources,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      console.error("App Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        text: t(profile.language, 'errorGeneric'),
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ... (Reminder Handlers remain same) ...
  const handleReminderToggle = (id: string) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, completed: !r.completed, snoozed: false } : r
    ));
    addAuditLog('MODIFY', 'User', `Toggled reminder status`);
  };

  const handleReminderDelete = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    addAuditLog('MODIFY', 'User', `Deleted reminder`);
  };

  const handleReminderSnooze = (id: string) => {
    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        let date = new Date(r.time);
        if (isNaN(date.getTime())) date = new Date(`${new Date().toDateString()} ${r.time}`);
        if (isNaN(date.getTime())) date = new Date();
        const newTime = new Date(date.getTime() + 15 * 60000);
        return { ...r, time: newTime.toISOString(), snoozed: true, completed: false };
      }
      return r;
    }));
    addAuditLog('MODIFY', 'User', `Snoozed reminder`);
  };

  // Settings & Profile
  const handleProfileSave = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setShowSettings(false);
    addAuditLog('MODIFY', 'User', 'Updated profile manually');
  };

  // Vault Actions
  const handleImportSimulation = () => {
    // Simulate FHIR Import
    const newRecords: HealthRecord[] = [
      { id: 'rec_1', category: 'condition', title: 'Essential Hypertension', date: '2023-05-12', source: 'General Hospital (FHIR)', isVerified: true },
      { id: 'rec_2', category: 'medication', title: 'Lisinopril 10mg', date: '2023-05-12', source: 'General Hospital (FHIR)', isVerified: true },
      { id: 'rec_3', category: 'lab', title: 'Blood Pressure', date: '2023-10-20', value: '125/82 mmHg', source: 'Apple Health', isVerified: false },
      { id: 'rec_4', category: 'lab', title: 'HbA1c', date: '2023-09-01', value: '5.4%', source: 'General Hospital (FHIR)', isVerified: true },
    ];
    setRecords(prev => [...prev, ...newRecords]);
    addAuditLog('IMPORT', 'External_Provider', 'Imported 4 records from connected sources');
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profile, records, reminders }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "health_vault_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addAuditLog('EXPORT', 'User', 'Exported health data bundle');
  };

  const handleUpdateConsent = (newConsent: ConsentSettings) => {
     setConsent(newConsent);
     addAuditLog('MODIFY', 'User', 'Updated privacy consent settings');
  };

  const lang = profile.language || 'English';

  return (
    <div className={`flex h-full bg-bdgreen-50 font-sans ${lang === 'Arabic' ? 'rtl' : 'ltr'}`} dir={lang === 'Arabic' ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-gradient-to-br from-bdgreen-900 via-bdgreen-800 to-bdgreen-900 text-white shadow-xl animate-gradient-x">
        <div className="p-6 border-b border-bdgreen-700/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bdred-500 shadow-lg shadow-bdred-500/30 flex items-center justify-center text-white ring-2 ring-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
            </div>
          <h1 className="font-bold text-xl tracking-wide">{t(lang, 'appTitle')}</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-3">
          {[
             { id: ViewState.CHAT, label: t(lang, 'chat'), icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
             { id: ViewState.REMINDERS, label: t(lang, 'reminders'), icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', count: reminders.filter(r => !r.completed).length },
             { id: ViewState.VAULT, label: t(lang, 'vault'), icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
          ].map((item) => (
             <button 
               key={item.id}
               onClick={() => setCurrentView(item.id)}
               className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-300
                 ${currentView === item.id
                   ? 'bg-bdgreen-700/60 shadow-inner text-white font-medium border border-bdgreen-600' 
                   : 'text-bdgreen-100 hover:bg-bdgreen-800/50 hover:text-white'}`}
             >
               <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${lang === 'Arabic' ? 'ml-3' : 'mr-3'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
               </svg>
               {item.label}
               {item.count ? (
                 <span className={`bg-bdred-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ${lang === 'Arabic' ? 'mr-auto' : 'ml-auto'}`}>
                   {item.count}
                 </span>
               ) : null}
             </button>
          ))}
        </nav>

        <div className="p-4 border-t border-bdgreen-700/50">
           <div 
             className="bg-bdgreen-800/40 rounded-xl p-3 cursor-pointer hover:bg-bdgreen-700/60 transition-all duration-300 border border-transparent hover:border-bdgreen-600"
             onClick={() => setShowSettings(true)}
           >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-bdgreen-200 flex items-center justify-center text-bdgreen-900 font-bold border-2 border-bdgreen-600">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-bdgreen-50 truncate">{profile.name || t(lang, 'profile')}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative bg-gray-50/50">
        
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-bdgreen-900 text-white flex items-center justify-between px-4 z-10 shadow-md">
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-bdred-500 shadow-md"></div>
              <span className="font-bold text-lg">{t(lang, 'appTitle')}</span>
           </div>
           <button onClick={() => setCurrentView(ViewState.VAULT)} className="text-white">
              {t(lang, 'menu')}
           </button>
        </div>

        {/* View Switching */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* Chat View */}
          <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${currentView === ViewState.CHAT ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
                {messages.map((msg) => (
                   <ChatBubble key={msg.id} message={msg} language={lang} />
                ))}
                {isLoading && (
                   <div className="flex w-full mb-4 justify-start">
                      <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-bdgreen-100 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-bdgreen-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-bdgreen-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-bdgreen-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
             </div>
             
             {/* Input Area */}
             <div className="p-4 bg-white/80 backdrop-blur-md border-t border-bdgreen-100 relative">
                
                {/* File Preview */}
                {selectedFile && (
                   <div className="absolute top-[-50px] left-6 bg-white p-2 rounded-lg shadow-lg border border-bdgreen-200 flex items-center gap-3 animate-fade-in-up">
                      {selectedFile.mimeType === 'application/pdf' ? (
                          <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                             </svg>
                          </div>
                      ) : (
                          <img src={`data:${selectedFile.mimeType};base64,${selectedFile.data}`} alt="preview" className="w-8 h-8 rounded object-cover" />
                      )}
                      <span className="text-xs text-gray-600 font-medium truncate max-w-[150px]">{selectedFile.name}</span>
                      <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                         </svg>
                      </button>
                   </div>
                )}

                <div className="max-w-4xl mx-auto relative flex items-center group">
                   
                   {/* Hidden File Input */}
                   <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf"
                      className="hidden"
                   />

                   {/* Attachment Button */}
                   <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`absolute ${lang === 'Arabic' ? 'right-16' : 'left-3'} p-2 text-bdgreen-500 hover:text-bdgreen-700 hover:bg-bdgreen-50 rounded-full transition-colors z-10`}
                      title={t(lang, 'attachFile')}
                   >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                   </button>

                   <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={isLoading ? t(lang, 'thinking') : t(lang, 'askPlaceholder')}
                      disabled={isLoading}
                      className={`w-full bg-white text-gray-800 rounded-full py-4 shadow-sm border border-gray-200 focus:border-bdgreen-500 focus:ring-2 focus:ring-bdgreen-200 focus:outline-none transition-all placeholder-gray-400 ${lang === 'Arabic' ? 'pl-14 pr-16' : 'pl-14 pr-14'}`}
                   />
                   <button 
                      onClick={handleSendMessage}
                      disabled={isLoading || (!input.trim() && !selectedFile)}
                      className={`absolute ${lang === 'Arabic' ? 'left-2' : 'right-2'} p-2.5 bg-gradient-to-r from-bdred-500 to-bdred-600 text-white rounded-full hover:shadow-lg disabled:opacity-50 transition-all shadow-bdred-500/20`}
                   >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${lang === 'Arabic' ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                   </button>
                </div>
             </div>
          </div>

          {/* Reminders View */}
          <div className={`absolute inset-0 flex flex-col bg-gray-50 transition-opacity duration-300 ${currentView === ViewState.REMINDERS ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             <div className="p-6 border-b bg-white">
                <h2 className="text-2xl font-bold text-bdgreen-900">{t(lang, 'reminders')}</h2>
                <p className="text-bdgreen-600 text-sm">{t(lang, 'askToSetReminder')}</p>
             </div>
             <div className="flex-1 overflow-y-auto">
                <ReminderList 
                  reminders={reminders}
                  onToggle={handleReminderToggle}
                  onDelete={handleReminderDelete}
                  onSnooze={handleReminderSnooze}
                  language={lang}
                />
             </div>
          </div>

          {/* Health Vault View (New) */}
          <div className={`absolute inset-0 flex flex-col bg-gray-50 transition-opacity duration-300 ${currentView === ViewState.VAULT ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             <HealthVault 
                records={records}
                consent={consent}
                auditLogs={auditLogs}
                onImport={handleImportSimulation}
                onUpdateConsent={handleUpdateConsent}
                onExport={handleExport}
                language={lang}
             />
          </div>

        </div>
      </div>

      {showSettings && (
        <SettingsModal 
          profile={profile}
          onSave={handleProfileSave}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default App;