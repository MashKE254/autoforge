/**
 * Prompt Classification API
 *
 * File: src/app/api/generate/classify/route.ts
 *
 * Uses Claude AI to intelligently classify user prompts into:
 * - PERSONAL: Simple browser tools (calculator, timer)
 * - SINGLE_USER: Production-grade apps for one user (trading system)
 * - SAAS: Multi-tenant platforms to sell (CRM with billing)
 *
 * Also detects prompt quality and suggests enhancements for simple prompts.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/mock-anthropic';

// ============================================================================
// TYPES
// ============================================================================

export interface ClassificationResult {
  mode: 'PERSONAL' | 'SINGLE_USER' | 'SAAS';
  confidence: number; // 0-1 (0.95 = 95% confident)
  reasoning: string;
  promptQuality: 'EXCELLENT' | 'GOOD' | 'MINIMAL';
  suggestedEnhancements?: string[]; // 3-4 feature suggestions for simple prompts
  detectedFeatures: {
    needsBackend: boolean;
    needsDatabase: boolean;
    needsAuth: boolean;
    needsPayments: boolean;
    isMultiTenant: boolean;
  };
}

// ============================================================================
// CLASSIFICATION PROMPT
// ============================================================================

const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert software architect analyzing user prompts to classify application types.

Your task: Determine the GENERATION MODE and PROMPT QUALITY.

## GENERATION MODES:

1. **PERSONAL** - Simple browser tools
   - No backend needed (pure client-side)
   - localStorage for data
   - Examples: calculator, timer, todo list, color picker

2. **SINGLE_USER** - Production-grade app for ONE user
   - Needs backend/database (API integrations, real-time, complex logic)
   - For the user's own use (NOT to sell to others)
   - Examples: "my trading system", "CRM for my business", "dashboard for my data"

3. **SAAS** - Multi-tenant platform
   - Explicit monetization intent (sell, subscription, billing)
   - User registration/authentication needed
   - Multiple users/organizations
   - Examples: "CRM to sell to companies", "SaaS with billing", "multi-tenant app"

## PROMPT QUALITY:

- **EXCELLENT**: Detailed (20+ words), specific features listed
- **GOOD**: Clear intent (10-20 words), some details
- **MINIMAL**: Too simple (< 10 words), vague

## OUTPUT FORMAT (JSON):

{
  "mode": "SINGLE_USER",
  "confidence": 0.95,
  "reasoning": "Prompt mentions 'my accounts' and 'trading' which needs backend for API integrations but no multi-user intent.",
  "promptQuality": "EXCELLENT",
  "suggestedEnhancements": ["Add emergency stop button", "Include P&L tracking", "Support multiple brokers"],
  "detectedFeatures": {
    "needsBackend": true,
    "needsDatabase": true,
    "needsAuth": false,
    "needsPayments": false,
    "isMultiTenant": false
  }
}

## DECISION RULES:

**SAAS if:**
- Contains: "subscription", "billing", "monetize", "sell to", "user registration", "sign up page", "multi-tenant"
- Confidence: 0.95+ (very confident)

**SINGLE_USER if:**
- Contains: "api", "real-time", "database", "trading", "crm", "dashboard", "my account"
- AND no SAAS keywords
- Confidence: 0.85-0.95

**PERSONAL if:**
- Simple tool: "calculator", "timer", "converter", "todo"
- No backend indicators
- Confidence: 0.90+

## PROMPT ENHANCEMENT:

For MINIMAL quality prompts, suggest 3-4 specific features to add.

**Good suggestions:**
- Specific, actionable features
- Relevant to the app type
- Short (3-5 words each)

**Bad suggestions:**
- Vague ("make it better")
- Too many (>4)
- Generic ("add dark mode")

CRITICAL: Return ONLY valid JSON, no markdown, no explanation.`;

// ============================================================================
// CLASSIFICATION FUNCTION
// ============================================================================

async function classifyPrompt(prompt: string): Promise<ClassificationResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022', // Use Haiku for cost efficiency
    max_tokens: 1000,
    temperature: 0.3,
    system: CLASSIFICATION_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Classify this prompt:\n\n"${prompt}"\n\nReturn JSON only.`
    }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in classification response');
  }

  const result = JSON.parse(jsonMatch[0]) as ClassificationResult;

  // Validate and normalize
  if (!['PERSONAL', 'SINGLE_USER', 'SAAS'].includes(result.mode)) {
    result.mode = 'SINGLE_USER'; // Safe default
  }

  result.confidence = Math.max(0, Math.min(1, result.confidence));

  return result;
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (prompt.length < 3) {
      return NextResponse.json(
        { error: 'Prompt too short (minimum 3 characters)' },
        { status: 400 }
      );
    }

    const classification = await classifyPrompt(prompt);

    return NextResponse.json({
      success: true,
      classification,
    });

  } catch (error) {
    console.error('Classification error:', error);

    return NextResponse.json(
      {
        error: 'Classification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/generate/classify',
    method: 'POST',
    description: 'Classifies user prompts using AI',
    usage: {
      body: { prompt: 'string' },
      response: {
        mode: 'PERSONAL | SINGLE_USER | SAAS',
        confidence: 'number (0-1)',
        reasoning: 'string',
        promptQuality: 'EXCELLENT | GOOD | MINIMAL',
        suggestedEnhancements: 'string[]'
      }
    }
  });
}
