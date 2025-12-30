# 🚀 Viral Sharing System

## Overview

The viral sharing system enables creators to share their generated apps with clean, shareable links - just like bolt.new. This creates a powerful viral growth loop where every shared creation becomes a landing page that drives new signups.

## 🎯 Features Implemented

### 1. **Shareable Links**
- Clean URLs: `autoforge.ai/share/abc123xyz`
- Auto-generated share IDs (8 characters)
- Public share pages with live previews
- Creator attribution

### 2. **Public Share Page** (`/share/[shareId]`)
- Live preview iframe of the generated app
- Creator information and attribution
- View count and remix count
- Social sharing buttons (Twitter, LinkedIn)
- "Remix This App" button for viral forking
- Optional code viewing

### 3. **Remix/Fork Functionality**
- One-click remixing of shared apps
- Uses original prompt as starting point
- Tracks remix lineage (parent relationships)
- Requires login to save (growth lever!)
- Anonymous users see prompt but must sign up

### 4. **Analytics Tracking**
- View tracking (deduplicated by session)
- Referrer tracking (where traffic comes from)
- IP address and user agent logging
- View count increments
- Remix count tracking

### 5. **Social Media Integration**
- Rich OG (Open Graph) images auto-generated
- Twitter card support
- LinkedIn preview support
- Share buttons on every page
- Copy-to-clipboard functionality

### 6. **Trending Page** (`/trending`)
- Sort by: Most Viewed, Most Remixed, Recent
- Grid layout with thumbnails
- Top 3 rank badges (🥇 🥈 🥉)
- Stats display (views, remixes)
- Links to share pages

### 7. **Share Button Component**
- Appears after app generation
- Modal with share options
- Social media quick-share buttons
- Copy link functionality
- View share page link

## 📊 Database Schema

### `ShareLink`
```prisma
model ShareLink {
  id                String        @id @default(cuid())
  generationJobId   String        @unique
  shareId           String        @unique @default(cuid())

  // Settings
  isPublic          Boolean       @default(true)
  allowRemix        Boolean       @default(true)
  showCode          Boolean       @default(false)

  // Creator
  creatorId         String
  creatorName       String?

  // Analytics
  viewCount         Int           @default(0)
  remixCount        Int           @default(0)
  lastViewedAt      DateTime?

  // Social metadata
  title             String?
  description       String?
  thumbnailUrl      String?

  // Relations
  views             ShareView[]
  remixes           ShareRemix[]
}
```

### `ShareView`
```prisma
model ShareView {
  id            String    @id @default(cuid())
  shareLinkId   String

  // Tracking
  ipAddress     String?
  userAgent     String?
  referrer      String?
  country       String?
  sessionId     String?

  viewedAt      DateTime  @default(now())
}
```

### `ShareRemix`
```prisma
model ShareRemix {
  id                  String        @id @default(cuid())
  originalShareId     String
  newGenerationJobId  String        @unique
  remixedByUserId     String?
  modifiedPrompt      String?

  createdAt           DateTime      @default(now())
}
```

## 🔌 API Routes

### `POST /api/share/create`
Creates a share link for a generation job.

**Request:**
```json
{
  "generationJobId": "gen_abc123",
  "title": "My Awesome App",
  "description": "An AI-powered tool...",
  "showCode": false
}
```

**Response:**
```json
{
  "success": true,
  "shareLink": {
    "id": "share_xyz789",
    "shareId": "abc123xyz",
    "url": "https://autoforge.ai/share/abc123xyz",
    "viewCount": 0,
    "remixCount": 0
  }
}
```

### `GET /api/share/[shareId]`
Retrieves share link data and tracks the view.

**Response:**
```json
{
  "success": true,
  "share": {
    "id": "share_xyz789",
    "shareId": "abc123xyz",
    "title": "My Awesome App",
    "description": "...",
    "creatorName": "Sarah Johnson",
    "viewCount": 347,
    "remixCount": 23,
    "generation": {
      "id": "gen_abc123",
      "prompt": "Build a...",
      "deploymentUrl": "https://..."
    }
  }
}
```

### `POST /api/share/[shareId]/remix`
Creates a new generation based on a shared app.

**Request:**
```json
{
  "modifiedPrompt": "Build a meeting transcriber with extra features"
}
```

**Response:**
```json
{
  "success": true,
  "remix": {
    "id": "remix_123",
    "newJobId": "gen_new456",
    "prompt": "Build a meeting transcriber...",
    "message": "Your remix is being generated!"
  }
}
```

### `GET /api/share/trending`
Returns trending shared apps.

**Query Parameters:**
- `sortBy`: `views`, `remixes`, or `recent`
- `limit`: Max results (default 24, max 100)

**Response:**
```json
{
  "success": true,
  "apps": [
    {
      "id": "share_xyz",
      "shareId": "abc123",
      "title": "Meeting Transcriber",
      "viewCount": 1247,
      "remixCount": 89
    }
  ]
}
```

## 🎨 Components

### `<ShareButton />`
Shows share modal after generation.

```tsx
import ShareButton from '@/components/ShareButton';

<ShareButton
  generationJobId="gen_abc123"
  title="My App"
  description="App description"
/>
```

## 📈 Viral Growth Mechanics

### **The Viral Loop**

1. **Create** → User generates an app
2. **Share** → Gets shareable link, posts to Twitter/LinkedIn
3. **View** → 100 people click the link
4. **Remix** → 5% click "Remix This App" = 5 signups
5. **Repeat** → Those 5 share their versions → 25 more signups
6. **Exponential** → Viral coefficient > 1 = exponential growth

### **Growth Levers**

1. **Frictionless Sharing**: One-click share button
2. **Social Proof**: View/remix counts create FOMO
3. **Creator Pride**: Attribution drives creators to share
4. **Zero Friction Preview**: Instant live preview, no login required
5. **Sign-up Gate**: Must login to remix (conversion point)
6. **Rich Previews**: Beautiful OG images on social media
7. **Trending Page**: Gamification (leaderboard effect)

### **Expected Results**

Conservative estimates:
- **100 creations/day** → **2,000 views/day** (20x multiplier)
- **5% remix rate** → **100 signups/day**
- **Viral coefficient**: 1.0 - 1.5 (sustainable viral growth)

Compare to bolt.new:
- Went from 0 → 1M users in ~6 months
- Primary driver: Viral sharing
- Every share = free landing page

## 🚀 Usage Instructions

### For Developers

#### 1. Run Migration
```bash
npx prisma migrate dev --name add_viral_sharing_system
npx prisma generate
```

#### 2. Add Share Button to Generation Success
```tsx
// In your generation success component
import ShareButton from '@/components/ShareButton';

<ShareButton
  generationJobId={job.id}
  title={job.prompt.slice(0, 100)}
  description={job.prompt}
/>
```

#### 3. Add Trending Link to Nav
```tsx
<Link href="/trending">
  🔥 Trending
</Link>
```

### For Creators

#### Creating a Share Link
1. Generate an app
2. Click "Share" button
3. Copy link or share directly to social media

#### Viewing Analytics
```sql
SELECT
  title,
  viewCount,
  remixCount,
  creatorName
FROM ShareLink
WHERE creatorId = 'your_user_id'
ORDER BY viewCount DESC;
```

## 🎯 Next Steps (Future Enhancements)

### Phase 2: Enhanced Analytics
- [ ] Geographic heatmap of views
- [ ] Referrer analytics dashboard
- [ ] Viral coefficient tracking
- [ ] A/B testing different share messages

### Phase 3: Gamification
- [ ] Creator leaderboard
- [ ] Badges (100 views, 50 remixes, etc.)
- [ ] Weekly "Most Viral" awards
- [ ] Share milestones notifications

### Phase 4: Advanced Sharing
- [ ] Custom share images (let creators upload)
- [ ] Share to more platforms (Reddit, Discord, WhatsApp)
- [ ] Embed codes for blogs
- [ ] QR codes for physical sharing

### Phase 5: Monetization Integration
- [ ] Track conversions from shares → paid plans
- [ ] Affiliate links for creators
- [ ] Revenue share for viral creators
- [ ] Premium share features

## 📊 Metrics to Track

### Daily Monitoring
- Share links created
- Total views
- Total remixes
- Conversion rate (views → remixes)
- Sign-ups from remixes
- Viral coefficient

### Weekly Analysis
- Top referrers (Twitter, LinkedIn, etc.)
- Top shared apps
- Geographic distribution
- Time-to-remix (how fast people remix after viewing)

## 🔒 Security & Privacy

- **View Deduplication**: Same session within 1 hour = 1 view
- **IP Hashing**: IPs are hashed for privacy
- **Session IDs**: Anonymous tracking via SHA-256
- **No PII**: No personal info stored without consent
- **Public by Default**: All shares are public (can be changed)

## 🎉 Success Metrics

Track these to measure viral success:

1. **Viral Coefficient** = (Remixes × Share Rate) ÷ Original Shares
   - Target: > 1.0 (sustainable viral growth)

2. **Share → Remix Conversion**
   - Target: 3-5% (industry standard)

3. **Remix → Signup Conversion**
   - Target: 80%+ (high intent)

4. **Time to First Share**
   - Target: < 5 minutes after generation

---

**Built with ❤️ for exponential growth 🚀**

This system is your growth engine. Every share is a new landing page. Every remix is a new user. Every creator becomes a marketer.

**Now go viral! 🔥**
