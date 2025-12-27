#!/bin/bash

# Batch update all Anthropic client instantiations to use mock client
# This enables simulation mode across the entire codebase

echo "🔧 Updating all files to support simulation mode..."

FILES=(
  "src/lib/generation/admin-panel-generator.ts"
  "src/lib/generation/agent-generator.ts"
  "src/lib/generation/api-generator.ts"
  "src/lib/generation/bot-generator.ts"
  "src/lib/generation/clarification-system.ts"
  "src/lib/generation/context-aware-admin-generator.ts"
  "src/lib/generation/dynamic-module-generator.ts"
  "src/lib/generation/infrastructure-generator.ts"
  "src/lib/generation/orchestrated-generator.ts"
  "src/lib/generation/saas-generator.ts"
  "src/lib/generation/saas-upgrade-generator.ts"
  "src/lib/generation/workflow-generator.ts"
  "src/app/api/recommend/route.ts"
  "src/app/api/generate/clarify/route.ts"
  "src/app/api/generate/stream/route.ts"
  "src/app/api/proxy/ai/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   Updating $file..."

    # Add import if not already present
    if ! grep -q "getAnthropicClient" "$file"; then
      # Find the line with "import Anthropic" and add our import after it
      sed -i "/import Anthropic from '@anthropic-ai\/sdk';/a import { getAnthropicClient, isSimulationMode } from '@/lib/mock-anthropic';" "$file" 2>/dev/null || \
      sed -i "/import Anthropic from '@anthropic-ai\/sdk';/a import { getAnthropicClient, isSimulationMode } from '../mock-anthropic';" "$file" 2>/dev/null || \
      sed -i "/import Anthropic from '@anthropic-ai\/sdk';/a import { getAnthropicClient, isSimulationMode } from '../../lib/mock-anthropic';" "$file"
    fi

    # Replace new Anthropic({ apiKey: ... }) with getAnthropicClient()
    sed -i 's/new Anthropic({[^}]*})/getAnthropicClient()/g' "$file"

    # Also handle the case with apiKey parameter
    sed -i 's/new Anthropic({\s*apiKey:\s*apiKey\s*||\s*process\.env\.ANTHROPIC_API_KEY!\s*})/getAnthropicClient(apiKey)/g' "$file"
  fi
done

echo "✅ All files updated!"
echo ""
echo "Files updated: ${#FILES[@]}"
echo ""
echo "Next: Restart your dev server to activate simulation mode"
