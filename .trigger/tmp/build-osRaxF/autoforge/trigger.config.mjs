import {
  defineConfig
} from "../chunk-NDUHBKK4.mjs";
import "../chunk-PFMI3Y4O.mjs";
import {
  init_esm
} from "../chunk-VWGL725N.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  // Your project ref from the Trigger.dev dashboard (e.g., "proj_abc123")
  // You will get this after you run `npx trigger.dev@latest login`
  project: "proj_mnfxitvmyngjnqkeypsx",
  // Maximum duration for jobs (in seconds)
  maxDuration: 300,
  // adjust as needed
  // This tells Trigger.dev where to find your job files
  dirs: ["./src/trigger"],
  // This is the build extension from the docs. It's smart.
  // It ensures your Prisma client is generated during deployment.
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
