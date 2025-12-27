# 🎭 Simulation Mode - Test Without API Costs

Simulation mode allows you to test AutoForge's creator and monetization features without making real Anthropic API calls.

## 🚀 Quick Start

### Enable Simulation Mode

1. **Copy the simulation environment file:**
   ```bash
   cp .env.simulation .env.local
   ```

2. **Update your existing environment variables** in `.env.local`:
   - Database URL
   - Stripe keys
   - NextAuth secret
   - Keep `SIMULATE_ANTHROPIC=true`

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

4. **You're ready!** 🎉

---

## ✅ What Works in Simulation Mode

### Perfect for Testing:
- ✅ **Creator monetization flow** - Publish apps to marketplace
- ✅ **Stripe Connect integration** - Test payout setup
- ✅ **Marketplace browsing** - See published apps
- ✅ **App purchases** - Buy/sell apps
- ✅ **Dashboard analytics** - View creator earnings
- ✅ **Code generation** - Get basic working apps FAST
- ✅ **Preview system** - Test generated apps
- ✅ **Database operations** - All CRUD works normally

### How It Works:
- Code generation completes in **1-2 seconds** (vs 30-90 seconds with real API)
- Generates valid, working Next.js apps
- All files properly formatted
- Apps can be previewed, published, and sold
- **No Anthropic API costs** 💰

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
- **Code Generation** - Basic but valid Next.js app structure
- **Classification** - Returns reasonable app type detection
- **Clarification** - No questions needed (sensible defaults)
- **Code Review** - All checks pass
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
```

### 2. Monetize It
```
1. Click "Monetize This App"
2. Set pricing model (free/subscription/one-time)
3. Set prices (e.g., $9/month)
4. Connect Stripe (test mode)
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

### 4. Test Payouts
```
1. Go to creator dashboard
2. View total earnings
3. Request payout
4. Test Stripe Connect flow
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

### Enable Simulation:
```bash
# In .env.local
SIMULATE_ANTHROPIC=true
```

### Disable Simulation (Use Real API):
```bash
# In .env.local
SIMULATE_ANTHROPIC=false
# OR remove the line entirely
```

**Restart server after changing!**

---

## 🔍 How to Tell If Simulation is Active

When simulation mode is active, you'll see:

1. **Console logs:**
   ```
   🎭 Anthropic simulation mode enabled
   🎭 [BOLT GENERATOR] Running in simulation mode
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

### Real Mode (Claude Sonnet):
- ~$3 per generation (200K tokens)
- 10 tests = $30
- 100 tests = $300

### Simulation Mode:
- $0 per generation
- Unlimited tests = $0
- **Perfect for development** 🎉

---

## 🐛 Troubleshooting

### Simulation not working?

**Check 1:** Environment variable set?
```bash
# In .env.local
SIMULATE_ANTHROPIC=true
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
- [ ] Generate an app (simulated)
- [ ] Preview the generated app
- [ ] Click "Monetize This App"
- [ ] Set up pricing (free/paid/subscription)
- [ ] Connect Stripe account
- [ ] Publish to marketplace
- [ ] View app in marketplace
- [ ] Purchase your own app (test)
- [ ] Check creator dashboard earnings
- [ ] Request payout
- [ ] Verify Stripe Connect flow

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
- Token usage → Estimated (not real)

### What's Real:
- Database operations
- Stripe API calls
- File system operations
- Preview system
- Deployment
- Everything except Anthropic API

### Implementation:
- See: `/src/lib/mock-anthropic.ts`
- Factory: `getAnthropicClient()`
- Check: `isSimulationMode()`

---

## 🚀 Ready to Test!

Enable simulation mode and test your monetization flow without any API costs!

```bash
cp .env.simulation .env.local
npm run dev
```

Happy testing! 🎭
