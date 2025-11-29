import {
  BoltGenerator,
  prisma
} from "../../../chunk-2RFTIJZX.mjs";
import {
  logger,
  task
} from "../../../chunk-AC4VMWMU.mjs";
import "../../../chunk-PFMI3Y4O.mjs";
import {
  __name,
  init_esm
} from "../../../chunk-VWGL725N.mjs";

// src/trigger/bolt-generate.ts
init_esm();
var generator = new BoltGenerator();
var generateApplicationJob = task({
  id: "generate-application-job",
  maxDuration: 300,
  // 5 minutes
  run: /* @__PURE__ */ __name(async (payload) => {
    const { jobId } = payload;
    logger.info("🚀 Starting Bolt-style generation", { jobId });
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
      logger.info("🤖 Calling AI to generate complete application...");
      const result = await generator.generate(job.prompt, jobId, {
        onProgress: /* @__PURE__ */ __name((message) => {
          logger.info(`Progress: ${message}`);
        }, "onProgress"),
        onFileComplete: /* @__PURE__ */ __name((path) => {
          logger.info(`✅ Generated: ${path}`);
        }, "onFileComplete"),
        onError: /* @__PURE__ */ __name((error) => {
          logger.error(`❌ Error: ${error}`);
        }, "onError")
      });
      if (!result.success) {
        throw new Error(result.error || "Generation failed");
      }
      logger.info("✅ Generation complete!", {
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
          planJson: JSON.stringify(planSteps)
        }
      });
      return {
        success: true,
        jobId,
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
var codeGenerationJob = task({
  id: "code-generation-job",
  maxDuration: 300,
  run: /* @__PURE__ */ __name(async (payload) => {
    return generateApplicationJob.trigger(payload);
  }, "run")
});
export {
  codeGenerationJob,
  generateApplicationJob
};
//# sourceMappingURL=bolt-generate.mjs.map
