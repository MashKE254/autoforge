/**
 * SMART CLARIFICATION SYSTEM
 * 
 * File: src/lib/generation/clarification-system.ts
 * 
 * Before generating, this system:
 * 1. Analyzes the user's prompt
 * 2. Identifies what's missing or ambiguous
 * 3. Generates 3-5 targeted questions
 * 4. Enhances the prompt with answers
 * 
 * This is what makes AutoForge feel like working with a real developer.
 */

import Anthropic from '@anthropic-ai/sdk';


// ============================================================================
// TYPES
// ============================================================================

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'select' | 'multiselect' | 'text' | 'yesno';
  options?: string[];  // For select/multiselect
  placeholder?: string;  // For text input
  why?: string;  // Brief explanation of why we're asking
}

export interface ClarificationResult {
  needsClarification: boolean;
  questions: ClarificationQuestion[];
  detectedContext: {
    appType: string;
    industry?: string;
    complexity: 'simple' | 'medium' | 'complex';
    missingInfo: string[];
  };
}

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  clarifications: Record<string, string>;
}

// ============================================================================
// CLARIFICATION ANALYZER
// ============================================================================

const CLARIFICATION_SYSTEM_PROMPT = `You are a senior product manager helping gather requirements before building an application.

Analyze the user's prompt and determine:
1. What type of application they want
2. What critical information is MISSING
3. What would significantly improve the output if clarified

OUTPUT FORMAT (JSON only):
{
  "needsClarification": true/false,
  "appType": "dashboard|crm|ecommerce|saas|workflow|chatbot|inventory|booking|other",
  "industry": "detected industry or null",
  "complexity": "simple|medium|complex",
  "missingInfo": ["list of missing critical info"],
  "questions": [
    {
      "id": "unique_id",
      "question": "Clear, concise question",
      "type": "select|multiselect|text|yesno",
      "options": ["option1", "option2"] // only for select/multiselect
      "placeholder": "hint text", // only for text
      "why": "Brief reason this matters (optional)"
    }
  ]
}

RULES:
- Maximum 5 questions, minimum 0
- Only ask if information is TRULY missing or ambiguous
- Questions should be quick to answer (prefer select over text)
- Don't ask obvious things that can be assumed
- If the prompt is detailed enough, set needsClarification to false
- Focus on questions that will SIGNIFICANTLY improve the output

QUESTION PRIORITIES (ask these first if missing):
1. Industry/Use case - Changes entire design and features
2. User type - Solo, team, or multi-tenant?
3. Core workflow - What's the main thing they DO in the app?
4. Must-have features - Any dealbreakers?
5. Data/Integrations - What connects to what?

EXAMPLES OF GOOD QUESTIONS:
- "What industry is this for?" (select: real estate, saas, healthcare, ecommerce, other)
- "Who will use this?" (select: just me, small team <10, large organization)
- "What's the primary action users take?" (text with placeholder)
- "Do you need user authentication?" (yesno)

EXAMPLES OF BAD QUESTIONS:
- "What color scheme do you want?" (not critical, can be assumed)
- "What database should we use?" (too technical)
- "How many pages do you need?" (we can figure this out)

DON'T ASK if:
- Prompt already specifies the answer
- It's a simple/obvious app
- The detail won't significantly change the output`;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

export class ClarificationSystem {
  private client: Anthropic;
  
  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  
  /**
   * Analyze a prompt and determine if clarification is needed
   */
  async analyzePrompt(prompt: string): Promise<ClarificationResult> {
    // Quick check - if prompt is very detailed, skip clarification
    const wordCount = prompt.split(/\s+/).length;
    const hasSpecificFeatures = (prompt.match(/(\d+\.|[-•])\s+/g) || []).length >= 5;
    
    if (wordCount > 150 && hasSpecificFeatures) {
      return {
        needsClarification: false,
        questions: [],
        detectedContext: {
          appType: 'complex',
          complexity: 'complex',
          missingInfo: [],
        },
      };
    }
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 0.3,
        system: CLARIFICATION_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Analyze this prompt and determine if clarification questions are needed:\n\n"${prompt}"`
        }]
      });
      
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          needsClarification: parsed.needsClarification && parsed.questions?.length > 0,
          questions: (parsed.questions || []).slice(0, 5).map((q: ClarificationQuestion, i: number) => ({
            id: q.id || `q${i + 1}`,
            question: q.question,
            type: q.type || 'text',
            options: q.options,
            placeholder: q.placeholder,
            why: q.why,
          })),
          detectedContext: {
            appType: parsed.appType || 'other',
            industry: parsed.industry,
            complexity: parsed.complexity || 'medium',
            missingInfo: parsed.missingInfo || [],
          },
        };
      }
    } catch (error) {
      console.error('Clarification analysis failed:', error);
    }
    
    // Default: no clarification needed
    return {
      needsClarification: false,
      questions: [],
      detectedContext: {
        appType: 'other',
        complexity: 'medium',
        missingInfo: [],
      },
    };
  }
  
  /**
   * Enhance the original prompt with clarification answers
   */
  async enhancePrompt(
    originalPrompt: string,
    answers: Record<string, string>
  ): Promise<EnhancedPrompt> {
    // Build context from answers
    const clarificationContext = Object.entries(answers)
      .map(([question, answer]) => `- ${question}: ${answer}`)
      .join('\n');
    
    // Create enhanced prompt
    const enhanced = `${originalPrompt}

ADDITIONAL REQUIREMENTS (from clarification):
${clarificationContext}

Please incorporate all the above requirements into the application.`;
    
    return {
      original: originalPrompt,
      enhanced,
      clarifications: answers,
    };
  }
  
  /**
   * Generate smart follow-up questions based on initial answers
   * (for multi-turn clarification if needed)
   */
  async generateFollowUp(
    originalPrompt: string,
    previousAnswers: Record<string, string>
  ): Promise<ClarificationQuestion[]> {
    // For now, we don't do multi-turn - but this could be expanded
    return [];
  }
}

// Export singleton
export const clarificationSystem = new ClarificationSystem();

// ============================================================================
// PREDEFINED QUESTION TEMPLATES
// ============================================================================

export const COMMON_QUESTIONS: Record<string, ClarificationQuestion> = {
  industry: {
    id: 'industry',
    question: 'What industry or use case is this for?',
    type: 'select',
    options: [
      'SaaS / Software',
      'E-commerce / Retail',
      'Real Estate',
      'Healthcare',
      'Finance / Fintech',
      'Education',
      'Marketing / Agency',
      'Other',
    ],
    why: 'This determines terminology, features, and design patterns',
  },
  
  userType: {
    id: 'user_type',
    question: 'Who will be using this application?',
    type: 'select',
    options: [
      'Just me (personal tool)',
      'Small team (2-10 people)',
      'Company (10-100 people)',
      'Public users (customers)',
      'Multiple types of users',
    ],
    why: 'Affects authentication, permissions, and scale',
  },
  
  primaryAction: {
    id: 'primary_action',
    question: 'What\'s the #1 thing users will DO in this app?',
    type: 'text',
    placeholder: 'e.g., "Track leads and close deals" or "Manage inventory and orders"',
    why: 'Helps prioritize features and UI design',
  },
  
  authentication: {
    id: 'authentication',
    question: 'Do users need to log in?',
    type: 'select',
    options: [
      'No, it\'s open access',
      'Yes, simple login (email/password)',
      'Yes, with social login (Google, etc.)',
      'Yes, with team/organization features',
    ],
  },
  
  monetization: {
    id: 'monetization',
    question: 'Will you charge users for this?',
    type: 'select',
    options: [
      'No, it\'s free',
      'Yes, one-time payment',
      'Yes, subscription plans',
      'Yes, usage-based pricing',
      'Not sure yet',
    ],
  },
  
  integrations: {
    id: 'integrations',
    question: 'Any integrations needed?',
    type: 'multiselect',
    options: [
      'Email (send notifications)',
      'Calendar (scheduling)',
      'Payments (Stripe)',
      'File storage',
      'External APIs',
      'None needed',
    ],
  },
  
  mustHaveFeatures: {
    id: 'must_have',
    question: 'Any must-have features I should know about?',
    type: 'text',
    placeholder: 'e.g., "Real-time updates" or "Export to PDF" or "Mobile-friendly"',
  },
  
  existingTool: {
    id: 'existing_tool',
    question: 'Is this replacing an existing tool?',
    type: 'text',
    placeholder: 'e.g., "We currently use Notion" or "Replacing spreadsheets"',
    why: 'Helps understand expected features and migration needs',
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format questions for display in UI
 */
export function formatQuestionsForUI(questions: ClarificationQuestion[]): {
  hasQuestions: boolean;
  count: number;
  questions: ClarificationQuestion[];
} {
  return {
    hasQuestions: questions.length > 0,
    count: questions.length,
    questions,
  };
}

/**
 * Validate answers before enhancing prompt
 */
export function validateAnswers(
  questions: ClarificationQuestion[],
  answers: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const q of questions) {
    if (!answers[q.id] || answers[q.id].trim() === '') {
      missing.push(q.question);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}