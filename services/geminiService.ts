
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, ModelConfig, GeminiModel, Hypothesis, ThinkingProcess, ExecutionStep } from '../types';

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * Maps abstract thinking levels to token budgets for the SDK.
 */
const getThinkingBudget = (level: 'low' | 'medium' | 'high'): number => {
  switch (level) {
    case 'low': return 4096;
    case 'medium': return 16384;
    case 'high': return 32768;
    default: return 16384;
  }
};

/**
 * THE DEEPTHINK ORCHESTRATOR
 */
const orchestrateDeepThink = async (
  history: Message[],
  currentMessage: string,
  config: ModelConfig,
  onUpdate: (process: ThinkingProcess) => void,
  onUsage: (usage: { flash: number, pro: number }) => void
): Promise<{ prompt: string, finalState: ThinkingProcess }> => {
  let processState: ThinkingProcess = {
    state: 'hypothesizing',
    logs: [],
    trace: [],
    hypotheses: []
  };

  const updateState = (update: Partial<ThinkingProcess>) => {
    processState = { ...processState, ...update };
    onUpdate({ ...processState });
  };

  const addTraceStep = (step: ExecutionStep) => {
    processState = { 
      ...processState, 
      trace: [...processState.trace, step] 
    };
    onUpdate({ ...processState });
  };

  const updateTraceStep = (id: string, update: Partial<ExecutionStep>) => {
    processState = {
      ...processState,
      trace: processState.trace.map(t => t.id === id ? { ...t, ...update } : t)
    };
    onUpdate({ ...processState });
  };

  updateState({}); 

  try {
    // PHASE 1: DIVERGENCE (Using Gemini 3 Flash)
    const divStepId = generateId();
    addTraceStep({
      id: divStepId,
      phase: 'Divergence',
      title: 'Generating Strategic Approaches',
      status: 'running',
    });
    
    onUsage({ flash: 1, pro: 0 });

    const divergencePrompt = `
      Analyze the User Query and generate 3 distinct, mutually exclusive strategic approaches.
      Return valid JSON array only: [{"id": "h1", "title": "...", "description": "..."}]
      User Query: ${currentMessage}
    `;

    const divergenceResponse = await ai.models.generateContent({
      model: GeminiModel.FLASH_3_PREVIEW,
      contents: divergencePrompt,
      config: { responseMimeType: 'application/json' }
    });

    let hypotheses: Hypothesis[] = [];
    try {
        hypotheses = JSON.parse(divergenceResponse.text || "[]");
    } catch (e) {
        hypotheses = [{ id: "default", title: "Standard Analysis", description: "Direct execution.", confidence: 0, reasoning: "" }];
    }
    
    updateTraceStep(divStepId, { status: 'complete', thoughts: "Strategies generated.", result: hypotheses });
    updateState({ state: 'verifying', hypotheses });

    // PHASE 2: VERIFICATION (Parallel)
    const verificationPromises = hypotheses.map(async (h) => {
      const stepId = generateId();
      addTraceStep({ id: stepId, phase: 'Verification', title: `Verifying: ${h.title}`, status: 'running' });
      onUsage({ flash: 1, pro: 0 });

      const res = await ai.models.generateContent({
        model: GeminiModel.FLASH_3_PREVIEW,
        contents: `Evaluate this approach for: "${currentMessage}". Approach: "${h.description}". Return JSON: {"confidence": 0.0-1.0, "reasoning": "..."}`,
        config: { responseMimeType: 'application/json' }
      });
      
      let evalResult = { confidence: 0.5, reasoning: "Evaluation complete." };
      try { evalResult = JSON.parse(res.text || "{}"); } catch(e) {}
      
      updateTraceStep(stepId, { status: 'complete', thoughts: evalResult.reasoning, result: evalResult });
      return { ...h, confidence: evalResult.confidence, reasoning: evalResult.reasoning };
    });

    const verifiedHypotheses = await Promise.all(verificationPromises);

    // PHASE 3: SELECTION
    updateState({ state: 'selecting', hypotheses: verifiedHypotheses });
    const winner = verifiedHypotheses.reduce((prev, curr) => (prev.confidence > curr.confidence) ? prev : curr);

    const selStepId = generateId();
    addTraceStep({ id: selStepId, phase: 'Selection', title: 'Winner Selected', status: 'complete', thoughts: `Best path: ${winner.title}`, result: winner });
    updateState({ state: 'synthesizing', winnerId: winner.id });

    return { 
      prompt: `Based on strategy "${winner.title}" (${winner.description}), answer: ${currentMessage}`, 
      finalState: processState 
    };

  } catch (e) {
    return { prompt: currentMessage, finalState: processState };
  }
};

export const streamGeminiResponse = async (
  history: Message[],
  currentMessage: string,
  config: ModelConfig,
  onChunk: (text: string) => void,
  onThinkingUpdate?: (process: ThinkingProcess) => void,
  onUsageUpdate?: (increment: { flash: number, pro: number }) => void
): Promise<{ text: string; durationMs: number }> => {
  const startTime = Date.now();
  let finalPrompt = currentMessage;
  let orchestratorFinalState: ThinkingProcess | undefined;

  if (onThinkingUpdate) {
    const result = await orchestrateDeepThink(history, currentMessage, config, onThinkingUpdate, (u) => onUsageUpdate?.(u));
    finalPrompt = result.prompt;
    orchestratorFinalState = result.finalState;
  }

  onUsageUpdate?.({
    flash: config.model === GeminiModel.FLASH_3_PREVIEW ? 1 : 0,
    pro: config.model === GeminiModel.PRO_3_PREVIEW ? 1 : 0
  });

  const budget = getThinkingBudget(config.thinkingLevel);
  const chat: Chat = ai.chats.create({
    model: config.model,
    history: history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    config: {
      temperature: config.temperature,
      thinkingConfig: { thinkingBudget: budget },
      maxOutputTokens: budget + 4096 // Ensure room for response
    },
  });

  const resultStream = await chat.sendMessageStream({ message: finalPrompt });
  let fullText = '';
  for await (const chunk of resultStream) {
    const c = chunk as GenerateContentResponse;
    if (c.text) {
      fullText += c.text;
      onChunk(c.text);
    }
  }

  if (onThinkingUpdate && orchestratorFinalState) {
    onThinkingUpdate({ ...orchestratorFinalState, state: 'complete' });
  }

  return { text: fullText, durationMs: Date.now() - startTime };
};
