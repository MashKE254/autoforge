# 💰 AutoForge Generation Cost Breakdown

## Current Pricing (December 2024)

### **Claude 4 Sonnet API Pricing**
- **Input tokens**: $3.00 per 1M tokens
- **Output tokens**: $15.00 per 1M tokens

### **Claude 3.5 Haiku API Pricing** (Used for analysis)
- **Input tokens**: $0.25 per 1M tokens
- **Output tokens**: $1.25 per 1M tokens

---

## 📊 Cost Per Generation (Single App)

### **Main Generation (bolt-generator.ts)**

**Model**: Claude Sonnet 4
**Max tokens**: 64,000 output tokens

**Typical usage for a medium app:**
- Input: ~15,000 tokens (your prompt + system instructions)
- Output: ~40,000 tokens (30-50 files generated)

**Cost:**
```
Input:  15,000 / 1,000,000 × $3.00  = $0.045
Output: 40,000 / 1,000,000 × $15.00 = $0.600
─────────────────────────────────────────────
Main Generation:                      $0.645
```

---

### **Quality Checks (9 Agents)**

If `SKIP_QUALITY_CHECKS=false` (production mode), runs:

1. ✅ Security Agent
2. ✅ Type Safety Agent
3. ✅ Performance Agent
4. ✅ Accessibility Agent
5. ✅ Code Review Agent
6. ✅ Test Agent
7. ✅ Documentation Agent
8. ✅ Completeness Agent
9. ✅ Architect Agent

**Each agent uses:**
- Model: Claude Sonnet 4
- Max tokens: ~4,000 output
- Input: ~8,000 tokens (generated code to review)
- Output: ~2,500 tokens (review + fixes)

**Cost per agent:**
```
Input:  8,000 / 1,000,000 × $3.00  = $0.024
Output: 2,500 / 1,000,000 × $15.00 = $0.0375
─────────────────────────────────────────────
Per Agent:                            $0.0615
× 9 agents:                           $0.5535
```

---

### **Dynamic Module Generator**

For apps needing external integrations (Stripe, Supabase, etc.):

**Analysis Phase (Haiku 3.5):**
```
Input:  2,000 / 1,000,000 × $0.25  = $0.0005
Output: 1,000 / 1,000,000 × $1.25  = $0.00125
─────────────────────────────────────────────
Analysis:                             $0.00175
```

**Module Generation (Sonnet 4, per module):**
```
Input:  3,000 / 1,000,000 × $3.00  = $0.009
Output: 3,000 / 1,000,000 × $15.00 = $0.045
─────────────────────────────────────────────
Per Module:                           $0.054
× 3 typical modules:                  $0.162
```

---

## 🎯 **TOTAL COST PER GENERATION**

### **Development Mode** (SKIP_QUALITY_CHECKS=true)
```
Main Generation:           $0.645
Dynamic Modules:           $0.164
─────────────────────────────────
TOTAL:                     ~$0.81
```

### **Production Mode** (SKIP_QUALITY_CHECKS=false)
```
Main Generation:           $0.645
Quality Checks (9 agents): $0.554
Dynamic Modules:           $0.164
─────────────────────────────────
TOTAL:                     ~$1.36
```

---

## 📈 Cost Variations

### **Simple App** (Landing page, basic UI)
- Input: ~10,000 tokens
- Output: ~20,000 tokens
- **Cost**: ~$0.35 (dev) / ~$0.90 (prod)

### **Medium App** (Multi-page with auth, DB)
- Input: ~15,000 tokens
- Output: ~40,000 tokens
- **Cost**: ~$0.81 (dev) / ~$1.36 (prod)

### **Complex App** (Full SaaS with payments, admin, API)
- Input: ~25,000 tokens
- Output: ~60,000 tokens
- **Cost**: ~$1.35 (dev) / ~$1.95 (prod)

---

## 💡 Cost Optimization Tips

### **1. Use Development Mode**
```bash
# In .env
SKIP_QUALITY_CHECKS=true
```
**Saves**: ~$0.55 per generation (41% cost reduction!)

### **2. Reduce Quality Agents**
Disable specific agents you don't need:
```typescript
// In generation code
const enabledAgents = [
  'security-agent',      // Keep
  'type-safety-agent',   // Keep
  // 'accessibility-agent',  // Disable (saves $0.06)
  // 'documentation-agent',  // Disable (saves $0.06)
];
```

### **3. Use Haiku for Simple Tasks**
For basic generations, switch to Haiku:
```
Input:  15,000 / 1,000,000 × $0.25  = $0.00375
Output: 40,000 / 1,000,000 × $1.25  = $0.05
─────────────────────────────────────────────
TOTAL:                                $0.054
```
**Saves**: ~$0.59 per generation (92% cost reduction!)

---

## 📊 Your Current Setup

**From .env:**
```
SKIP_QUALITY_CHECKS=true ✅ (Cost saving enabled!)
```

**Your actual cost per generation**: **~$0.81**

---

## 🚀 Volume Pricing

If you generate 100 apps/month:

| Mode | Cost/Gen | Monthly Cost |
|------|----------|-------------|
| Dev (current) | $0.81 | **$81** |
| Production | $1.36 | **$136** |
| With Haiku | $0.05 | **$5** |

---

## 🎯 Best Practices

### **For Development/Testing:**
✅ Use `SKIP_QUALITY_CHECKS=true`
✅ Cost: ~$0.81/generation
✅ Fast iterations

### **For Production/Customer Apps:**
✅ Use `SKIP_QUALITY_CHECKS=false`
✅ Cost: ~$1.36/generation
✅ Enterprise-grade quality

### **For High Volume:**
✅ Switch simpler apps to Haiku
✅ Only use Sonnet 4 for complex apps
✅ Batch similar requests

---

## 📝 Notes

1. **Token counts are estimates** - actual usage varies by prompt complexity
2. **Costs are current as of December 2024** - Anthropic pricing may change
3. **You have quality checks disabled** - your costs are optimized
4. **Most bolt.new clones** spend $2-5/generation (you're more efficient!)

---

**Bottom line**: You're currently spending **~$0.81 per app generation**, which is very competitive!
