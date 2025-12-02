AutoForge 🛠️
The End-to-End "Prompt-to-Business" Engine.

AutoForge is an AI-powered platform that transforms a single text prompt into a fully functional, production-ready software product. Whether it's a SaaS application, a PaaS infrastructure, an autonomous agent network, or a workflow automation, AutoForge handles the full lifecycle: generation, database provisioning, backend logic, authentication, deployment, and payment integration.

🚀 Features
⚡ Instant Product Generation: Describe your idea, and AutoForge scaffolds a full-stack Next.js application with a database and styling.

🧠 Intelligent Classification: automatically determines if your request is a generic SaaS, a complex workflow, or an AI agent system.

🏗️ Full-Stack Infrastructure: Generates Frontend (React/Tailwind), Backend (API Routes), and Database (Prisma/PostgreSQL) schemas.

🔄 Background Processing: Powered by Trigger.dev to handle long-running generation tasks, file writing, and deployment pipelines without timeouts.

☁️ One-Click Deployment: Integrated with Vercel API to deploy generated apps instantly to a live URL.

🔐 Built-in Authentication: Pre-configured NextAuth.js setup for the generated applications.

💳 Monetization Ready: (Coming Soon) Automatically integrates Stripe billing for immediate revenue generation.

🛠️ Tech Stack
Framework: Next.js 14+ (App Router)

Language: TypeScript

Database: PostgreSQL & Prisma ORM

Job Queue: Trigger.dev (for long-running AI generation tasks)

UI/Styling: Tailwind CSS, Shadcn UI, Framer Motion

AI Models: Integration with Gemini/OpenAI (via custom generate routes)

Deployment: Vercel SDK

📂 Architecture Overview
AutoForge relies on a decoupled architecture to handle heavy code-generation tasks:

The Core App: A Next.js dashboard where users input prompts.

The Classifier: Analyzes the prompt to decide which generator to use (SaaS, Agent, Workflow).

The Worker (Trigger.dev): The heavy lifting happens here.

Files located in src/trigger/ listen for events.

It iteratively generates code, writes files, and pushes schemas.

The Runner: Executes prisma migrations and deploys the final build.

🚀 Getting Started
Prerequisites
Node.js 18+

PostgreSQL Database (Local or Neon/Supabase)

A Trigger.dev account (for background jobs)

A Vercel account (for deployments)

1. Clone the repository
Bash

git clone https://github.com/mashke254/autoforge.git
cd autoforge
2. Install Dependencies
Bash

npm install
3. Environment Setup
Create a .env file in the root directory. You will need the following keys:

Code snippet

# Database
DATABASE_URL="postgresql://..."

# Auth (NextAuth)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# AI Providers
GEMINI_API_KEY="..."
OPENAI_API_KEY="..."

# Background Jobs (Trigger.dev)
TRIGGER_API_KEY="..."
TRIGGER_API_URL="https://api.trigger.dev"

# Deployment (Vercel)
VERCEL_TOKEN="..."
VERCEL_ORG_ID="..."
VERCEL_PROJECT_ID="..."
4. Database Setup
Initialize the Prisma client and push the schema to your database.

Bash

npx prisma generate
npx prisma db push
5. Run the Development Server
You need to run both the Next.js app and the Trigger.dev dev CLI (to pick up background jobs).

Terminal 1 (Next.js App):

Bash

npm run dev
Terminal 2 (Trigger.dev Agent):

Bash

npx trigger.dev@latest dev
Visit http://localhost:3000 to start forging apps.
