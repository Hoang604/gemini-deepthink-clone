/**
 * PROMPT REGISTRY: UNIFIED SYNTHESIS WORKFLOW
 */

export const GET_DIVERGENCE_PROMPT = (query: string, context?: string) => `
  Perform a multi-perspective analysis of the User Query.
  Generate between 3 and 10 distinct, mutually exclusive strategic approaches to resolve the query.
  Identify the specific core assumption that underpins each strategy.
  
  ${context ? `PREVIOUS CONTEXT: ${context}` : ''}
  CURRENT QUERY: ${query}
  
  Instructions:
  1. Ensure strategies are logically separate.
  2. If context exists, maintain continuity.
  3. Output must be a JSON array of objects.

  Output format (JSON only): 
  [{"id": "h1", "title": "...", "strategy": "Detailed approach description...", "assumption": "Required condition/context..."}]
`;

export const GET_ADVERSARIAL_CRITIQUE_PROMPT = (query: string, strategy: string, assumption: string) => `
  Conduct an adversarial evaluation of the provided strategy.
  Identify specific "Invalidity Triggers" (conditions where the strategy fails) and summarize its critical flaws.
  
  Query: "${query}"
  Strategy: "${strategy}"
  Assumption: "${assumption}"
  
  Instructions:
  1. Be pedantic and critical. 
  2. Focus on edge cases and potential misconceptions.
  
  Output format (JSON only):
  {"invalidity_triggers": ["trigger 1", "trigger 2"], "critical_flaws": "Concise summary of weaknesses"}
`;

export const GET_MASTER_SYNTHESIS_PROMPT = (query: string, data: any) => `
  Integrate the provided strategic paths and adversarial critiques into a single optimal execution blueprint.
  
  User Query: "${query}"
  Input Data (Strategies & Critiques): ${JSON.stringify(data)}
  
  Instructions:
  1. Do not select a single path; synthesize a new one that combines the most robust elements of all inputs.
  2. Explicitly architect safeguards to prevent the "Invalidity Triggers" identified in the critiques.
  3. Define a clear objective and tonal constraint.
  
  Output format (JSON only):
  {
    "blueprint": "Step-by-step synthesized execution plan...",
    "objective": "The definitive goal of the final response...",
    "tone": "Linguistic style/constraints (e.g., 'technical and dry', 'concise and punchy')...",
    "safeguards": ["List of preventative checks or exclusions..."]
  }
`;

export const GET_FINAL_GENERATION_PROMPT = (query: string, master: any) => `
  Follow the Master Blueprint to generate the final response to the User Query.
  
  Directive:
  Objective: ${master.objective}
  Tone: ${master.tone}
  Safeguards to Apply: ${master.safeguards.join(', ')}
  Execution Plan: ${master.blueprint}
  
  User Query: ${query}
  
  Constraints:
  - Deliver only the final response. 
  - Do not include meta-commentary about the blueprint or the process.
`;