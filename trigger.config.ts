import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  // Your project ref from the Trigger.dev dashboard (e.g., "proj_abc123")
  // You will get this after you run `npx trigger.dev@latest login`
  project: "proj_mnfxitvmyngjnqkeypsx",

  // Maximum duration for jobs (in seconds)
  maxDuration: 300, // adjust as needed

  // This tells Trigger.dev where to find your job files
  dirs: ["./src/trigger"], 

  // This is the build extension from the docs. It's smart.
  // It ensures your Prisma client is generated during deployment.
  build: {
    extensions: [
      prismaExtension({
        schema: "prisma/schema.prisma",
        // This will automatically run `prisma migrate deploy` on Vercel
        migrate: true, 
      }),
    ],
  },
});
