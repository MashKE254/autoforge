# Creator Dashboard - Complete Management Hub

The Creator Dashboard is a comprehensive control center for creators to manage all their applications, track performance metrics, and make AI-powered updates to their deployed apps.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [User Flows](#user-flows)
- [API Endpoints](#api-endpoints)
- [Components](#components)
- [AI-Powered Updates](#ai-powered-updates)
- [Usage Guide](#usage-guide)

---

## Overview

The Creator Dashboard provides a unified interface where creators can:

- **View overview metrics** - Total revenue, customers, MRR, active apps
- **Manage all creations** - See all generated, deployed, and published apps in one place
- **Access deployment URLs** - Quick links to live apps with one-click copy
- **Track performance** - Revenue, customer count, and engagement metrics per app
- **Make AI-powered updates** - Update deployed apps using natural language prompts
- **View analytics** - Detailed insights into app performance and user behavior

**Access:** Navigate to `/dashboard/creator` or click "My Apps" in the header navigation.

---

## Features

### 1. Overview Dashboard

**Location:** `/dashboard/creator`

#### Metrics Cards
- **Total Revenue** - Lifetime earnings across all apps with 30-day trend
- **Total Customers** - Cumulative customer count with monthly growth
- **Monthly Recurring Revenue (MRR)** - Subscription revenue with trend
- **Active Apps** - Currently deployed apps with published count

#### Subscription Info
- Current plan (FREE, STARTER, PRO, BUSINESS)
- Usage (published apps vs. plan limit)
- Platform fee percentage
- Quick link to upgrade/manage plan

### 2. Creations Grid

Displays all your apps with:

#### Per-App Information
- **Status Badge** - PUBLISHED, LIVE, PREVIEW, DRAFT, COMPLETED, RUNNING, FAILED
- **App Name** - From published/managed app or truncated prompt
- **Creation Date** - When the app was generated
- **Files Count** - Number of files in the project

#### Metrics (for Published Apps)
- **Revenue** - Total earnings from this app
- **Customers** - Number of paying customers
- **MRR** - Monthly recurring revenue

#### Metrics (for Managed Apps)
- **Views** - Marketplace page views
- **Installs** - Number of installations

#### Deployment URL
- Live URL with one-click copy
- External link to open in new tab
- Visual indicator of deployment type (managed/preview/published)

#### Quick Actions
- **Manage** - Go to detailed app management page
- **Analytics** - View detailed performance metrics (for published apps)
- **View Live** - Open deployed app in new tab

### 3. Individual Creation Management

**Location:** `/dashboard/creations/[id]`

#### Header
- App name and metadata
- Back to dashboard button
- AI Update button (prominent CTA)

#### AI Update Editor
- Text area for natural language prompts
- Examples:
  - "Add a dark mode toggle to the settings page"
  - "Change the primary color scheme to blue"
  - "Add a contact form with email validation"
- Apply/Cancel actions
- Real-time status updates

#### Deployment Info
- Live URL with copy button
- External link to open app
- Deployment status

#### Performance Metrics (Published Apps)
- Total Revenue card
- Total Customers card
- Monthly Recurring Revenue card

#### Project Files List
- All generated files with paths
- File size and language
- Link to view/edit individual files

#### Quick Actions
- **Analytics** - Detailed performance dashboard
- **View Code** - Browse all generated files
- **AI Update** - Make changes using AI

### 4. Recent Activity Feed

Shows recent transactions and events:
- Transaction type (subscription, one-time purchase)
- App name
- Amount earned
- Timestamp

---

## Architecture

### Database Schema

The dashboard uses existing models:

```prisma
// Core generation data
GenerationJob {
  id, prompt, status, createdAt, updatedAt
  files[] // Generated code files
  publishedApps[] // Monetized apps
  managedApp // Hosted SaaS apps
  managedProject // Preview infrastructure
}

// Published marketplace apps
PublishedApp {
  id, name, slug, status
  totalRevenue, totalCustomers, monthlyRecurring
  pricingModel, prices
  deploymentUrl
}

// Managed SaaS apps
ManagedApp {
  id, name, subdomain, deploymentUrl
  marketplaceViews, marketplaceInstalls
  status (PROVISIONING, ACTIVE, SUSPENDED)
}

// Preview infrastructure
ManagedProject {
  id, status, vercelUrl
  supabaseUrl, clerkInstanceId
}
```

### File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── creator/
│   │   │   └── dashboard/
│   │   │       └── route.ts          # Unified dashboard data API
│   │   └── creations/
│   │       └── [id]/
│   │           ├── route.ts          # Individual creation details API
│   │           └── update/
│   │               └── route.ts      # AI-powered update endpoint
│   └── dashboard/
│       └── creator/
│           ├── page.tsx              # Main creator dashboard
│           └── creations/
│               └── [id]/
│                   └── page.tsx      # Individual creation management
└── components/
    └── header.tsx                    # Navigation (updated with "My Apps" link)
```

---

## User Flows

### Flow 1: Viewing Dashboard

1. User clicks "My Apps" in navigation
2. System fetches all creations via `/api/creator/dashboard`
3. Dashboard displays:
   - Overview metrics (revenue, customers, MRR, apps)
   - All creations in grid layout
   - Recent activity feed
4. User can see all apps at a glance with key metrics

### Flow 2: Managing Individual Creation

1. From dashboard, click "Manage" on any creation
2. Navigate to `/dashboard/creations/[id]`
3. System fetches detailed info via `/api/creations/[id]`
4. Page displays:
   - Full app details and status
   - Deployment URL with copy button
   - Performance metrics (if published)
   - All project files
   - Quick actions

### Flow 3: Making AI-Powered Updates

1. On creation detail page, click "AI Update"
2. AI editor modal appears
3. User enters natural language prompt:
   ```
   "Add a dark mode toggle that persists user preference in localStorage"
   ```
4. Click "Apply Update"
5. System sends prompt to `/api/creations/[id]/update`
6. AI analyzes existing code and requested changes
7. AI generates updated file contents
8. System updates files in database
9. If deployed, triggers redeployment
10. User sees success message
11. Changes are live within minutes

### Flow 4: Copying Deployment URL

1. User sees deployed app in dashboard
2. Clicks copy icon next to URL
3. URL copied to clipboard
4. Visual confirmation (checkmark icon)
5. Can paste URL to share with others

---

## API Endpoints

### GET `/api/creator/dashboard`

Returns comprehensive dashboard data.

**Response:**
```json
{
  "overview": {
    "totalRevenue": 125000,        // cents
    "totalCustomers": 47,
    "monthlyRecurring": 8900,      // cents/month
    "totalApps": 12,
    "completedApps": 10,
    "publishedCount": 5,
    "draftCount": 2,
    "activeApps": 8,
    "recentRevenue": 15000,        // last 30 days
    "recentCustomers": 8           // last 30 days
  },
  "creations": [
    {
      "id": "cmj...",
      "prompt": "Build a task management app...",
      "status": "PUBLISHED",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:45:00Z",
      "generationMode": "SAAS",
      "filesCount": 23,
      "deploymentUrl": "https://taskflow.vercel.app",
      "deploymentType": "managed",
      "publishedApp": {
        "id": "pub...",
        "name": "TaskFlow",
        "slug": "taskflow",
        "status": "PUBLISHED",
        "totalRevenue": 45000,
        "totalCustomers": 15,
        "monthlyRecurring": 2900,
        "pricingModel": "SUBSCRIPTION"
      },
      "managedApp": {
        "id": "app...",
        "name": "TaskFlow",
        "subdomain": "taskflow",
        "status": "ACTIVE",
        "deploymentUrl": "https://taskflow.autoforge.app",
        "marketplaceViews": 234,
        "marketplaceInstalls": 18
      },
      "managedProject": null
    }
  ],
  "recentActivity": [
    {
      "id": "txn...",
      "type": "transaction",
      "description": "Subscription for TaskFlow",
      "amount": 900,               // cents
      "createdAt": "2025-01-20T14:22:00Z",
      "appName": "TaskFlow",
      "appSlug": "taskflow"
    }
  ],
  "subscription": {
    "plan": "PRO",
    "status": "ACTIVE",
    "currentPeriodEnd": "2025-02-15T00:00:00Z",
    "limits": {
      "maxPublishedApps": 20,
      "platformFeePercent": 6,
      "features": [...]
    },
    "usage": {
      "publishedApps": 5,
      "maxPublishedApps": 20
    }
  },
  "stats": {
    "totalJobs": 12,
    "completedJobs": 10,
    "publishedApps": 5,
    "activeApps": 8,
    "totalRevenue": 125000,
    "totalCustomers": 47
  }
}
```

### GET `/api/creations/[id]`

Returns detailed information about a specific creation.

**Response:**
```json
{
  "id": "cmj...",
  "prompt": "Build a task management app with kanban boards",
  "status": "COMPLETED",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:45:00Z",
  "generationMode": "SAAS",
  "filesCount": 23,
  "deploymentUrl": "https://taskflow.vercel.app",
  "files": [
    {
      "id": "file...",
      "path": "src/app/page.tsx",
      "language": "tsx",
      "size": 2456
    }
  ],
  "publishedApp": { /* same as above */ },
  "managedApp": { /* same as above */ },
  "managedProject": null
}
```

### POST `/api/creations/[id]/update`

Apply AI-powered updates to a deployed app.

**Request:**
```json
{
  "prompt": "Add a dark mode toggle that persists in localStorage"
}
```

**Response:**
```json
{
  "success": true,
  "filesUpdated": 3,
  "updatedFiles": [
    {
      "path": "src/app/layout.tsx",
      "action": "updated",
      "reason": "Added dark mode provider and theme context"
    },
    {
      "path": "src/components/theme-toggle.tsx",
      "action": "created",
      "reason": "New component for theme switching UI"
    },
    {
      "path": "src/app/globals.css",
      "action": "updated",
      "reason": "Added dark mode CSS variables and styles"
    }
  ],
  "summary": "Added dark mode toggle with localStorage persistence. Updated layout to include theme provider, created new toggle component, and added CSS variables for theme switching.",
  "deploymentTriggered": true,
  "message": "Files updated successfully and deployment triggered"
}
```

**Error Response:**
```json
{
  "error": "Cannot update a creation that is not completed",
  "details": "Creation must have status COMPLETED"
}
```

---

## Components

### CreatorDashboard (`/app/dashboard/creator/page.tsx`)

Main dashboard component with:
- Overview metrics cards
- Subscription info banner
- Creations grid with filtering
- Recent activity feed
- Loading and error states

**State:**
- `data: DashboardData | null` - All dashboard data
- `loading: boolean` - Loading state
- `error: string | null` - Error message
- `copiedUrl: string | null` - Currently copied URL for visual feedback

**Methods:**
- `fetchDashboardData()` - Fetch from API
- `copyToClipboard(url)` - Copy URL and show confirmation
- `formatCurrency(cents)` - Format cents to USD
- `formatDate(dateString)` - Format timestamp
- `getStatusIcon(status)` - Get appropriate icon for status
- `getStatusColor(status)` - Get color classes for status badge

### CreationDetailPage (`/app/dashboard/creations/[id]/page.tsx`)

Individual creation management with:
- App header with back button
- AI update editor modal
- Deployment info section
- Performance metrics (if published)
- Project files list
- Quick action cards

**State:**
- `creation: CreationDetails | null` - Creation data
- `loading: boolean` - Loading state
- `error: string | null` - Error message
- `showAIEditor: boolean` - AI editor visibility
- `aiPrompt: string` - User's update prompt
- `aiUpdating: boolean` - Update in progress
- `aiError: string | null` - AI update error

**Methods:**
- `fetchCreationDetails()` - Fetch creation data
- `handleAIUpdate()` - Process AI update
- `copyToClipboard(url)` - Copy deployment URL

---

## AI-Powered Updates

### How It Works

1. **Context Building**
   - Fetches existing files for the creation
   - Limits to first 10 files to avoid token limits
   - Includes file paths, languages, and content previews

2. **AI Analysis**
   - Sends context + user prompt to Claude
   - AI identifies which files need changes
   - Generates complete updated file contents
   - Provides explanation of changes

3. **File Updates**
   - Updates existing files in database
   - Creates new files if needed
   - Tracks file sizes and metadata

4. **Redeployment** (if applicable)
   - Checks for Vercel project ID
   - Triggers redeployment via Vercel API
   - Creates deployment record in database
   - Updates deployment URL

### AI Prompt Format

The AI receives:
```
You are an expert code update assistant. Given an existing codebase
and a user's requested change, generate the updated file contents.

Original project prompt: [original prompt]
User's update request: [update prompt]

Existing files:
File: src/app/page.tsx
Language: tsx
Content: [first 500 chars]...

Your task:
1. Identify which files need to be updated
2. Generate complete updated content
3. Respond in JSON format:
{
  "filesToUpdate": [
    {
      "path": "path/to/file",
      "content": "complete updated file content",
      "reason": "explanation of changes"
    }
  ],
  "summary": "brief summary of all changes"
}
```

### Example AI Updates

#### Example 1: Add Dark Mode
**Prompt:** "Add a dark mode toggle to the header"

**AI Response:**
- Updates `src/app/layout.tsx` - Adds ThemeProvider
- Creates `src/components/theme-toggle.tsx` - New toggle component
- Updates `src/app/globals.css` - Dark mode CSS variables

**Result:** Full dark mode support with persistent user preference

#### Example 2: Add Form
**Prompt:** "Add a contact form with email validation to the contact page"

**AI Response:**
- Creates `src/app/contact/page.tsx` - New contact page
- Creates `src/components/contact-form.tsx` - Form component
- Creates `src/lib/validation.ts` - Email validation helper
- Creates `src/app/api/contact/route.ts` - API endpoint

**Result:** Complete contact form with validation and submission

#### Example 3: Change Styling
**Prompt:** "Change the primary color from purple to blue throughout the app"

**AI Response:**
- Updates `tailwind.config.js` - Changes primary color values
- Updates `src/app/globals.css` - Updates CSS variables

**Result:** Consistent blue theme throughout app

### Limitations

- **Token Limits:** Only analyzes first 10 files to stay within API limits
- **Context:** Works best with specific, focused requests
- **Validation:** No automatic testing - creator should verify changes
- **Deployment Time:** Updates may take 2-5 minutes to deploy live

### Best Practices for AI Updates

✅ **Good Prompts:**
- "Add authentication using Clerk to the app"
- "Change the homepage layout to a 3-column grid"
- "Add pagination to the blog posts list"
- "Implement form validation for the signup page"

❌ **Avoid:**
- Vague requests: "Make it better"
- Multiple unrelated changes: "Add auth and change colors and add blog"
- Breaking changes without context: "Remove all the code"

---

## Usage Guide

### For Creators

#### Step 1: Access Dashboard
1. Log in to AutoForge
2. Click "My Apps" in the header or navigate to `/dashboard/creator`

#### Step 2: View Overview
- Check your total revenue, customer count, and MRR
- See how many apps you have (total, completed, published)
- Monitor your subscription plan and usage

#### Step 3: Browse Creations
- Scroll through your apps in the grid
- See status, deployment URL, and key metrics at a glance
- Use filters to find specific apps

#### Step 4: Manage Individual App
1. Click "Manage" on any creation
2. View detailed information
3. Copy deployment URL to share
4. See all project files
5. Access analytics (for published apps)

#### Step 5: Make AI Updates
1. On creation detail page, click "AI Update"
2. Enter what you want to change:
   ```
   Add a pricing page with three tiers
   ```
3. Click "Apply Update"
4. Wait for AI to process (10-30 seconds)
5. Review changes summary
6. Changes automatically deploy
7. Test live app after 2-5 minutes

#### Step 6: Track Performance
- View revenue metrics on dashboard
- Check customer growth
- Monitor MRR trends
- Access detailed analytics per app

### For Developers

#### Adding New Metrics

1. Update database queries in `/api/creator/dashboard/route.ts`
2. Add fields to response type in dashboard page
3. Create new metric card component
4. Display in overview section

#### Extending AI Update Capabilities

1. Modify system prompt in `/api/creations/[id]/update/route.ts`
2. Adjust file context building logic
3. Add validation for specific update types
4. Implement custom redeployment logic

#### Customizing UI

- Dashboard grid: `src/app/dashboard/creator/page.tsx`
- Creation detail: `src/app/dashboard/creations/[id]/page.tsx`
- Styles: Tailwind classes with dark theme support

---

## Next Steps

Potential enhancements:

1. **Analytics Dashboard** - Per-app detailed analytics page
2. **Bulk Actions** - Select multiple apps for batch operations
3. **Templates** - Save successful apps as templates
4. **Collaboration** - Invite team members to manage apps
5. **Advanced AI Features** - Voice commands, screenshot-to-code
6. **A/B Testing** - Test different versions of apps
7. **User Feedback** - Collect and display customer reviews
8. **Revenue Forecasting** - Predict future earnings based on trends

---

## Support

For help with the Creator Dashboard:
- Check `/help` for documentation
- Contact support via in-app chat
- Join our Discord community
- Submit issues on GitHub

---

**Last Updated:** January 2025
**Version:** 1.0.0
