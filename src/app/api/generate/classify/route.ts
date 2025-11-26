/**
 * Prompt Classification API
 * 
 * File: src/app/api/generate/classify/route.ts
 * 
 * Analyzes a prompt and returns what type of application will be generated.
 * Useful for showing users what to expect before they generate.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { classifyUserPrompt } from "@/lib/generation/unified-generator";

export async function POST(request: Request) {
  try {
    // 1. Check authentication (optional - could make this public)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 3. Classify the prompt
    const classification = classifyUserPrompt(prompt);

    // 4. Return classification with user-friendly descriptions
    const typeDescriptions: Record<string, string> = {
      'ui-application': '🎨 UI Application - A React/Next.js web application with interactive interface',
      'workflow-automation': '🔄 Workflow Automation - An event-driven automation system with triggers and actions',
      'ai-agent-network': '🤖 AI Agent Network - Multi-agent AI system that can reason and take actions',
      'hybrid-workflow-ui': '🔄🎨 Workflow + UI - Automation system with a dashboard interface',
      'hybrid-agent-ui': '🤖🎨 Agent + UI - AI agents with a chat/control interface',
    };

    const typeExamples: Record<string, string[]> = {
      'ui-application': [
        'Calculator with dark mode',
        'Todo list with categories',
        'Dashboard with charts',
      ],
      'workflow-automation': [
        'Send Slack message when form submitted',
        'Daily email report at 9 AM',
        'Sync data between services',
      ],
      'ai-agent-network': [
        'Research agent that finds and summarizes info',
        'Team of agents for content creation',
        'Autonomous customer support bot',
      ],
      'hybrid-workflow-ui': [
        'Automation dashboard with manual triggers',
        'Workflow builder with visual editor',
      ],
      'hybrid-agent-ui': [
        'Chat interface for AI research assistant',
        'Agent control panel with history',
      ],
    };

    return NextResponse.json({
      success: true,
      classification: {
        type: classification.primaryType,
        confidence: classification.confidence,
        confidencePercent: `${(classification.confidence * 100).toFixed(0)}%`,
        description: typeDescriptions[classification.primaryType],
        reasoning: classification.reasoning,
        features: classification.detectedFeatures,
        techStack: classification.suggestedTechStack,
        examples: typeExamples[classification.primaryType] || [],
      },
      // Suggestions based on features
      suggestions: getSuggestions(classification),
    });

  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json(
      { error: "Classification failed" },
      { status: 500 }
    );
  }
}

function getSuggestions(classification: ReturnType<typeof classifyUserPrompt>): string[] {
  const suggestions: string[] = [];
  
  const { primaryType, detectedFeatures, confidence } = classification;
  
  if (confidence < 0.7) {
    suggestions.push("💡 Your prompt is ambiguous. Consider being more specific about what you want.");
  }
  
  if (primaryType === 'ui-application' && detectedFeatures.hasIntegrations) {
    suggestions.push("🔌 You mentioned integrations - consider if you need a workflow automation instead.");
  }
  
  if (primaryType === 'workflow-automation' && !detectedFeatures.hasTriggers) {
    suggestions.push("⚡ Add trigger words like 'when', 'every day', or 'on new' for clearer workflows.");
  }
  
  if (primaryType === 'ai-agent-network' && !detectedFeatures.hasAutonomy) {
    suggestions.push("🤖 Specify autonomous behaviors like 'automatically research' or 'decide on its own'.");
  }
  
  if (detectedFeatures.hasIntegrations) {
    suggestions.push("🔗 Detected integrations - make sure to set up API keys after generation.");
  }
  
  return suggestions;
}