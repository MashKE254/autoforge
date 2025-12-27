#!/bin/bash

# Disable Simulation Mode for AutoForge
# Switch back to real Anthropic API calls

echo "🔴 Disabling Simulation Mode..."
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    if grep -q "SIMULATE_ANTHROPIC" .env.local; then
        echo "✏️  Setting SIMULATE_ANTHROPIC=false"
        sed -i 's/SIMULATE_ANTHROPIC=true/SIMULATE_ANTHROPIC=false/' .env.local
        echo ""
        echo "✅ Simulation mode disabled!"
        echo ""
        echo "Next steps:"
        echo "1. Restart your dev server: npm run dev"
        echo "2. Make sure ANTHROPIC_API_KEY is set in .env.local"
        echo "3. Real API calls will now be made (costs apply)"
    else
        echo "ℹ️  SIMULATE_ANTHROPIC not found in .env.local"
        echo "Simulation mode was not enabled"
    fi
else
    echo "❌ .env.local file not found"
    echo "Simulation mode was not enabled"
fi

echo ""
