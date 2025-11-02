import { PrismaClient } from "@prisma/client";
import { task, logger } from "@trigger.dev/sdk";
import { 
  GoogleGenerativeAI, 
  SchemaType,
  HarmCategory,
  HarmBlockThreshold 
} from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Initialize AI clients
// These keys MUST be in your .env file
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Define the plan structure
type PlanStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  code?: string;
};

// Helper function to retry Prisma operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying...`, {
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
}

/**
 * JOB 1: THE PLANNER
 * Takes a user prompt, calls Gemini, and generates the initial step-by-step plan.
 */
export const generateApplicationJob = task({
  id: "generate-application-job",
  run: async (payload: { jobId: string }) => {
    const { jobId } = payload;

    // Use a local, new PrismaClient for long-running jobs to avoid connection issues
    const prisma = new PrismaClient({
      log: ["error", "warn"],
    });

    try {
      // 1. Update job status to RUNNING
      logger.info("Updating job status to RUNNING", { jobId });
      await withRetry(() => 
        prisma.generationJob.update({
          where: { id: jobId },
          data: { status: "RUNNING" },
        })
      );

      // Get the job details (like the user's prompt)
      logger.info("Fetching job details", { jobId });
      const job = await withRetry(() =>
        prisma.generationJob.findUnique({
          where: { id: jobId },
        })
      );

      if (!job) {
        throw new Error(`Job not found with ID: ${jobId}`);
      }

      // 2. Call the Google Gemini API to generate the plan
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-preview-09-2025",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                status: { type: SchemaType.STRING },
              },
              required: ["id", "title", "description", "status"],
            },
          },
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      // This is a stricter prompt to prevent the "Unterminated JSON" error
      const prompt = `
        You are an expert full-stack architect creating a PRODUCTION-READY Next.js 14 application.
        
        CRITICAL REQUIREMENTS:
        1. Generate a COMPLETE, working Next.js 14 app with App Router
        2. Use React Server Components and Client Components appropriately
        3. Use Tailwind CSS for ALL styling (no vanilla CSS files)
        4. Create a beautiful, modern, professional UI (like Vercel, Linear, or Stripe)
        5. Include proper TypeScript types throughout
        6. Make it IMMEDIATELY previewable in an iframe (single-page or multi-route)
        7. Include responsive design (mobile, tablet, desktop)
        8. Add smooth animations and transitions
        9. Follow Next.js 14 best practices
        
        MUST GENERATE AT MINIMUM:
        - Main App component (client component with "use client")
        - Complete, working UI with all features
        - Proper state management (useState, useEffect)
        - Beautiful, professional design
        - All functionality working without backend (use local state)
        
        DO NOT generate:
        - Separate HTML/CSS/JS files (this is React/Next.js)
        - Vanilla JavaScript files
        - Multiple disconnected files
        - Configuration-only files without UI
        
        User Prompt: "${job.prompt}"
        
        Generate a CONCISE, step-by-step plan (5-8 steps MAX) where:
        - Step 1: "Create Main App Component" - The core UI/UX
        - Step 2-4: Additional features/components
        - Step 5-8: Enhancements, styling, polish
        
        Each step MUST result in actual React/TypeScript code, not config files.
        
        Return ONLY valid JSON array format:
        [
          {"id": "1", "title": "Create Main App Component", "description": "Build the core UI with all primary features.", "status": "pending"},
          {"id": "2", "title": "Add Feature X", "description": "Implement X functionality.", "status": "pending"}
        ]
      `;

      logger.info("Calling Gemini API to generate plan", { jobId });
      const result = await model.generateContent(prompt);

      const response = result.response;
      
      // Check if the response was blocked
      if (!response.candidates || response.candidates.length === 0) {
        logger.error("Gemini API blocked the response", { 
          jobId, 
          promptFeedback: response.promptFeedback 
        });
        throw new Error("AI safety filters blocked the response. Please try a different prompt.");
      }
      
      let text = response.text();
      
      // 3. Clean and validate the AI's response
      // Remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let plan: PlanStep[];
      try {
        plan = JSON.parse(text);
        if (!Array.isArray(plan) || plan.length === 0) {
           throw new Error("AI returned an empty or invalid plan.");
        }
        // Validate each step has required fields
        for (const step of plan) {
          if (!step.id || !step.title || !step.description || !step.status) {
            throw new Error("Plan step missing required fields.");
          }
        }
      } catch (parseError) {
        logger.error("AI returned invalid JSON", { jobId, text, error: parseError });
        throw new Error("AI returned invalid JSON. See job logs for details.");
      }
      
      const planString = JSON.stringify(plan);

      // 4. Update job with the plan and set status to COMPLETED
      logger.info("Job plan generated, updating status to COMPLETED", { jobId });
      await withRetry(() =>
        prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            planJson: planString, // Store the generated plan
          },
        })
      );

      return { success: true, jobId, plan: planString };

    } catch (error: unknown) {
      // 4. Handle any errors
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
        logger.error("Job failed with error", { 
          jobId, 
          error: errorMessage,
          stack: error.stack 
        });
      } else {
        logger.error("Job failed with unknown error type", { jobId, error         });
      }

      await withRetry(() =>
        prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            result: errorMessage,
          },
        })
      );
      
      throw error;
    } finally {
      // 5. Always disconnect the Prisma client to prevent connection leaks
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        logger.error("Error disconnecting Prisma", { jobId, error: disconnectError });
      }
    }
  },
});

/**
 * JOB 2: THE BUILDER
 * Takes a job ID, loops through the plan, and generates code for each step.
 */
export const codeGenerationJob = task({
  id: "code-generation-job",
  run: async (payload: { jobId: string }) => {
    const { jobId } = payload;
    const prisma = new PrismaClient({
      log: ["error", "warn"],
    });

    try {
      // 1. Get the job and its plan
      const job = await prisma.generationJob.findUnique({
        where: { id: jobId },
      });

      if (!job || !job.planJson) {
        throw new Error(`Job or plan not found for ID: ${jobId}`);
      }

      const plan: PlanStep[] = JSON.parse(job.planJson);

      // 2. Loop through each step of the plan
      for (let i = 0; i < plan.length; i++) {
        const step = plan[i];

        // 3. Update step status to RUNNING and save
        plan[i].status = "running";
        logger.info(`Starting step ${i + 1}/${plan.length}: ${step.title}`, { jobId });
        await withRetry(() =>
          prisma.generationJob.update({
            where: { id: jobId },
            data: { planJson: JSON.stringify(plan) },
          })
        );

        // 4. Call the AI Router to generate code for the step
        const generatedCode = await aiRouter(step, job.prompt, plan);

        // 5. Update step with generated code and set status to COMPLETED
        plan[i].status = "completed";
        plan[i].code = generatedCode; // Store the generated code
        logger.info(`Completed step ${i + 1}/${plan.length}: ${step.title}`, { jobId });
        await withRetry(() =>
          prisma.generationJob.update({
            where: { id: jobId },
            data: { planJson: JSON.stringify(plan) },
          })
        );
      }

      // 6. Mark the entire job as finished
      logger.info("All code generation steps completed successfully", { jobId });
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          result: "Code generation successful. Ready for review.",
        },
      });

      return { success: true, jobId };

    } catch (error: unknown) {
      let errorMessage = "An unknown error occurred during code generation";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      logger.error("Code generation job failed", { jobId, error: errorMessage });

      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          result: errorMessage,
        },
      });
      
      throw error;
    } finally {
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        logger.error("Error disconnecting Prisma", { jobId, error: disconnectError });
      }
    }
  },
});

/**
 * AI ROUTER
 * This function determines which AI model to use based on the task.
 */
async function aiRouter(
  step: PlanStep,
  originalPrompt: string,
  fullPlan: PlanStep[]
): Promise<string> {
  const stepTitle = step.title.toLowerCase();
  const planString = JSON.stringify(fullPlan, null, 2);

  // DEFAULT TO REACT/NEXT.JS COMPONENTS FOR EVERYTHING
  logger.info(`Routing to OpenAI: ${step.title}`);
  
  const prompt = `
    You are an expert Next.js 14 developer creating PRODUCTION-READY code.
    
    CRITICAL REQUIREMENTS:
    1. Generate COMPLETE, working React/TypeScript code
    2. Use Next.js 14 App Router conventions
    3. Use Tailwind CSS for ALL styling (no separate CSS files)
    4. Create beautiful, modern, professional UI
    5. Include proper TypeScript types
    6. Use "use client" directive for interactive components
    7. Make it work standalone (no external dependencies beyond React/Next.js basics)
    8. Add smooth animations and micro-interactions
    9. Make it responsive (mobile-first design)
    
    COMPONENT STRUCTURE:
    - Export default function ComponentName()
    - Include all imports at top
    - Use React hooks (useState, useEffect) as needed
    - Add proper error handling
    - Include loading states
    - Make it visually stunning
    
    DESIGN GUIDELINES:
    - Use modern color palettes (blues, purples, gradients)
    - Add shadows, rounded corners, and depth
    - Include hover effects and transitions
    - Make text readable with proper contrast
    - Add icons where appropriate (use Lucide React or Unicode)
    - Create clear visual hierarchy
    
    Original Prompt: "${originalPrompt}"
    Full Plan: ${planString}
    Current Step: "${step.title}"
    Description: "${step.description}"
    
    Generate ONLY the raw TypeScript/TSX code for this component.
    Do NOT include:
    - Markdown code blocks
    - Explanations or comments outside code
    - "Here's the code" or similar text
    - Multiple file suggestions
    
    Start directly with imports and code.
  `;
  
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4-turbo",
    temperature: 0.7,
  });
  
  return completion.choices[0].message.content || "// No code generated";
} 