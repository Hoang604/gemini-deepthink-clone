import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, ModelConfig, GeminiModel } from '../types';

// Initialize the API client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const streamGeminiResponse = async (
  history: Message[],
  currentMessage: string,
  config: ModelConfig,
  onChunk: (text: string) => void
): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  // Map our internal history format to the API's expected format
  // Note: The @google/genai Chat helper manages history, but for a new session or restoring state
  // we might ideally reconstruct it. For simplicity in this clone, we'll start a fresh chat 
  // with history if needed, or just let the Chat object handle it if we persisted the object.
  // Since this is a stateless request function, we'll convert history to "Content" compatible structure if we were doing stateless.
  // However, `ai.chats.create` is the better pattern. We will convert previous messages to history.
  
  const historyForApi = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  const generationConfig: any = {
    temperature: config.temperature,
  };

  // Configure Thinking Budget if enabled and model supports it
  if (config.enableThinking && config.model === GeminiModel.PRO_3_PREVIEW) {
    generationConfig.thinkingConfig = {
      thinkingBudget: config.thinkingBudget
    };
    // If thinking is enabled, we must set maxOutputTokens to be larger than thinking budget
    // to allow for actual response. 
    // Heuristic: Budget + 8192 (or reasonable output length)
    generationConfig.maxOutputTokens = config.thinkingBudget + 8192;
  }

  const chat: Chat = ai.chats.create({
    model: config.model,
    history: historyForApi,
    config: generationConfig,
  });

  try {
    const resultStream = await chat.sendMessageStream({ message: currentMessage });
    
    let fullText = '';
    
    for await (const chunk of resultStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
        onChunk(c.text);
      }
    }

    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
