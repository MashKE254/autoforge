# 🎭 Simulation Mode - Test Without ANY API Costs

Simulation mode allows you to test AutoForge's complete creator and monetization features without making real API calls to Anthropic, Stripe, Vercel, Supabase, or Clerk.

## 🚀 Quick Start

### Enable Simulation Mode

1. **Copy the simulation environment file:**
   ```bash
   cp .env.simulation .env.local
   ```

2. **Update your existing environment variables** in `.env.local`:
   - Database URL
   - NextAuth secret
   - Keep `SIMULATE_ANTHROPIC=true`
   - Keep `SIMULATE_INFRASTRUCTURE=true`
   - **No Stripe keys needed!**

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

4. **You're ready!** 🎉

---

## ✅ What Works in Simulation Mode

### Perfect for Testing:
- ✅ **Code generation** - Get basic working apps FAST (no Anthropic API)
- ✅ **Go Live flow** - Provision infrastructure (no Vercel/Supabase/Clerk)
- ✅ **Monetization flow** - Publish apps (no Stripe)
- ✅ **Stripe Connect integration** - Test payout setup (simulated)
- ✅ **Marketplace browsing** - See published apps
- ✅ **App purchases** - Buy/sell apps (simulated payments)
- ✅ **Dashboard analytics** - View creator earnings
- ✅ **Preview system** - Test generated apps
- ✅ **Database operations** - All CRUD works normally (real database)

### How It Works:
- Code generation completes in **1-2 seconds** (vs 30-90 seconds with real API)
- Infrastructure provisioning (Go Live) completes in **2-3 seconds** (vs 2-3 minutes)
- Generates valid, working Next.js apps
- All files properly formatted
- Apps can be previewed, published, and sold
- **No API costs** - Anthropic, Stripe, Vercel, Supabase, Clerk all simulated 💰

---

## 📝 What's Simulated

### Generated Apps Include:
```
✅ package.json
✅ app/page.tsx (working homepage)
✅ app/layout.tsx
✅ app/globals.css
✅ tailwind.config.js
✅ .gitignore
```

### Simulated Responses:
- **Code Generation** - Basic but valid Next.js app structure (Anthropic)
- **Go Live** - Simulated Vercel, Supabase, Clerk, Stripe provisioning
- **Monetization** - Simulated Stripe product/price creation
- **Classification** - Returns reasonable app type detection
- **Clarification** - No questions needed (sensible defaults)
- **Recommendations** - Suggests auth, database, etc.

---

## 🧪 Testing Monetization Flow

With simulation mode, you can test the complete creator journey:

### 1. Generate an App (Simulated)
```
1. Go to dashboard
2. Click "Generate New App"
3. Enter: "A task management app"
4. Click "Generate"
5. ⚡ App generates in 1-2 seconds (simulated)
6. Click "Open AI Workspace"
```

### 2. Go Live (Simulated Infrastructure)
```
1. In workspace, click "Go Live" button
2. ⚡ Infrastructure provisions in 2-3 seconds (simulated)
3. Database (Supabase) ✅ Simulated
4. Auth (Clerk) ✅ Simulated
5. Payments (Stripe) ✅ Simulated
6. Deploy (Vercel) ✅ Simulated
7. Get simulated preview URL
```

### 3. Monetize It (Simulated Stripe)
```
1. Click "Monetize" button (appears after Go Live)
2. Set pricing model (free/subscription/one-time)
3. Set prices (e.g., $9/month)
4. ⚡ Stripe product created instantly (simulated)
5. Publish to marketplace
```

### 3. Test Marketplace
```
1. Browse marketplace
2. See your published app
3. Test purchase flow
4. View creator dashboard
5. Check earnings
```

### 4. Test Marketplace & Payouts
```
1. Browse marketplace
2. See your published app
3. Test purchase flow (simulated)
4. View creator dashboard
5. Check earnings (simulated revenue)
6. Request payout (simulated Stripe payout)
```

---

## 🎯 Use Cases

### ✅ GOOD Uses for Simulation Mode:
- Testing monetization features
- Testing marketplace UI/UX
- Testing creator dashboard
- Testing purchase flow
- Testing Stripe Connect integration
- Demo to investors/users
- Development without API costs
- CI/CD testing

### ❌ NOT Recommended for:
- Testing actual code quality
- Testing complex app generation
- Production deployments
- Customer-facing demos (use real mode)
- Validating AI prompt engineering

---

## 🔄 Switching Between Modes

### Enable Full Simulation:
```bash
# In .env.local
SIMULATE_ANTHROPIC=true           # Simulate code generation
SIMULATE_INFRASTRUCTURE=true      # Simulate Go Live & Monetize
```

### Disable Simulation (Use Real APIs):
```bash
# In .env.local
SIMULATE_ANTHROPIC=false           # Use real Anthropic API
SIMULATE_INFRASTRUCTURE=false      # Use real Stripe, Vercel, etc.
# OR remove the lines entirely
```

**Restart server after changing!**

---

## 🔍 How to Tell If Simulation is Active

When simulation mode is active, you'll see:

1. **Console logs:**
   ```
   🎭 Anthropic simulation mode enabled
   🎭 [BOLT GENERATOR] Running in simulation mode
   🎭 [PROVISIONING] Running in simulation mode
   🎭 [STRIPE] Running in simulation mode
   🎭 [SIMULATED] Anthropic API call intercepted
   ```

2. **Faster generation:**
   - Real mode: 30-90 seconds
   - Simulation mode: 1-2 seconds

3. **Basic generated apps:**
   - Real mode: 30-50 files, complex apps
   - Simulation mode: 6-8 files, basic structure

---

## 💰 Cost Savings

### Real Mode (All Services):
- Anthropic: ~$3 per generation (200K tokens)
- Vercel: $20/month for deployments
- Supabase: $25/month for databases
- Clerk: $25/month for auth
- Stripe: Transaction fees (2.9% + 30¢)
- **Total for 10 tests:** ~$100+

### Simulation Mode:
- $0 per generation
- $0 infrastructure costs
- $0 transaction fees
- Unlimited tests = $0
- **Perfect for development** 🎉

---

## 🐛 Troubleshooting

### Simulation not working?

**Check 1:** Environment variables set?
```bash
# In .env.local
SIMULATE_ANTHROPIC=true
SIMULATE_INFRASTRUCTURE=true
```

**Check 2:** Server restarted?
```bash
# Kill and restart
npm run dev
```

**Check 3:** Check console logs
```bash
# Should see:
🎭 Anthropic simulation mode enabled
```

### Generated apps look too basic?

This is **expected** in simulation mode! The apps are intentionally simple.

For testing **code quality**, use real mode.
For testing **monetization flow**, simulation is perfect.

---

## 📊 What to Test in Simulation Mode

### Creator Journey Checklist:
- [ ] Generate an app (simulated - 1-2s)
- [ ] Open AI Workspace
- [ ] Preview the generated app in sandbox
- [ ] Click "Go Live" (simulated infrastructure - 2-3s)
- [ ] See simulated: Database, Auth, Payments, Deploy
- [ ] Click "Monetize" button
- [ ] Set up pricing (free/paid/subscription)
- [ ] Stripe product created (simulated)
- [ ] Publish to marketplace
- [ ] View app in marketplace
- [ ] Purchase your own app (simulated payment)
- [ ] Check creator dashboard earnings
- [ ] Request payout (simulated Stripe payout)

### All Should Work! 🎉

---

## 🎓 Best Practices

1. **Use simulation for rapid iteration** on monetization features
2. **Use real mode for final testing** before launch
3. **Keep a test Stripe account** for simulation testing
4. **Don't mix modes** - stick to one per testing session
5. **Restart server** when switching modes

---

## ℹ️ Technical Details

### What's Mocked:
- `Anthropic.messages.create()` → Returns simulated responses
- `Anthropic.messages.stream()` → Streams simulated chunks
- `Stripe.products.create()` → Returns simulated product IDs
- `Vercel.deploy()` → Returns simulated deployment URLs
- `Supabase.createProject()` → Returns simulated database credentials
- `Clerk.createInstance()` → Returns simulated auth keys
- Token usage → Estimated (not real)

### What's Real:
- Database operations (PostgreSQL)
- File system operations
- Preview system (WebContainer)
- User authentication
- Everything in the database

### Implementation:
- Anthropic: `/src/lib/mock-anthropic.ts`
  - Factory: `getAnthropicClient()`
  - Check: `isSimulationMode()`
- Infrastructure: `/src/lib/infrastructure/provisioning-service.ts`
  - Simulates: Database, Auth, Payments, Deployment
- Stripe: `/src/lib/stripe/client.ts`
  - Check: `isSimulationMode()`

---

## 🚀 Ready to Test!

Enable simulation mode and test your monetization flow without any API costs!

```bash
cp .env.simulation .env.local
npm run dev
```

Happy testing! 🎭
