/**
 * Clarification API Route
 * 
 * File: src/app/api/generate/clarify/route.ts
 * 
 * This route analyzes a prompt and returns clarification questions if needed.
 * 
 * Flow:
 * 1. User submits prompt
 * 2. Frontend calls this route FIRST
 * 3. If questions needed → show questions UI
 * 4. If no questions → proceed to generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, isSimulationMode } from '@/lib/mock-anthropic';

// ============================================================================
// TYPES
// ============================================================================

interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'select' | 'multiselect' | 'text' | 'yesno';
  options?: string[];
  placeholder?: string;
  why?: string;
}

interface ClarificationResult {
  needsClarification: boolean;
  questions: ClarificationQuestion[];
  detectedContext: {
    appType: string;
    industry?: string;
    complexity: 'simple' | 'medium' | 'complex';
    missingInfo: string[];
  };
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const CLARIFICATION_SYSTEM_PROMPT = `You are a senior product manager helping gather requirements before building an application.

Analyze the user's prompt and determine:
1. What type of application they want
2. What critical information is MISSING
3. What would significantly improve the output if clarified

OUTPUT FORMAT (JSON only, no markdown, no code blocks):
{
  "needsClarification": true,
  "appType": "dashboard|crm|ecommerce|saas|workflow|chatbot|inventory|booking|trading|analytics|other",
  "industry": "detected industry or null",
  "complexity": "simple|medium|complex",
  "missingInfo": ["list of missing critical info"],
  "questions": [
    {
      "id": "unique_id",
      "question": "Clear, concise question",
      "type": "select",
      "options": ["option1", "option2", "option3"],
      "why": "Brief reason this matters"
    }
  ]
}

RULES:
- Maximum 5 questions, prefer 3-4
- Only ask if information is TRULY missing or ambiguous
- Questions should be quick to answer (prefer select over text)
- Don't ask obvious things that can be assumed
- If the prompt is already detailed (100+ words with specific features), set needsClarification to false
- Focus on questions that will SIGNIFICANTLY improve the output

QUESTION PRIORITIES (ask in this order if missing):
1. Industry/Use case - Changes entire design and features
2. User type - Solo, team, or multi-tenant?
3. Core workflow - What's the main thing they DO in the app?
4. Must-have features - Any dealbreakers?
5. Data/Integrations - What connects to what?

EXAMPLES OF GOOD QUESTIONS:
- "What industry is this for?" with options: ["SaaS/Tech", "Real Estate", "Healthcare", "Finance", "E-commerce", "Other"]
- "Who will use this?" with options: ["Just me", "Small team (2-10)", "Large organization", "Public customers"]
- "What's the primary workflow?" as text input
- "Do you need user authentication?" as yesno

DON'T ASK if:
- Prompt already specifies the answer
- It's a simple/obvious app (calculator, timer, etc.)
- The detail won't significantly change the output
- Prompt is very detailed (100+ words with bullet points)`;

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const { prompt } = await request.json();
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Valid prompt required' },
        { status: 400 }
      );
    }

    const trimmedPrompt = prompt.trim();
    console.log('🤔 Analyzing prompt for clarification:', trimmedPrompt.slice(0, 50) + '...');

    // 3. Quick checks - skip clarification for certain cases
    const wordCount = trimmedPrompt.split(/\s+/).length;
    const hasListItems = (trimmedPrompt.match(/(\d+\.|[-•])\s+/g) || []).length;
    
    // Skip clarification for very detailed prompts
    if (wordCount > 100 && hasListItems >= 3) {
      console.log('📝 Prompt is detailed enough, skipping clarification');
      return NextResponse.json({
        needsClarification: false,
        questions: [],
        detectedContext: {
          appType: 'complex',
          complexity: 'complex',
          missingInfo: [],
        },
      });
    }

    // Skip clarification for simple/obvious apps
    const simpleApps = ['calculator', 'timer', 'clock', 'counter', 'hello world', 'test'];
    if (simpleApps.some(app => trimmedPrompt.toLowerCase().includes(app))) {
      console.log('📝 Simple app detected, skipping clarification');
      return NextResponse.json({
        needsClarification: false,
        questions: [],
        detectedContext: {
          appType: 'simple',
          complexity: 'simple',
          missingInfo: [],
        },
      });
    }

    // 4. Call AI for analysis
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.3,
      system: CLARIFICATION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Analyze this prompt and determine if clarification questions are needed:\n\n"${trimmedPrompt}"`
      }]
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    // 5. Parse response
    let result: ClarificationResult;
    
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = text;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        const rawMatch = text.match(/\{[\s\S]*\}/);
        if (rawMatch) {
          jsonStr = rawMatch[0];
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      
      result = {
        needsClarification: parsed.needsClarification && parsed.questions?.length > 0,
        questions: (parsed.questions || []).slice(0, 5).map((q: unknown, i: number) => {
          const question = q as Partial<ClarificationQuestion>;
          return {
            id: question.id || `q${i + 1}`,
            question: question.question ?? '',
            type: question.type || 'select',
            options: question.options,
            placeholder: question.placeholder,
            why: question.why,
          };
        }),
        detectedContext: {
          appType: parsed.appType || 'other',
          industry: parsed.industry || null,
          complexity: parsed.complexity || 'medium',
          missingInfo: parsed.missingInfo || [],
        },
      };
    } catch (parseError) {
      console.error('Failed to parse clarification response:', parseError);
      // Default to no clarification on parse error
      result = {
        needsClarification: false,
        questions: [],
        detectedContext: {
          appType: 'other',
          complexity: 'medium',
          missingInfo: [],
        },
      };
    }

    console.log(`✅ Clarification analysis complete: ${result.needsClarification ? result.questions.length + ' questions' : 'no questions needed'}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Clarification error:', error);
    
    // On error, default to no clarification (don't block generation)
    return NextResponse.json({
      needsClarification: false,
      questions: [],
      detectedContext: {
        appType: 'other',
        complexity: 'medium',
        missingInfo: [],
      },
    });
  }
}

// ============================================================================
// ENHANCE PROMPT WITH ANSWERS
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { originalPrompt, answers } = await request.json();
    
    if (!originalPrompt || !answers) {
      return NextResponse.json(
        { error: 'Original prompt and answers required' },
        { status: 400 }
      );
    }

    // Build enhanced prompt
    const clarificationContext = Object.entries(answers)
      .filter(([_, value]) => value && String(value).trim())
      .map(([question, answer]) => `- ${question}: ${answer}`)
      .join('\n');

    const enhancedPrompt = `${originalPrompt}

ADDITIONAL REQUIREMENTS (from clarification):
${clarificationContext}

Please incorporate all the above requirements into the application.`;

    console.log('✅ Enhanced prompt created');

    return NextResponse.json({
      originalPrompt,
      enhancedPrompt,
      answers,
    });

  } catch (error) {
    console.error('Enhance prompt error:', error);
    return NextResponse.json(
      { error: 'Failed to enhance prompt' },
      { status: 500 }
    );
  }
}