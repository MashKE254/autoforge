/**
 * Expanded Software Recommender API
 * 
 * File: src/app/api/recommend/route.ts
 * 
 * Now recommends across ALL AutoForge capabilities:
 * - UI Applications (dashboards, CRMs, tools)
 * - SaaS Products (subscription services, marketplaces)
 * - Workflow Automations (triggers, schedules, integrations)
 * - AI Assistants (chatbots, agents, document Q&A)
 * - API Backends (REST APIs, webhooks, integrations)
 * - Internal Tools (admin panels, inventory, booking)
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSession } from 'next-auth';

// ============================================================================
// TYPES
// ============================================================================

export type SolutionType = 
  | 'ui-app'           // Dashboards, forms, data apps
  | 'saas'             // Subscription products with billing
  | 'automation'       // Workflows, triggers, scheduled jobs
  | 'ai-assistant'     // Chatbots, agents, AI tools
  | 'api-backend'      // REST APIs, webhooks
  | 'internal-tool';   // Admin panels, operations tools

export interface SoftwareRecommendation {
  id: string;
  name: string;
  tagline: string;  // One-line value prop
  description: string;
  
  // Solution classification
  solutionType: SolutionType;
  category: string;  // Business category (sales, hr, marketing, etc.)
  
  // Build info
  complexity: 'simple' | 'moderate' | 'complex';
  buildTime: string;
  generator: 'bolt' | 'saas' | 'workflow' | 'agent' | 'api' | 'orchestrated';
  
  // The prompt to build it
  prompt: string;
  
  // ROI Analysis
  roi: {
    monetary: {
      timeSavedPerWeek: string;
      estimatedHourlyValue: number;
      monthlyValueMin: number;
      monthlyValueMax: number;
      revenueModel?: string;      // How they could monetize
      costSavings?: string;       // What it replaces
    };
    nonMonetary: {
      benefits: string[];
      impactAreas: string[];
      painPointsSolved: string[];
    };
    overallScore: number;
    quickWin: boolean;
  };
  
  // Context
  techHighlights: string[];  // Key tech features
  similarTools: string[];
  bestFor: string[];
  
  // For automations/AI
  triggers?: string[];        // What triggers the automation
  integrations?: string[];    // What it connects to
  aiCapabilities?: string[];  // What the AI can do
}

export interface RecommendationResponse {
  role: string;
  industry?: string;
  solutionPreference?: SolutionType;
  recommendations: SoftwareRecommendation[];
  byType: {
    [key in SolutionType]?: SoftwareRecommendation[];
  };
  topPick: SoftwareRecommendation;
  totalPotentialMonthlyValue: {
    min: number;
    max: number;
  };
}

// ============================================================================
// SYSTEM PROMPT - EXPANDED FOR ALL CAPABILITIES
// ============================================================================

const RECOMMENDER_SYSTEM_PROMPT = `You are an expert software consultant. You recommend custom software solutions across multiple categories.

AutoForge can build 6 types of solutions:

1. **UI APPS** (generator: "bolt")
   - Dashboards, analytics, data visualization
   - CRMs, contact managers, pipeline trackers
   - Forms, calculators, converters
   - Tables, lists, CRUD interfaces
   
2. **SAAS PRODUCTS** (generator: "saas")
   - Subscription services with Stripe billing
   - Multi-tenant platforms
   - Client portals with user management
   - Marketplaces and booking platforms
   
3. **WORKFLOW AUTOMATIONS** (generator: "workflow")
   - Event-driven: "When X happens, do Y"
   - Scheduled: "Every day at 9am, do Z"
   - Multi-step pipelines with error handling
   - Integrations between services
   
4. **AI ASSISTANTS** (generator: "agent")
   - Chatbots for customer support
   - Research agents that gather information
   - Document Q&A systems
   - AI-powered analysis tools
   
5. **API BACKENDS** (generator: "api")
   - REST APIs for mobile apps
   - Webhook receivers
   - Data sync services
   - Integration layers
   
6. **INTERNAL TOOLS** (generator: "orchestrated")
   - Admin dashboards
   - Inventory management
   - Booking/scheduling systems
   - Operations tools

For each recommendation, respond with JSON matching this structure:
{
  "role": "detected role",
  "industry": "detected industry",
  "recommendations": [
    {
      "id": "unique_id",
      "name": "Solution Name",
      "tagline": "One-line value prop",
      "description": "2-3 sentence description",
      "solutionType": "ui-app|saas|automation|ai-assistant|api-backend|internal-tool",
      "category": "business category",
      "complexity": "simple|moderate|complex",
      "buildTime": "X minutes",
      "generator": "bolt|saas|workflow|agent|api|orchestrated",
      "prompt": "Detailed generation prompt (3-5 sentences with specific features)",
      "roi": {
        "monetary": {
          "timeSavedPerWeek": "X-Y hours",
          "estimatedHourlyValue": number,
          "monthlyValueMin": number,
          "monthlyValueMax": number,
          "revenueModel": "optional - how to monetize",
          "costSavings": "optional - what it replaces"
        },
        "nonMonetary": {
          "benefits": ["benefit1", "benefit2", "benefit3"],
          "impactAreas": ["efficiency", "accuracy", etc],
          "painPointsSolved": ["pain1", "pain2", "pain3"]
        },
        "overallScore": 1-10,
        "quickWin": true/false
      },
      "techHighlights": ["feature1", "feature2"],
      "similarTools": ["Tool1", "Tool2"],
      "bestFor": ["use case 1", "use case 2"],
      "triggers": ["only for automations"],
      "integrations": ["only for automations/APIs"],
      "aiCapabilities": ["only for AI assistants"]
    }
  ],
  "byType": {
    "ui-app": [...],
    "automation": [...],
    etc
  },
  "topPick": {first recommendation},
  "totalPotentialMonthlyValue": {"min": sum, "max": sum}
}

CRITICAL RULES:
1. Recommend AT LEAST ONE from each relevant solution type
2. Include 6-8 total recommendations across different types
3. For automations, always specify triggers and integrations
4. For AI assistants, always specify aiCapabilities
5. Prompts must be detailed (3-5 sentences with specific features)
6. ROI must be realistic for the profession

HOURLY RATES BY PROFESSION:
- Entry-level/Admin: $25-40/hour
- Professional: $50-75/hour
- Senior/Specialized: $100-150/hour
- Executive/Consultant: $200-400/hour

Build times:
- Simple: 5-10 minutes
- Moderate: 15-25 minutes  
- Complex: 30-45 minutes`;

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { description, industry, solutionPreference } = body;
    
    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Please describe what you do' },
        { status: 400 }
      );
    }
    
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    
    // Build prompt with optional preferences
    let userPrompt = `Recommend software solutions for this professional:

WHAT THEY DO:
"${description}"
`;

    if (industry) {
      userPrompt += `\nINDUSTRY: ${industry}`;
    }
    
    if (solutionPreference) {
      userPrompt += `\nPREFERRED SOLUTION TYPE: ${solutionPreference} (but include other types too)`;
    }
    
    userPrompt += `

Generate 6-8 recommendations across different solution types:
- At least 1-2 UI apps (dashboards, tools)
- At least 1 automation (if they have repetitive tasks)
- At least 1 AI assistant (if they deal with information/questions)
- Consider SaaS if they could sell to others in their industry
- Consider API if they need to connect systems

Focus on:
1. Solving real daily pain points
2. Maximizing time savings
3. Things they could monetize or sell to peers
4. Replacing expensive subscriptions

Return valid JSON only.`;
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      temperature: 0.7,
      system: RECOMMENDER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    
    // Extract and parse response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No response from Claude');
    }
    
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
    if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
    if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
    
    const recommendations: RecommendationResponse = JSON.parse(jsonText.trim());
    
    // Add IDs and organize by type
    recommendations.recommendations = recommendations.recommendations.map((rec, idx) => ({
      ...rec,
      id: rec.id || `rec_${idx}_${Date.now()}`,
    }));
    
    // Organize by type if not already done
    if (!recommendations.byType || Object.keys(recommendations.byType).length === 0) {
      recommendations.byType = {};
      for (const rec of recommendations.recommendations) {
        const type = rec.solutionType;
        if (!recommendations.byType[type]) {
          recommendations.byType[type] = [];
        }
        recommendations.byType[type]!.push(rec);
      }
    }
    
    // Ensure topPick exists
    if (!recommendations.topPick && recommendations.recommendations.length > 0) {
      recommendations.topPick = recommendations.recommendations[0];
    }
    
    // Calculate totals if missing
    if (!recommendations.totalPotentialMonthlyValue) {
      const totals = recommendations.recommendations.reduce(
        (acc, rec) => ({
          min: acc.min + (rec.roi?.monetary?.monthlyValueMin || 0),
          max: acc.max + (rec.roi?.monetary?.monthlyValueMax || 0),
        }),
        { min: 0, max: 0 }
      );
      recommendations.totalPotentialMonthlyValue = totals;
    }
    
    console.log(`[Recommend] Generated ${recommendations.recommendations.length} recommendations in ${Date.now() - startTime}ms`);
    console.log(`[Recommend] Types: ${Object.keys(recommendations.byType).join(', ')}`);
    
    return NextResponse.json(recommendations);
    
  } catch (error) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET: Sample response for UI development
// ============================================================================

export async function GET() {
  const sampleResponse: RecommendationResponse = {
    role: "Real Estate Agent",
    industry: "Real Estate",
    recommendations: [
      // UI APP
      {
        id: "rec_ui_1",
        name: "Lead Tracker Dashboard",
        tagline: "Never lose another lead",
        description: "A visual pipeline tracker with kanban board, follow-up reminders, and commission projections. See all your deals at a glance.",
        solutionType: "ui-app",
        category: "sales",
        complexity: "moderate",
        buildTime: "15 minutes",
        generator: "bolt",
        prompt: "Build a real estate lead tracker with kanban pipeline (New Lead, Contacted, Showing, Offer, Closed Won, Closed Lost). Each card shows contact info, property interest, last contact date, and next action. Include a dashboard with monthly commission projections chart, conversion funnel, and activity feed. Add follow-up reminder badges and quick-action buttons for call/email/text. Dark mode, violet accents.",
        roi: {
          monetary: {
            timeSavedPerWeek: "6-8 hours",
            estimatedHourlyValue: 75,
            monthlyValueMin: 1800,
            monthlyValueMax: 2400,
            costSavings: "Replaces $200-400/mo CRM",
          },
          nonMonetary: {
            benefits: ["Visual pipeline clarity", "Never miss follow-ups", "Commission forecasting"],
            impactAreas: ["efficiency", "visibility", "revenue"],
            painPointsSolved: ["Lost leads", "Missed follow-ups", "No pipeline visibility"],
          },
          overallScore: 9,
          quickWin: false,
        },
        techHighlights: ["Drag-and-drop kanban", "Charts with Recharts", "Reminder system"],
        similarTools: ["Follow Up Boss", "Pipedrive", "Monday.com"],
        bestFor: ["Solo agents", "Small teams", "Visual thinkers"],
      },
      // AUTOMATION
      {
        id: "rec_auto_1",
        name: "Lead Follow-Up Automator",
        tagline: "Automatic follow-ups that feel personal",
        description: "Automatically send personalized follow-up sequences when leads go cold. Triggers after 3 days of no contact, sends email sequence, then alerts you if no response.",
        solutionType: "automation",
        category: "sales",
        complexity: "moderate",
        buildTime: "20 minutes",
        generator: "workflow",
        prompt: "Create a lead follow-up automation workflow with Inngest. Trigger when a lead hasn't been contacted in 3 days. Send a personalized email using their name and property interest. Wait 2 days, if no response send a different follow-up. After 5 days with no response, send SMS reminder to the agent. Track all touchpoints and update lead status. Include a dashboard showing automation activity and response rates.",
        roi: {
          monetary: {
            timeSavedPerWeek: "8-10 hours",
            estimatedHourlyValue: 75,
            monthlyValueMin: 2400,
            monthlyValueMax: 3000,
            revenueModel: "Recovers 2-3 deals/month from cold leads",
          },
          nonMonetary: {
            benefits: ["24/7 follow-up coverage", "Consistent messaging", "No leads slip through"],
            impactAreas: ["scalability", "consistency", "recovery"],
            painPointsSolved: ["Forgetting to follow up", "Inconsistent outreach", "Lost opportunities"],
          },
          overallScore: 9,
          quickWin: false,
        },
        techHighlights: ["Event-driven triggers", "Email sequences", "SMS integration"],
        similarTools: ["Mailchimp automations", "HubSpot sequences", "Follow Up Boss"],
        bestFor: ["Busy agents", "Teams", "High-volume lead sources"],
        triggers: ["Lead inactive for 3 days", "No response to showing", "Post-showing follow-up"],
        integrations: ["Email (Resend)", "SMS (Twilio)", "CRM webhook"],
      },
      // AI ASSISTANT
      {
        id: "rec_ai_1",
        name: "Property Q&A Assistant",
        tagline: "Answer client questions 24/7",
        description: "An AI chatbot trained on your listings that answers client questions about properties, schedules showings, and qualifies leads - even at 2am.",
        solutionType: "ai-assistant",
        category: "customer-service",
        complexity: "moderate",
        buildTime: "25 minutes",
        generator: "agent",
        prompt: "Build an AI property assistant chatbot for real estate. Upload listing details and it answers questions about properties (beds, baths, price, neighborhood, schools). Can schedule showing requests (collects name, email, phone, preferred times). Qualifies leads by asking budget, timeline, pre-approval status. Hands off to human agent for complex questions. Chat interface with message history, typing indicators. Include admin panel to view conversations and leads captured.",
        roi: {
          monetary: {
            timeSavedPerWeek: "10-15 hours",
            estimatedHourlyValue: 75,
            monthlyValueMin: 3000,
            monthlyValueMax: 4500,
            revenueModel: "Captures leads 24/7, converts night inquiries",
          },
          nonMonetary: {
            benefits: ["24/7 availability", "Instant responses", "Pre-qualified leads"],
            impactAreas: ["responsiveness", "qualification", "scalability"],
            painPointsSolved: ["Missing after-hours inquiries", "Repetitive questions", "Slow response time"],
          },
          overallScore: 8,
          quickWin: false,
        },
        techHighlights: ["LangGraph agent", "Document Q&A", "Lead capture forms"],
        similarTools: ["Structurely", "Ylopo AI", "Drift"],
        bestFor: ["High-volume agents", "Teams", "Luxury market"],
        aiCapabilities: ["Answer property questions", "Schedule showings", "Qualify leads", "Collect contact info"],
      },
      // SAAS PRODUCT
      {
        id: "rec_saas_1",
        name: "Agent CRM Platform",
        tagline: "Sell your system to other agents",
        description: "Turn your lead tracking system into a SaaS product other agents can subscribe to. Includes Stripe billing, user accounts, and a free trial.",
        solutionType: "saas",
        category: "sales",
        complexity: "complex",
        buildTime: "45 minutes",
        generator: "saas",
        prompt: "Build a SaaS CRM platform for real estate agents. Landing page with pricing (Free: 50 leads, Pro $49/mo: unlimited, Team $99/mo: 5 users). Stripe subscription billing with free trial. User authentication with email/Google. Dashboard with lead pipeline, contact management, showing scheduler. Team features: shared leads, activity feed, permissions. Settings page for profile, notifications, billing management. Include onboarding flow for new users.",
        roi: {
          monetary: {
            timeSavedPerWeek: "N/A - Revenue generator",
            estimatedHourlyValue: 0,
            monthlyValueMin: 2000,
            monthlyValueMax: 10000,
            revenueModel: "SaaS subscriptions: $49-99/user/month",
          },
          nonMonetary: {
            benefits: ["Passive income stream", "Help fellow agents", "Build authority"],
            impactAreas: ["revenue", "brand", "scalability"],
            painPointsSolved: ["Single income source", "Knowledge stuck in your head"],
          },
          overallScore: 7,
          quickWin: false,
        },
        techHighlights: ["Stripe subscriptions", "Multi-tenant", "User management"],
        similarTools: ["Follow Up Boss", "LionDesk", "Wise Agent"],
        bestFor: ["Entrepreneurial agents", "Team leads", "Trainers"],
      },
      // SIMPLE UI - QUICK WIN
      {
        id: "rec_ui_2",
        name: "Commission Calculator",
        tagline: "Know your take-home instantly",
        description: "Calculate net commission after splits, fees, and taxes. See exactly what you'll earn on any deal.",
        solutionType: "ui-app",
        category: "finance",
        complexity: "simple",
        buildTime: "8 minutes",
        generator: "bolt",
        prompt: "Build a real estate commission calculator. Input: sale price, commission %, broker split %, referral fee (optional), transaction fee. Calculate and display: gross commission, broker portion, your gross, referral deduction, transaction fees, estimated taxes (25%), net take-home. Show pie chart breakdown. Save calculations to history. Dark mode, clean design, large readable numbers.",
        roi: {
          monetary: {
            timeSavedPerWeek: "1-2 hours",
            estimatedHourlyValue: 75,
            monthlyValueMin: 300,
            monthlyValueMax: 600,
            costSavings: "No more spreadsheet fumbling",
          },
          nonMonetary: {
            benefits: ["Instant clarity on deals", "Confident negotiations", "Tax planning"],
            impactAreas: ["confidence", "accuracy", "planning"],
            painPointsSolved: ["Mental math errors", "Unclear net earnings", "Surprise deductions"],
          },
          overallScore: 7,
          quickWin: true,
        },
        techHighlights: ["Real-time calculation", "Pie chart", "History"],
        similarTools: ["Calculator apps", "Spreadsheets"],
        bestFor: ["All agents", "During negotiations", "Tax planning"],
      },
      // AUTOMATION - QUICK WIN
      {
        id: "rec_auto_2",
        name: "Weekly Market Report",
        tagline: "Impress clients with zero effort",
        description: "Every Monday at 8am, automatically generate a market report with recent sales and send it to your client list. Look like a market expert effortlessly.",
        solutionType: "automation",
        category: "marketing",
        complexity: "moderate",
        buildTime: "20 minutes",
        generator: "workflow",
        prompt: "Create an automated weekly market report workflow. Every Monday at 8am, fetch recent sales data (mock data for now), calculate average prices and days on market, generate a formatted HTML email with stats and charts, send to subscriber list. Include unsubscribe link. Dashboard shows send history, open rates, and subscriber count. Allow adding/removing subscribers.",
        roi: {
          monetary: {
            timeSavedPerWeek: "3-4 hours",
            estimatedHourlyValue: 75,
            monthlyValueMin: 900,
            monthlyValueMax: 1200,
            revenueModel: "Positions you as market expert, generates referrals",
          },
          nonMonetary: {
            benefits: ["Consistent client touchpoints", "Market authority", "Referral generation"],
            impactAreas: ["marketing", "authority", "retention"],
            painPointsSolved: ["Inconsistent outreach", "Time-consuming reports", "Staying top-of-mind"],
          },
          overallScore: 8,
          quickWin: false,
        },
        techHighlights: ["Scheduled trigger", "Email templates", "Analytics"],
        similarTools: ["Mailchimp", "Constant Contact", "Market Leader"],
        bestFor: ["Listing agents", "Area specialists", "Luxury market"],
        triggers: ["Every Monday 8am"],
        integrations: ["Email service", "Analytics tracking"],
      },
    ],
    byType: {},
    topPick: {} as SoftwareRecommendation,
    totalPotentialMonthlyValue: { min: 10400, max: 21700 },
  };
  
  // Organize by type
  sampleResponse.byType = {
    'ui-app': sampleResponse.recommendations.filter(r => r.solutionType === 'ui-app'),
    'automation': sampleResponse.recommendations.filter(r => r.solutionType === 'automation'),
    'ai-assistant': sampleResponse.recommendations.filter(r => r.solutionType === 'ai-assistant'),
    'saas': sampleResponse.recommendations.filter(r => r.solutionType === 'saas'),
  };
  
  sampleResponse.topPick = sampleResponse.recommendations[0];
  
  return NextResponse.json(sampleResponse);
}