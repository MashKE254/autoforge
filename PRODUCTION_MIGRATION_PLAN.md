# AutoForge Production Migration Plan

## 🎯 Executive Summary

AutoForge currently has **comprehensive simulation systems** that allow development and testing without real API calls or infrastructure costs. This document outlines exactly what is simulated, what real infrastructure you need, and how to remove all simulation code to launch the complete production-ready platform.

**Current State:** Hybrid - Can run in either simulation or real mode
**Target State:** Full production with real AI generation, deployments, and infrastructure provisioning

---

## 📊 What Is Currently Being Simulated

### 1. **AI Code Generation** (`/src/lib/mock-anthropic.ts`)
- **Activation:** `SIMULATE_ANTHROPIC=true` environment variable
- **What It Does:**
  - Intercepts all Anthropic Claude API calls
  - Returns hardcoded simulated responses for different prompt types
  - Generates basic Next.js app structure (5 files)
  - Simulates streaming with 50ms delays
  - Fake token usage calculation

- **Used By:** 24 files including:
  - `/src/app/api/generate/route.ts` - Main generation endpoint
  - `/src/app/api/generate/stream/route.ts` - Streaming generation
  - `/src/app/api/generate/classify/route.ts` - Prompt classification
  - `/src/app/api/generate/clarify/route.ts` - Clarification system
  - `/src/app/api/recommend/route.ts` - Feature recommendations
  - All generator files (bolt, saas, workflow, agent, API generators)

- **Simulated Responses:**
  - Basic Next.js app with 5 files (package.json, page.tsx, layout.tsx, globals.css, tailwind.config.js)
  - JSON classification responses
  - Clarification questions
  - Agent reviews
  - Support responses
  - Feature recommendations

### 2. **Infrastructure Provisioning** (`/src/lib/infrastructure/`)
- **Activation:** `SIMULATE_INFRASTRUCTURE=true` environment variable
- **What It Simulates:**

#### a) **Database Provisioning** (Supabase)
- Fake Supabase project IDs: `sim_${timestamp}`
- Fake database URLs: `https://simulated-{jobId}.supabase.co`
- Fake API keys: `sim_anon_key_${timestamp}`, `sim_service_key_${timestamp}`

#### b) **Authentication** (Clerk)
- Fake Clerk instance IDs: `sim_clerk_${timestamp}`
- Fake publishable keys: `pk_test_simulated_${timestamp}`
- Fake secret keys: `sk_test_simulated_${timestamp}`

#### c) **Payments** (Stripe)
- Fake Stripe test keys: `pk_test_simulated_${timestamp}`
- Fake Stripe secret keys: `sk_test_simulated_${timestamp}`
- Fake webhook secrets: `whsec_simulated_${timestamp}`

#### d) **Deployment** (Vercel)
- Fake deployment IDs: `dpl_sim_${timestamp}`
- Fake project IDs: `prj_sim_${timestamp}`
- Fake URLs: `https://{name}-sim-{timestamp}.vercel.app`
- Simulates 500-1500ms deployment delays

### 3. **Third-Party Integrations** (`/src/lib/demo-mode/integrations-demo.ts`)
- **20+ Integration Mocks:**
  - **Social:** Twitter, LinkedIn, Instagram, Facebook
  - **Productivity:** Google Calendar, Gmail, Notion
  - **Communication:** Discord, Slack, Twilio, SendGrid
  - **E-commerce:** Shopify, Stripe
  - **Development:** GitHub, AWS S3, Vercel
  - **AI:** OpenAI, Anthropic, Replicate
  - **Maps:** Google Maps

- **Each Mock Includes:**
  - Artificial network delays (500-3000ms)
  - Realistic fake data (tweets, emails, payments, analytics)
  - Fake engagement metrics (likes, views, opens)

### 4. **Demo Data Generators** (`/src/lib/demo-mode/mock-data-generator.ts`)
- Generates realistic fake data for:
  - Social media posts (tweets, LinkedIn posts)
  - AI responses with fake token usage
  - Payments and transactions
  - Emails and calendar events
  - Analytics and chart data
  - User profiles and companies

---

## 🏗️ Real Infrastructure Required

To run AutoForge in full production mode, you need:

### 1. **AI Generation** ✅ CRITICAL
- **Anthropic Claude API**
  - API Key from https://console.anthropic.com
  - Recommended model: `claude-sonnet-3-5-20241022` or `claude-opus-4`
  - Expected cost: $3-$5 per app generation (complex apps)
  - Environment variable: `ANTHROPIC_API_KEY`

### 2. **Deployment Platform** ✅ CRITICAL
- **Vercel Account & API Token**
  - Vercel Team Account (required for deployments)
  - API Token from https://vercel.com/account/tokens
  - Team ID from team settings
  - Environment variables:
    - `VERCEL_TOKEN` - API access token
    - `VERCEL_TEAM_ID` - Your team ID

### 3. **Database** ✅ REQUIRED (Already Have)
- **PostgreSQL Database**
  - Currently using: Neon, Supabase, or similar
  - Environment variable: `DATABASE_URL`
  - ✅ **Status: Already configured**

### 4. **Authentication** ✅ REQUIRED (Already Have)
- **NextAuth.js**
  - Environment variables:
    - `NEXTAUTH_URL` - Your app URL
    - `NEXTAUTH_SECRET` - Random secret string
  - OAuth providers (Google, GitHub, etc.)
  - ✅ **Status: Already configured**

### 5. **Infrastructure Provisioning** (Optional - For "Go Live" Feature)

#### a) **Supabase** (Database Provisioning)
- **What It's For:** Provision PostgreSQL databases for generated apps
- **API Keys Needed:**
  - Supabase Access Token from https://app.supabase.com/account/tokens
  - Environment variable: `SUPABASE_ACCESS_TOKEN`
- **Cost:** $25/month per database (Pro plan)
- **Alternative:** Disable "Go Live" feature or use simulation mode for this only

#### b) **Clerk** (Auth Provisioning)
- **What It's For:** Provision authentication for generated apps
- **API Keys Needed:**
  - Clerk Secret Key from https://dashboard.clerk.com
  - Environment variable: `CLERK_SECRET_KEY`
- **Cost:** $25/month after 5,000 users
- **Alternative:** Disable "Go Live" feature or use simulation mode for this only

#### c) **Stripe Connect** (Payment Processing for Generated Apps)
- **What It's For:** Allow generated apps to accept payments
- **API Keys Needed:**
  - Stripe Secret Key
  - Stripe Connect platform setup
  - Environment variables:
    - `STRIPE_SECRET_KEY`
    - `STRIPE_WEBHOOK_SECRET`
    - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Cost:** Standard Stripe fees
- **Alternative:** Disable monetization feature

### 6. **Screenshot Generation** (Already Working)
- **Puppeteer** - For generating app thumbnails
- ✅ **Status: Already working with Puppeteer**

### 7. **Payment Processing** (For AutoForge Itself)
- **Stripe** - For subscriptions to AutoForge
  - Environment variables already configured
  - ✅ **Status: Ready for real payments**

---

## 🗑️ Files to Delete (Simulation Code)

### Core Simulation Files (DELETE THESE):
1. `/src/lib/mock-anthropic.ts` - Mock Anthropic client (278 lines)
2. `/src/lib/demo-mode/mock-data-generator.ts` - Fake data generator (279 lines)
3. `/src/lib/demo-mode/integrations-demo.ts` - Mock integrations (420+ lines)
4. `/src/lib/demo-mode/` - Entire demo mode directory
5. `.env.simulation` - Simulation environment template
6. `SIMULATION_MODE.md` - Simulation documentation
7. `apply-simulation-fix.js` - Simulation utility script
8. `update-simulation-files.sh` - Simulation update script

### Code Changes Required:

#### 1. Update All API Routes (6 files)
Remove mock-anthropic imports and use real Anthropic client:

**Files to Update:**
- `/src/app/api/generate/clarify/route.ts:19`
- `/src/app/api/generate/stream/route.ts:15`
- `/src/app/api/generate/classify/route.ts:16`
- `/src/app/api/proxy/ai/route.ts:31`
- `/src/app/api/recommend/route.ts:17`
- `/src/app/api/creations/[id]/update/route.ts:5`

**Change From:**
```typescript
import { getAnthropicClient, isSimulationMode } from '@/lib/mock-anthropic';
const anthropic = getAnthropicClient();
```

**Change To:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

#### 2. Update All Generator Files (18 files)
Same change as above for:
- `/src/lib/generation/bolt-generator.ts`
- `/src/lib/generation/saas-generator.ts`
- `/src/lib/generation/workflow-generator.ts`
- `/src/lib/generation/agent-generator.ts`
- `/src/lib/generation/api-generator.ts`
- `/src/lib/generation/orchestrated-generator.ts`
- `/src/lib/generation/personal-tool-generator.ts`
- `/src/lib/generation/saas-upgrade-generator.ts`
- `/src/lib/generation/dynamic-module-generator.ts`
- `/src/lib/generation/infrastructure-generator.ts`
- `/src/lib/generation/admin-panel-generator.ts`
- `/src/lib/generation/context-aware-admin-generator.ts`
- `/src/lib/generation/bot-generator.ts`
- `/src/lib/generation/clarification-system.ts`

#### 3. Remove Simulation Checks
In `/src/lib/infrastructure/provisioning-service.ts`:
- Remove lines 30-142: Entire simulation mode block
- Remove `simulationMode` property and checks

In all provider files:
- `/src/lib/infrastructure/providers/vercel.ts` - Remove lines 19-63 (simulation mode)
- `/src/lib/infrastructure/providers/clerk.ts` - Remove lines 12-44 (simulation)
- `/src/lib/infrastructure/providers/supabase.ts` - Remove simulation checks
- `/src/lib/infrastructure/providers/stripe.ts` - Remove lines 63-147 (simulation)

In `/src/lib/stripe/client.ts`:
- Remove lines 16-33 (simulation mode detection)

In `/src/lib/encryption.ts`:
- Remove simulation mode placeholders at lines 82, 123

---

## ✅ Step-by-Step Migration Plan

### Phase 1: Environment Setup (REQUIRED)
1. **Create `.env.local` file** with required API keys:
```bash
# ===================================================================
# PRODUCTION ENVIRONMENT - AutoForge
# ===================================================================

# Database (already configured)
DATABASE_URL="your_existing_database_url"

# NextAuth (already configured)
NEXTAUTH_URL="http://localhost:3000"  # or your production URL
NEXTAUTH_SECRET="your_existing_secret"

# ✅ REQUIRED: Anthropic Claude API
ANTHROPIC_API_KEY="sk-ant-api03-..." # Get from console.anthropic.com

# ✅ REQUIRED: Vercel Deployment
VERCEL_TOKEN="your_vercel_token" # Get from vercel.com/account/tokens
VERCEL_TEAM_ID="team_xxxxxxxxxxxx" # Get from team settings

# Stripe (for AutoForge subscriptions - already configured)
STRIPE_SECRET_KEY="sk_test_..." # or sk_live_
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." # or pk_live_

# OPTIONAL: Infrastructure Provisioning (for "Go Live" feature)
# Only needed if you want users to deploy with their own infrastructure
SUPABASE_ACCESS_TOKEN="sbp_..." # From app.supabase.com/account/tokens
CLERK_SECRET_KEY="sk_..." # From dashboard.clerk.com

# DO NOT SET THESE (removes simulation mode):
# SIMULATE_ANTHROPIC=false # or just don't set it
# SIMULATE_INFRASTRUCTURE=false # or just don't set it
```

2. **Verify API keys work:**
```bash
# Test Anthropic API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'

# Test Vercel API
curl https://api.vercel.com/v2/user \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

### Phase 2: Code Cleanup (REMOVING SIMULATION)

**Run this automated cleanup:**

```bash
# I'll create a script that does all of this automatically
```

### Phase 3: Testing
1. Start dev server: `npm run dev`
2. Test generation flow
3. Test deployment flow
4. Verify no simulation banners appear
5. Check console for real API calls (not "🎭 SIMULATED" messages)

### Phase 4: Deploy to Production
1. Push to GitHub
2. Deploy to Vercel
3. Add production environment variables
4. Test end-to-end in production

---

## 💰 Cost Estimates

### Required Costs (To Remove Simulation):
- **Anthropic API:** ~$3-5 per complex app generation
- **Vercel Hobby/Pro:** $0-$20/month (Pro recommended for teams)
- **Database (Neon/Supabase):** $0-$25/month (already have)

### Optional Costs (For "Go Live" Feature):
- **Supabase:** $25/month per provisioned database
- **Clerk:** $0-$25/month (free up to 5k users)
- **Stripe:** Standard payment processing fees

### Total Minimum to Launch:
**$0-$20/month + Pay-as-you-go API costs**

---

## 🚀 Decision Point

You have **3 options:**

### Option 1: Full Production (Recommended)
- Remove ALL simulation code
- Set up all required API keys
- Support complete "Go Live" infrastructure provisioning
- **Best for:** Launching industry-defying product

### Option 2: Hybrid Mode (Quick Launch)
- Remove AI simulation (use real Claude)
- Remove deployment simulation (use real Vercel)
- KEEP infrastructure simulation (fake Supabase/Clerk/Stripe provisioning)
- Disable or hide "Go Live" button
- **Best for:** MVP launch without infrastructure provisioning complexity

### Option 3: Core Features Only
- Remove ALL simulation
- Remove entire "Go Live" feature
- Focus on: AI generation → Vercel deployment → Done
- Users get deployed apps but not provisioned infrastructure
- **Best for:** Simplest production launch

---

## 📋 TODO Summary

Which would you like me to do?

**A) Option 1 - Full Production** (Remove everything, set up all infrastructure)
**B) Option 2 - Hybrid** (Real AI + deployments, fake infrastructure provisioning)
**C) Option 3 - Core Only** (Real AI + deployments, remove "Go Live" entirely)

**Let me know and I'll execute the complete migration automatically.**

---

## 🔍 Current Status

- ✅ Database: Real (PostgreSQL)
- ✅ Authentication: Real (NextAuth)
- ✅ Stripe: Real (ready for subscriptions)
- ✅ Screenshot Generation: Real (Puppeteer)
- ⚠️ AI Generation: Can be real or simulated (depends on env var)
- ⚠️ Vercel Deployment: Can be real or simulated (depends on env var + API keys)
- ⚠️ Infrastructure Provisioning: Can be real or simulated (depends on env var + API keys)
- ⚠️ Third-party Integrations: Currently mocked (demo mode)

**Next Step:** Choose your option and I'll make it happen.
