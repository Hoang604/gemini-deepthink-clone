
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, ModelConfig, GeminiModel, Hypothesis, ThinkingProcess, ExecutionStep } from '../types';
import * as Prompts from './prompts';

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
export const orchestrateDeepThink = async (
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

    const divergenceResponse = await ai.models.generateContent({
      model: GeminiModel.FLASH_3_PREVIEW,
      contents: Prompts.GET_DIVERGENCE_PROMPT(currentMessage),
      config: { responseMimeType: 'application/json' }
    });

    let hypotheses: Hypothesis[] = [];
    try {
        hypotheses = JSON.parse(divergenceResponse.text || "[]");
    } catch (e) {
        hypotheses = [{ id: "default", title: "Standard Analysis", description: "Direct execution.", confidence: 0, reasoning: "" }];
    }
    
    updateTraceStep(divStepId, { status: 'complete', thoughts: `Generated ${hypotheses.length} strategic paths.`, result: hypotheses });
    updateState({ state: 'verifying', hypotheses });

    // PHASE 2: VERIFICATION
    const verifySingle = async (h: Hypothesis, stepId: string): Promise<Hypothesis> => {
      onUsage({ flash: 1, pro: 0 });
      const res = await ai.models.generateContent({
        model: GeminiModel.FLASH_3_PREVIEW,
        contents: Prompts.GET_VERIFICATION_PROMPT(currentMessage, h.description),
        config: { responseMimeType: 'application/json' }
      });
      
      let evalResult = { confidence: 0.5, reasoning: "Evaluation complete." };
      try { evalResult = JSON.parse(res.text || "{}"); } catch(e) {}
      
      updateTraceStep(stepId, { status: 'complete', thoughts: evalResult.reasoning, result: evalResult });
      return { ...h, confidence: evalResult.confidence, reasoning: evalResult.reasoning };
    };

    const hWithSteps = hypotheses.map(h => ({ ...h, stepId: generateId() }));
    hWithSteps.forEach(h => {
      addTraceStep({ id: h.stepId, phase: 'Verification', title: `Verifying: ${h.title}`, status: 'running' });
    });

    let verifiedHypotheses: Hypothesis[] = [];

    try {
      verifiedHypotheses = await Promise.all(hWithSteps.map(h => verifySingle(h, h.stepId)));
    } catch (error: any) {
      const errorStr = (error?.message || '').toLowerCase();
      const isRateLimit = error?.status === 429 || errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('too many');

      if (isRateLimit) {
        updateState({ logs: [...processState.logs, "Rate limit hit. Switching to Batch Recovery Mode (3 at a time)..."] });
        verifiedHypotheses = [];
        for (let i = 0; i < hWithSteps.length; i += 3) {
          const batch = hWithSteps.slice(i, i + 3);
          hWithSteps.slice(i + 3).forEach(h => updateTraceStep(h.stepId, { status: 'pending' }));
          const batchResults = await Promise.all(batch.map(h => {
            updateTraceStep(h.stepId, { status: 'running' });
            return verifySingle(h, h.stepId);
          }));
          verifiedHypotheses.push(...batchResults);
          updateState({ hypotheses: [...verifiedHypotheses] }); 
          if (i + 3 < hWithSteps.length) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      } else {
        throw error;
      }
    }

    // PHASE 3: SELECTION
    updateState({ state: 'selecting', hypotheses: verifiedHypotheses });
    const winner = verifiedHypotheses.reduce((prev, curr) => (prev.confidence > curr.confidence) ? prev : curr);

    const selStepId = generateId();
    addTraceStep({ id: selStepId, phase: 'Selection', title: 'Strategy Selection', status: 'complete', thoughts: `Best path identified: ${winner.title} (${Math.round(winner.confidence * 100)}% confidence)`, result: winner });
    
    // PHASE 4: SYNTHESIS BRIDGE
    updateState({ state: 'synthesizing', winnerId: winner.id });
    const synthStepId = generateId();
    addTraceStep({ id: synthStepId, phase: 'Synthesis', title: 'Response Blueprinting', status: 'running' });

    const isPro = config.model === GeminiModel.PRO_3_PREVIEW;
    onUsage({ flash: isPro ? 0 : 1, pro: isPro ? 1 : 0 });

    const synthesisResponse = await ai.models.generateContent({
      model: config.model,
      contents: Prompts.GET_SYNTHESIS_PROMPT(currentMessage, winner),
      config: { responseMimeType: 'application/json' }
    });

    let synthesisResult = { plan: ["Assemble final response based on selection"], tone: "helpful", objective: "Address user query accurately" };
    try { synthesisResult = JSON.parse(synthesisResponse.text || "{}"); } catch(e) {}

    updateTraceStep(synthStepId, { 
      status: 'complete', 
      thoughts: `Drafted plan with ${synthesisResult.plan?.length || 0} steps. Objective: ${synthesisResult.objective}`, 
      result: synthesisResult 
    });

    return { 
      prompt: Prompts.GET_FINAL_GENERATION_PROMPT(currentMessage, winner.title, winner.description, synthesisResult),
      finalState: processState 
    };

  } catch (e) {
    console.error("DeepThink Orchestration Error:", e);
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
  const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const chat: Chat = aiInstance.chats.create({
    model: config.model,
    history: history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    config: {
      temperature: config.temperature,
      thinkingConfig: { thinkingBudget: budget },
      maxOutputTokens: budget + 8192
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
