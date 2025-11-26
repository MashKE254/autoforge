import {
  defineConfig
} from "../chunk-GGI7ZRFA.mjs";
import "../chunk-PFMI3Y4O.mjs";
import {
  init_esm
} from "../chunk-VWGL725N.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
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
      minTimeoutInMs: 1e3,
      maxTimeoutInMs: 1e4,
      factor: 2
    }
  },
  // Maximum duration for jobs (5 minutes)
  maxDuration: 300,
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
