#!/bin/bash

# Enable Simulation Mode for AutoForge
# This allows testing monetization without real API calls

echo "🎭 Enabling Simulation Mode..."
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "📝 Found existing .env.local file"
    
    # Check if SIMULATE_ANTHROPIC already exists
    if grep -q "SIMULATE_ANTHROPIC" .env.local; then
        echo "✏️  Updating SIMULATE_ANTHROPIC=true"
        sed -i 's/SIMULATE_ANTHROPIC=.*/SIMULATE_ANTHROPIC=true/' .env.local
    else
        echo "➕ Adding SIMULATE_ANTHROPIC=true"
        echo "" >> .env.local
        echo "# Simulation Mode - No real API calls" >> .env.local
        echo "SIMULATE_ANTHROPIC=true" >> .env.local
    fi
else
    echo "📝 Creating .env.local from template"
    cp .env.simulation .env.local
    echo "⚠️  IMPORTANT: Update your database URL, Stripe keys, and other secrets in .env.local"
fi

echo ""
echo "✅ Simulation mode enabled!"
echo ""
echo "Next steps:"
echo "1. Make sure all your env variables are set in .env.local"
echo "2. Restart your dev server: npm run dev"
echo "3. Look for 🎭 emoji in console logs to confirm simulation is active"
echo ""
echo "See SIMULATION_MODE.md for full documentation"
