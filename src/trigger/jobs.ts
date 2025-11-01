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
        Based on the following user prompt, generate a CONCISE, step-by-step technical plan for an AI to build the application.
        The plan should be an array of objects, where each object has an "id", "title", "description", and a "status" (set to "pending").
        Descriptions MUST be 1-2 sentences maximum.
        
        User Prompt: "${job.prompt}"
        
        Return ONLY a valid JSON array. Do not include any explanations, markdown formatting, or additional text.
        Example format:
        [
          {"id": "1", "title": "Setup", "description": "Initialize project.", "status": "pending"},
          {"id": "2", "title": "Backend", "description": "Create API.", "status": "pending"}
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

  // --- Route to OpenAI (GPT-4) for Backend/Logic/Schema ---
  if (
    stepTitle.includes("database") ||
    stepTitle.includes("schema") ||
    stepTitle.includes("backend") ||
    stepTitle.includes("api route")
  ) {
    logger.info(`Routing to OpenAI: ${step.title}`);
    const prompt = `
      You are a world-class backend engineer. Based on the user's original prompt and the complete technical plan, generate the code for the following step.
      
      Original Prompt: "${originalPrompt}"
      Full Plan: ${planString}
      Current Step: "${step.title}"
      Description: "${step.description}"
      
      Generate only the raw code for this step. Do not include any explanations, markdown, or pleasantries.
    `;
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo", // Use the best model for code
    });
    return completion.choices[0].message.content || "// OpenAI: No code generated";
  }
  
  // --- Route to Anthropic (Claude 3) for Frontend/UI ---
  if (
    stepTitle.includes("frontend") ||
    stepTitle.includes("ui") ||
    stepTitle.includes("react component") ||
    stepTitle.includes("tailwind")
  ) {
    logger.info(`Routing to Anthropic: ${step.title}`);
    const prompt = `
      You are a world-class frontend engineer specializing in React, Next.js, and Tailwind CSS. Based on the user's original prompt and the complete technical plan, generate the code for the following step.
      
      Original Prompt: "${originalPrompt}"
      Full Plan: ${planString}
      Current Step: "${step.title}"
      Description: "${step.description}"
      
      Generate only the raw code (TSX/CSS) for this step. Do not include any explanations, markdown, or pleasantries.
    `;
    
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", // Updated to latest Claude Sonnet 4
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });
    
    // Handle the content array properly
    const firstBlock = completion.content[0];
    if (firstBlock.type === "text") {
      return firstBlock.text;
    }
    return "<!-- Anthropic: No code generated -->";
  }

  // --- Default to Google (Gemini) for General Steps ---
  logger.info(`Routing to Google: ${step.title}`);
  const prompt = `
    You are a general-purpose AI engineer. Based on the user's original prompt and the complete technical plan, generate the code or configuration files for the following step.
    
    Original Prompt: "${originalPrompt}"
    Full Plan: ${planString}
    Current Step: "${step.title}"
    Description: "${step.description}"
    
    Generate only the raw code (e.g., package.json, .gitignore, etc.) for this step. Do not include any explanations, markdown, or pleasantries.
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });
  const result = await model.generateContent(prompt);
  return result.response.text() || "// Gemini: No code generated";
}