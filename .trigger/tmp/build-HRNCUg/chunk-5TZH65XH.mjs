import {
  AgentGenerator,
  SaaSGenerator,
  WorkflowGenerator
} from "./chunk-YHXRBZK6.mjs";
import {
  BoltGenerator,
  prisma
} from "./chunk-2RFTIJZX.mjs";
import {
  __name,
  init_esm
} from "./chunk-VWGL725N.mjs";

// src/lib/generation/unified-generator.ts
init_esm();

// src/lib/generation/prompt-classifier.ts
init_esm();
var WORKFLOW_KEYWORDS = [
  "workflow",
  "automation",
  "automate",
  "trigger",
  "when",
  "then",
  "schedule",
  "cron",
  "webhook",
  "event-driven",
  "pipeline",
  "if this then that",
  "ifttt",
  "zapier",
  "n8n",
  "make.com",
  "send email when",
  "notify when",
  "sync",
  "integrate",
  "on new",
  "when new",
  "every hour",
  "every day",
  "daily",
  "connect",
  "integration",
  "api connection",
  "data flow",
  "etl",
  "extract transform load",
  "batch process",
  "queue",
  "job queue",
  "background job",
  "async task"
];
var AGENT_KEYWORDS = [
  "agent",
  "ai agent",
  "autonomous",
  "crew",
  "team of ai",
  "multi-agent",
  "collaborative ai",
  "ai assistant",
  "langchain",
  "langgraph",
  "crewai",
  "autogpt",
  "autogen",
  "research agent",
  "writing agent",
  "coding agent",
  "tool use",
  "function calling",
  "reasoning",
  "plan and execute",
  "react agent",
  "chain of thought",
  "orchestrate ai",
  "ai orchestration",
  "swarm",
  "delegate tasks",
  "ai workers",
  "intelligent agents",
  "self-improving",
  "learning agent",
  "memory",
  "goal-oriented",
  "task decomposition"
];
var UI_KEYWORDS = [
  "app",
  "application",
  "website",
  "web app",
  "dashboard",
  "ui",
  "interface",
  "frontend",
  "page",
  "form",
  "button",
  "click",
  "display",
  "show",
  "view",
  "calculator",
  "todo",
  "list",
  "table",
  "chart",
  "login",
  "signup",
  "profile",
  "settings",
  "responsive",
  "mobile",
  "desktop"
];
var TRIGGER_PATTERNS = [
  /when\s+(.+)\s+(then|do|send|create|update|notify)/i,
  /every\s+(hour|day|week|month|minute)/i,
  /on\s+(new|updated|deleted|created)/i,
  /if\s+(.+)\s+then\s+(.+)/i,
  /schedule\s+(.+)\s+(to|for)/i,
  /automate\s+(.+)/i
];
var AGENT_PATTERNS = [
  /ai\s+(agent|assistant|worker)s?\s+(that|to|for|which)/i,
  /team\s+of\s+(ai|agents?|assistants?)/i,
  /(research|analyze|write|code)\s+.+\s+(automatically|autonomously)/i,
  /autonomous(ly)?\s+(research|analyze|write|code|create)/i,
  /multi-?agent/i,
  /agents?\s+(collaborate|work together|communicate)/i
];
function classifyPrompt(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const workflowScore = countMatches(lowerPrompt, WORKFLOW_KEYWORDS);
  const agentScore = countMatches(lowerPrompt, AGENT_KEYWORDS);
  const uiScore = countMatches(lowerPrompt, UI_KEYWORDS);
  const hasTriggerPatterns = TRIGGER_PATTERNS.some((p) => p.test(prompt));
  const hasAgentPatterns = AGENT_PATTERNS.some((p) => p.test(prompt));
  const adjustedWorkflowScore = workflowScore + (hasTriggerPatterns ? 3 : 0);
  const adjustedAgentScore = agentScore + (hasAgentPatterns ? 3 : 0);
  const detectedFeatures = {
    hasUI: uiScore > 0 || hasCommonUIWords(lowerPrompt),
    hasWorkflow: adjustedWorkflowScore > 1 || hasTriggerPatterns,
    hasAgents: adjustedAgentScore > 1 || hasAgentPatterns,
    hasTriggers: hasTriggerPatterns,
    hasIntegrations: hasIntegrationMentions(lowerPrompt),
    hasAutonomy: hasAutonomyIndicators(lowerPrompt)
  };
  const { primaryType, confidence, reasoning } = determineType(
    adjustedWorkflowScore,
    adjustedAgentScore,
    uiScore,
    detectedFeatures
  );
  const suggestedTechStack = getSuggestedTechStack(primaryType, detectedFeatures);
  return {
    primaryType,
    confidence,
    detectedFeatures,
    suggestedTechStack,
    reasoning
  };
}
__name(classifyPrompt, "classifyPrompt");
function countMatches(text, keywords) {
  return keywords.filter((kw) => text.includes(kw)).length;
}
__name(countMatches, "countMatches");
function hasCommonUIWords(text) {
  const commonUI = ["button", "form", "page", "display", "show", "click", "input"];
  return commonUI.some((w) => text.includes(w));
}
__name(hasCommonUIWords, "hasCommonUIWords");
function hasIntegrationMentions(text) {
  const integrations = [
    "slack",
    "discord",
    "email",
    "gmail",
    "outlook",
    "google sheets",
    "notion",
    "airtable",
    "stripe",
    "github",
    "gitlab",
    "jira",
    "trello",
    "asana",
    "twilio",
    "sendgrid",
    "mailchimp",
    "hubspot",
    "salesforce",
    "shopify",
    "woocommerce",
    "aws",
    "gcp",
    "azure",
    "s3",
    "dynamodb"
  ];
  return integrations.some((i) => text.includes(i));
}
__name(hasIntegrationMentions, "hasIntegrationMentions");
function hasAutonomyIndicators(text) {
  const autonomyWords = [
    "automatically",
    "autonomously",
    "on its own",
    "without human",
    "self-",
    "independent",
    "decides",
    "learns",
    "adapts",
    "improves"
  ];
  return autonomyWords.some((w) => text.includes(w));
}
__name(hasAutonomyIndicators, "hasAutonomyIndicators");
function determineType(workflowScore, agentScore, uiScore, features) {
  const totalScore = workflowScore + agentScore + uiScore;
  if (agentScore >= 3 && features.hasAutonomy) {
    if (features.hasUI && uiScore >= 2) {
      return {
        primaryType: "hybrid-agent-ui",
        confidence: 0.85,
        reasoning: `Detected AI agent requirements (score: ${agentScore}) with UI components (score: ${uiScore})`
      };
    }
    return {
      primaryType: "ai-agent-network",
      confidence: Math.min(0.95, 0.6 + agentScore * 0.1),
      reasoning: `Strong AI agent indicators (score: ${agentScore}) with autonomy features`
    };
  }
  if (workflowScore >= 3 || features.hasTriggers) {
    if (features.hasUI && uiScore >= 2) {
      return {
        primaryType: "hybrid-workflow-ui",
        confidence: 0.8,
        reasoning: `Detected workflow/automation (score: ${workflowScore}) with UI requirements (score: ${uiScore})`
      };
    }
    return {
      primaryType: "workflow-automation",
      confidence: Math.min(0.9, 0.5 + workflowScore * 0.1),
      reasoning: `Workflow patterns detected (score: ${workflowScore}), trigger patterns: ${features.hasTriggers}`
    };
  }
  if (agentScore >= 2) {
    if (features.hasUI) {
      return {
        primaryType: "hybrid-agent-ui",
        confidence: 0.7,
        reasoning: `AI agent mentions (score: ${agentScore}) combined with UI elements`
      };
    }
    return {
      primaryType: "ai-agent-network",
      confidence: 0.7,
      reasoning: `AI agent terminology detected (score: ${agentScore})`
    };
  }
  return {
    primaryType: "ui-application",
    confidence: totalScore === 0 ? 0.9 : Math.max(0.5, uiScore / Math.max(totalScore, 1)),
    reasoning: uiScore > 0 ? `UI application indicators (score: ${uiScore})` : "Default to UI application - no specific workflow or agent patterns detected"
  };
}
__name(determineType, "determineType");
function getSuggestedTechStack(type, features) {
  const baseStack = ["Next.js 14", "TypeScript", "Tailwind CSS"];
  switch (type) {
    case "workflow-automation":
      return [
        ...baseStack,
        "Inngest (workflow engine)",
        "Redis (state/queue)",
        "Prisma (database)",
        features.hasIntegrations ? "Integration SDKs" : ""
      ].filter(Boolean);
    case "ai-agent-network":
      return [
        ...baseStack,
        "LangChain.js",
        "AI SDK (Vercel)",
        "Vector DB (Pinecone/Chroma)",
        "OpenAI/Anthropic API"
      ];
    case "hybrid-workflow-ui":
      return [
        ...baseStack,
        "Inngest (background jobs)",
        "Prisma (database)",
        "React Query (data fetching)"
      ];
    case "hybrid-agent-ui":
      return [
        ...baseStack,
        "AI SDK (Vercel)",
        "LangChain.js",
        "Prisma (database)",
        "Server-Sent Events (streaming)"
      ];
    case "ui-application":
    default:
      return [
        ...baseStack,
        features.hasIntegrations ? "API Routes" : ""
      ].filter(Boolean);
  }
}
__name(getSuggestedTechStack, "getSuggestedTechStack");

// src/lib/generation/unified-generator.ts
var UnifiedGenerator = class {
  static {
    __name(this, "UnifiedGenerator");
  }
  constructor() {
    this.boltGenerator = new BoltGenerator();
    this.workflowGenerator = new WorkflowGenerator();
    this.agentGenerator = new AgentGenerator();
    this.saasGenerator = new SaaSGenerator();
  }
  /**
   * Main generation method - classifies and routes automatically
   */
  async generate(prompt, context = {}) {
    const { jobId, callbacks, forceType } = context;
    console.log("🎯 Unified Generator starting...");
    callbacks?.onProgress?.("🔍 Analyzing your request...");
    const classification = classifyPrompt(prompt);
    console.log(`   Classification: ${classification.primaryType}`);
    console.log(`   Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
    console.log(`   Reasoning: ${classification.reasoning}`);
    const isSaaSIntent = prompt.toLowerCase().includes("saas") || prompt.toLowerCase().includes("subscription") || prompt.toLowerCase().includes("stripe") || prompt.toLowerCase().includes("payment") || prompt.toLowerCase().includes("billing") || prompt.toLowerCase().includes("business") || prompt.toLowerCase().includes("monetize");
    let generationType = forceType || classification.primaryType;
    if (isSaaSIntent && !forceType) {
      console.log("   → Detected SaaS/Monetization intent. Overriding to SaaS Generator.");
      generationType = "saas-application";
    }
    if (jobId) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          // Store classification in blueprint field (JSON)
          blueprint: JSON.stringify({
            classification: generationType,
            confidence: classification.confidence,
            detectedFeatures: classification.detectedFeatures,
            suggestedTechStack: classification.suggestedTechStack,
            reasoning: classification.reasoning,
            isSaaS: isSaaSIntent
          })
        }
      });
    }
    let result;
    if (generationType === "saas-application") {
      callbacks?.onProgress?.("💸 Generating monetizable SaaS application...");
      console.log("   → Routing to SaaS Generator (Business Engine)");
      result = await this.saasGenerator.generate(prompt, jobId, callbacks);
    } else {
      switch (generationType) {
        case "workflow-automation":
        case "hybrid-workflow-ui":
          callbacks?.onProgress?.("🔄 Generating workflow automation system...");
          console.log("   → Routing to Workflow Generator");
          result = await this.workflowGenerator.generate(prompt, jobId, callbacks);
          break;
        case "ai-agent-network":
        case "hybrid-agent-ui":
          callbacks?.onProgress?.("🤖 Generating AI agent network...");
          console.log("   → Routing to Agent Generator");
          result = await this.agentGenerator.generate(prompt, jobId, callbacks);
          break;
        case "ui-application":
        default:
          callbacks?.onProgress?.("🎨 Generating UI application...");
          console.log("   → Routing to Bolt Generator (UI)");
          result = await this.boltGenerator.generate(prompt, jobId, callbacks);
          break;
      }
    }
    return {
      ...result,
      classificationType: generationType,
      classification
    };
  }
  /**
   * Generate with explicit type (skip classification)
   */
  async generateUI(prompt, jobId, callbacks) {
    return this.boltGenerator.generate(prompt, jobId, callbacks);
  }
  async generateWorkflow(prompt, jobId, callbacks) {
    return this.workflowGenerator.generate(prompt, jobId, callbacks);
  }
  async generateAgentNetwork(prompt, jobId, callbacks) {
    return this.agentGenerator.generate(prompt, jobId, callbacks);
  }
  async generateSaaS(prompt, jobId, callbacks) {
    return this.saasGenerator.generate(prompt, jobId, callbacks);
  }
  /**
   * Just classify without generating
   */
  classify(prompt) {
    return classifyPrompt(prompt);
  }
};
var unifiedGenerator = new UnifiedGenerator();

export {
  unifiedGenerator
};
//# sourceMappingURL=chunk-5TZH65XH.mjs.map
