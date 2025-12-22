
/**
 * PROMPT REGISTRY
 * All complex model instructions are managed here to keep service logic clean.
 */

export const GET_DIVERGENCE_PROMPT = (query: string) => `
  Analyze the User Query and generate between 3 and 10 distinct, mutually exclusive strategic approaches based on the complexity of the query. 
  For complex multi-step reasoning, provide more approaches (up to 10). 
  For simple factual queries, 3 is sufficient.
  
  Return valid JSON array only: [{"id": "h1", "title": "...", "description": "..."}]
  
  User Query: ${query}
`;

export const GET_VERIFICATION_PROMPT = (query: string, hypothesisDescription: string) => `
  Evaluate the feasibility and potential accuracy of this approach for the following query.
  
  Query: "${query}"
  Approach to Evaluate: "${hypothesisDescription}"
  
  Return JSON: {"confidence": 0.0-1.0, "reasoning": "A concise explanation of why this approach works or fails."}
`;

export const GET_SYNTHESIS_PROMPT = (query: string, winner: { title: string; description: string; reasoning: string }) => `
  Create a step-by-step execution plan for the final response based on the winning strategy.
  
  Strategy Selected: "${winner.title}"
  Context: "${winner.description}"
  Selected Strategy Insights: "${winner.reasoning}"
  
  User Original Query: "${query}"
  
  Define the structural blueprint, objective, and specific tone to maintain.
  Return valid JSON only: {"plan": ["step 1", "step 2", ...], "tone": "...", "objective": "..."}
`;

export const GET_FINAL_GENERATION_PROMPT = (query: string, winnerTitle: string, winnerDesc: string, synth: { plan: string[]; tone: string; objective: string }) => `
  ADHERE TO THIS EXECUTION PLAN:
  Objective: ${synth.objective}
  Tone: ${synth.tone}
  Steps: ${synth.plan.join(' -> ')}
  
  Using Strategy: "${winnerTitle}"
  Strategy Context: "${winnerDesc}"
  
  Original Query: ${query}
`;
