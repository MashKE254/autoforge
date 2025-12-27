#!/usr/bin/env node

/**
 * Apply simulation mode support to all generator files
 * This script updates Anthropic client instantiation across the codebase
 */

const fs = require('fs');
const path = require('path');

const files = [
  { path: 'src/lib/generation/admin-panel-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/agent-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/api-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/bot-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/clarification-system.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/context-aware-admin-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/dynamic-module-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/infrastructure-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/orchestrated-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/saas-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/saas-upgrade-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/lib/generation/workflow-generator.ts', importPath: '../mock-anthropic' },
  { path: 'src/app/api/recommend/route.ts', importPath: '@/lib/mock-anthropic' },
  { path: 'src/app/api/generate/clarify/route.ts', importPath: '@/lib/mock-anthropic' },
  { path: 'src/app/api/generate/stream/route.ts', importPath: '@/lib/mock-anthropic' },
  { path: 'src/app/api/proxy/ai/route.ts', importPath: '@/lib/mock-anthropic' },
];

console.log('🔧 Applying simulation mode support to all generator files...\n');

let updatedCount = 0;
let skippedCount = 0;

for (const file of files) {
  const filePath = path.join(process.cwd(), file.path);

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${file.path} (not found)`);
    skippedCount++;
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if already updated
  if (content.includes('getAnthropicClient')) {
    console.log(`✓  ${file.path} (already updated)`);
    skippedCount++;
    continue;
  }

  // Add import after the Anthropic import
  if (content.includes("import Anthropic from '@anthropic-ai/sdk';")) {
    content = content.replace(
      "import Anthropic from '@anthropic-ai/sdk';",
      `import Anthropic from '@anthropic-ai/sdk';\nimport { getAnthropicClient, isSimulationMode } from '${file.importPath}';`
    );
    modified = true;
  }

  // Replace new Anthropic instantiations
  // Pattern 1: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  content = content.replace(
    /new Anthropic\(\{\s*apiKey:\s*process\.env\.ANTHROPIC_API_KEY!\s*\}\)/g,
    'getAnthropicClient()'
  );

  // Pattern 2: new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY! })
  content = content.replace(
    /new Anthropic\(\{\s*apiKey:\s*apiKey\s*\|\|\s*process\.env\.ANTHROPIC_API_KEY!\s*\}\)/g,
    'getAnthropicClient(apiKey)'
  );

  // Pattern 3: new Anthropic({ apiKey: ... })
  content = content.replace(
    /new Anthropic\(\{[^}]+\}\)/g,
    'getAnthropicClient()'
  );

  if (modified || content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${file.path}`);
    updatedCount++;
  } else {
    console.log(`⏭️  ${file.path} (no changes needed)`);
    skippedCount++;
  }
}

console.log(`\n✨ Complete!`);
console.log(`   Updated: ${updatedCount} files`);
console.log(`   Skipped: ${skippedCount} files`);
console.log(`\n🎭 Simulation mode is now supported across all generators!`);
console.log(`\nNext step: Restart your dev server`);
