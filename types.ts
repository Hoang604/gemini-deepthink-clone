
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
  thinkingProcess?: ThinkingProcess;
}

export interface ThinkingProcess {
  state: 'idle' | 'hypothesizing' | 'verifying' | 'selecting' | 'synthesizing' | 'complete';
  logs: string[];
  trace: ExecutionStep[];
  hypotheses: Hypothesis[];
  winnerId?: string;
}

export interface ExecutionStep {
  id: string;
  phase: 'Divergence' | 'Verification' | 'Selection' | 'Synthesis';
  title: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  thoughts?: string;
  result?: any;
  durationMs?: number;
}

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  critique?: string;
  isWinner?: boolean;
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
  thinkingLevel: 'low' | 'medium' | 'high';
}

export interface ApiTrace {
  id: string;
  timestamp: number;
  model: string;
  durationMs: number;
}

export interface AppStats {
  flashCount: number;
  proCount: number;
  traces: ApiTrace[];
}

export enum GeminiModel {
  PRO_3_PREVIEW = 'gemini-3-pro-preview',
  FLASH_3_PREVIEW = 'gemini-3-flash-preview',
}
