export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isError?: boolean;
  sources?: {
    title: string;
    uri: string;
  }[];
  attachment?: {
    type: 'image' | 'file';
    mimeType: string;
    data: string; // base64
    name?: string;
  };
}

export interface Reminder {
  id: string;
  title: string;
  time: string; // ISO string or simple time string like "08:00"
  type: 'medication' | 'diet' | 'appointment' | 'general';
  completed: boolean;
  snoozed?: boolean;
}

export interface UserProfile {
  name: string;
  age: string;
  language: string;
  conditions: string;
  dietaryRestrictions: string;
  medicationName?: string;
  dosage?: string;
  frequency?: string;
  medicationInstructions?: string;
  location: {
    lat: number | null;
    lng: number | null;
    city?: string;
  };
}

export interface HealthRecord {
  id: string;
  category: 'condition' | 'medication' | 'lab' | 'immunization';
  title: string;
  date: string;
  value?: string; // For labs (e.g., "120/80 mmHg")
  source: string; // e.g., "User Input", "General Hospital", "Apple Health"
  isVerified: boolean;
}

export interface ConsentSettings {
  shareDemographics: boolean;
  shareMedications: boolean;
  shareConditions: boolean;
  shareLabs: boolean;
  shareWithResearch: boolean;
  retentionPeriod: '7_days' | '30_days' | 'permanent';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'VIEW' | 'MODIFY' | 'IMPORT' | 'EXPORT' | 'ACCESS_DENIED';
  actor: 'User' | 'AI_Assistant' | 'External_Provider' | 'System';
  details: string;
}

export enum ViewState {
  CHAT = 'CHAT',
  PROFILE = 'PROFILE',
  REMINDERS = 'REMINDERS',
  VAULT = 'VAULT'
}