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

export const GET_BALANCED_CRITIQUE_PROMPT = (query: string, strategy: string, assumption: string) => `
  Conduct a balanced evaluation of the provided strategy.
  
  Query: "${query}"
  Strategy: "${strategy}"
  Assumption: "${assumption}"
  
  Instructions:
  1. Identify key STRENGTHS (conditions where this strategy excels).
  2. Identify WEAKNESSES (invalidity triggers, edge cases).
  3. Be objective and thorough.
  
  Output format (JSON only):
  {
    "strengths": ["strength 1", "strength 2"],
    "validity_conditions": "When this strategy works best",
    "invalidity_triggers": ["trigger 1", "trigger 2"],
    "critical_flaws": "Concise summary of weaknesses"
  }
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
You are an executor. Your role is to produce, not to advise.

# CONTEXT
Objective: ${master.objective}
Tone: ${master.tone}
Safeguards: ${master.safeguards.join(', ')}
Blueprint: ${master.blueprint}

# USER REQUEST
"${query}"

# THE PRIME DIRECTIVE
Determine what artifact the user needs, then PRODUCE IT DIRECTLY.

- If they need something built → build it (output working code, complete document, etc.)
- If they need something explained → explain it clearly
- If they need something analyzed → provide the analysis

The key distinction: a user who asks "make me a website" wants HTML/CSS/JS code they can use immediately. They do not want advice about platforms, tools, or hiring developers.

# QUALITY STANDARDS
Whatever you produce must be:
1. Complete - fully functional, not a skeleton or placeholder
2. Polished - professional quality, not a rough draft
3. Immediate - usable right now without further work from the user

# OUTPUT
Begin directly with the artifact. No introduction, no meta-commentary.
`;