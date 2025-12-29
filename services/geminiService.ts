import { GoogleGenAI, Chat } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Basic wrapper for Gemini content generation.
 * Returns the response object directly.
 */
export const generateContent = async (model: string, contents: any, isJson: boolean = false) => {
  return ai.models.generateContent({
    model,
    contents,
    config: isJson ? { responseMimeType: 'application/json' } : undefined
  });
};

/**
 * Basic wrapper for Gemini chat sessions.
 */
export const createChatSession = (model: string, history: any[], temperature: number): Chat => {
  return ai.chats.create({
    model,
    history,
    config: { temperature }
  });
};