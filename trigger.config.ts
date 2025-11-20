import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  // Your project ID from Trigger.dev dashboard
  project: "proj_mnfxitvmyngjnqkeypsx",
  
  // Where to find your trigger jobs
  dirs: ["./src/trigger"],
  
  // Runtime configuration
  runtime: "node",
  
  // Logging level (use "debug" for troubleshooting)
  logLevel: "debug",
  
  // Retry configuration
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  
  // Maximum duration for jobs (5 minutes)
  maxDuration: 300,
});