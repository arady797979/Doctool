
export enum PersonaMode {
  EXPERT = 'Expert Mode',
  SUPPORT = 'Support Mode'
}

export interface NLPAnalysis {
  tone: string;
  sentimentScore: number; // -1 to 1
  clinicalKeywords: string[];
  lexicalMarkers: string[];
  transcriptionSummary?: string;
}

export interface EvidenceItem {
  treatment: string;
  successRate: string;
  citation: string;
}

export interface GrowthItem {
  type: string;
  title: string;
  link: string;
}

export interface ExpertResponse {
  differentialInsight: string;
  evidenceTable: EvidenceItem[];
  growthPath: GrowthItem[];
  nlpAnalysis?: NLPAnalysis;
}

export interface SupportResponse {
  message: string;
  exercise: string;
  crisisEscalation: boolean;
  appointmentSuggested: boolean;
  resourceLinks?: { title: string; url: string }[];
}

export interface Attachment {
  data: string;
  mimeType: string;
  name: string;
}

export interface SavedNote {
  id: string;
  timestamp: number;
  mode: PersonaMode;
  summary: string;
  tags: string[];
  content: ExpertResponse | SupportResponse;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | ExpertResponse | SupportResponse;
  mode: PersonaMode;
  timestamp: number;
  attachment?: Attachment;
}
