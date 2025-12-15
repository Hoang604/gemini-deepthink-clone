export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface ModelConfig {
  model: string;
  temperature: number;
  thinkingBudget: number; // 0 means disabled
  enableThinking: boolean;
}

export enum GeminiModel {
  PRO_3_PREVIEW = 'gemini-3-pro-preview',
  FLASH_2_5 = 'gemini-2.5-flash',
}

export const MAX_THINKING_BUDGET = 32768;
export const MIN_THINKING_BUDGET = 1024;
export const DEFAULT_THINKING_BUDGET = 4096;
