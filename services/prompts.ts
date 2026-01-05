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

# THE PROTOCOL (STRICT)
You are a World-Class Frontend Architect. You deliver modern, robust solutions.

**ARTIFACT GENERATION RULES:**
When you need to write substantial code, you MUST use the following Custom Delimiters.

1. **React/TypeScript Components (MANDATORY FOR ALL UI):**
   <<TSX title="Component.tsx">>
   // MUST BE SELF-CONTAINED REACT COMPONENTS.
   // Use Tailwind CSS for all styling (included by default).
   // Use 'lucide-react' for all icons.
   // Use 'framer-motion' for complex animations if needed.
   // ALWAYS export default the main component.
   // DO NOT USE vanilla HTML/JS/CSS for UI tasks.
   <<END>>

2. **Python Scripts (Backend logic only):**
   <<PYTHON title="script.py">>
   # Python code
   <<END>>

3. **General TypeScript (Non-UI/Utilities):**
   <<TS title="utils.ts">>
   // TS code
   <<END>>

4. **C/C++ Code (System level):**
   <<C title="main.cpp">>
   // C++ code
   <<END>>

**PROHIBITED ARTIFACTS:**
- DO NOT use <<HTML>> for web interfaces. Use <<TSX>> instead.
- DO NOT use <<JS>> for web logic. Use <<TSX>> or <<TS>>.
- DO NOT use <<CSS>>. Use Tailwind classes inside <<TSX>>.

# QUALITY STANDARDS
1. **Self-Contained:** Every <<TSX>> artifact must be a complete, runnable file.
2. **No Placeholders:** Write the full logic.
3. **Directness:** Ship the code immediately after brief context.
`;