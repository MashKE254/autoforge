import {
  unifiedGenerator
} from "../../../chunk-WR7QFAAB.mjs";
import "../../../chunk-QBPNHOKU.mjs";
import {
  prisma
} from "../../../chunk-2ZV322QJ.mjs";
import {
  logger,
  task
} from "../../../chunk-AC4VMWMU.mjs";
import "../../../chunk-PFMI3Y4O.mjs";
import {
  __name,
  init_esm
} from "../../../chunk-VWGL725N.mjs";

// src/trigger/unified-generate.ts
init_esm();
var unifiedGenerationJob = task({
  id: "unified-generation-job",
  maxDuration: 600,
  // 10 minutes (agents/workflows need more time)
  run: /* @__PURE__ */ __name(async (payload) => {
    const { jobId, forceType } = payload;
    logger.info("🎯 Starting Unified Generation", { jobId, forceType });
    try {
      const job = await prisma.generationJob.findUnique({
        where: { id: jobId }
      });
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      logger.info("📝 Got job", {
        prompt: job.prompt.slice(0, 100),
        status: job.status
      });
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "RUNNING",
          generationStartedAt: /* @__PURE__ */ new Date()
        }
      });
      logger.info("🤖 Calling Unified Generator...");
      const result = await unifiedGenerator.generate(job.prompt, {
        jobId,
        forceType,
        callbacks: {
          onProgress: /* @__PURE__ */ __name((message) => {
            logger.info(`Progress: ${message}`);
          }, "onProgress"),
          onFileComplete: /* @__PURE__ */ __name((path) => {
            logger.info(`✅ Generated: ${path}`);
          }, "onFileComplete"),
          onError: /* @__PURE__ */ __name((error) => {
            logger.error(`❌ Error: ${error}`);
          }, "onError")
        }
      });
      if (!result.success) {
        throw new Error(result.error || "Generation failed");
      }
      logger.info("✅ Generation complete!", {
        type: result.classificationType,
        confidence: result.classification.confidence,
        filesCount: result.files.length,
        files: result.files.map((f) => f.path)
      });
      const planSteps = result.files.map((file, index) => ({
        id: `file-${index}`,
        title: file.path,
        description: `Generated ${file.path}`,
        status: "completed"
      }));
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          planJson: JSON.stringify(planSteps),
          // Update blueprint with final classification
          blueprint: JSON.stringify({
            classificationType: result.classificationType,
            classification: result.classification,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          })
        }
      });
      return {
        success: true,
        jobId,
        generationType: result.classificationType,
        classification: {
          type: result.classification.primaryType,
          confidence: result.classification.confidence,
          features: result.classification.detectedFeatures
        },
        filesGenerated: result.files.length,
        files: result.files.map((f) => f.path)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("❌ Generation failed", { error: errorMessage });
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorLog: errorMessage
        }
      });
      throw error;
    }
  }, "run")
});
var workflowGenerationJob = task({
  id: "workflow-generation-job",
  maxDuration: 600,
  run: /* @__PURE__ */ __name(async (payload) => {
    const { jobId } = payload;
    logger.info("🔄 Starting Workflow Generation", { jobId });
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId }
    });
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    const result = await unifiedGenerator.generateWorkflow(job.prompt, jobId, {
      onProgress: /* @__PURE__ */ __name((msg) => logger.info(msg), "onProgress"),
      onFileComplete: /* @__PURE__ */ __name((path) => logger.info(`✅ ${path}`), "onFileComplete"),
      onError: /* @__PURE__ */ __name((err) => logger.error(err), "onError")
    });
    if (!result.success) {
      throw new Error(result.error || "Workflow generation failed");
    }
    return {
      success: true,
      jobId,
      filesGenerated: result.files.length
    };
  }, "run")
});
var agentGenerationJob = task({
  id: "agent-generation-job",
  maxDuration: 600,
  run: /* @__PURE__ */ __name(async (payload) => {
    const { jobId } = payload;
    logger.info("🤖 Starting Agent Network Generation", { jobId });
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId }
    });
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    const result = await unifiedGenerator.generateAgentNetwork(job.prompt, jobId, {
      onProgress: /* @__PURE__ */ __name((msg) => logger.info(msg), "onProgress"),
      onFileComplete: /* @__PURE__ */ __name((path) => logger.info(`✅ ${path}`), "onFileComplete"),
      onError: /* @__PURE__ */ __name((err) => logger.error(err), "onError")
    });
    if (!result.success) {
      throw new Error(result.error || "Agent generation failed");
    }
    return {
      success: true,
      jobId,
      filesGenerated: result.files.length
    };
  }, "run")
});
export {
  agentGenerationJob,
  unifiedGenerationJob,
  workflowGenerationJob
};
//# sourceMappingURL=unified-generate.mjs.map
