/**
 * Prisma Seed Script
 * File: prisma/seed.ts
 *
 * Populates database with initial marketplace categories
 *
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: 'Bots',
    slug: 'bots',
    description: 'Discord, Telegram, Slack, Twitter, and WhatsApp bots for automation and engagement',
    icon: '🤖',
    color: '#5865F2', // Discord blue
    sortOrder: 1,
    isFeatured: true,
  },
  {
    name: 'Trading Systems',
    slug: 'trading-systems',
    description: 'Automated trading bots for crypto, stocks, and forex markets',
    icon: '📈',
    color: '#10B981', // Green
    sortOrder: 2,
    isFeatured: true,
  },
  {
    name: 'Web Scrapers',
    slug: 'web-scrapers',
    description: 'Data extraction tools for websites, APIs, and social media',
    icon: '🕷️',
    color: '#8B5CF6', // Purple
    sortOrder: 3,
    isFeatured: true,
  },
  {
    name: 'Social Automation',
    slug: 'social-automation',
    description: 'Tools for scheduling posts, automating engagement, and managing social media',
    icon: '📱',
    color: '#EC4899', // Pink
    sortOrder: 4,
    isFeatured: true,
  },
  {
    name: 'Data Pipelines',
    slug: 'data-pipelines',
    description: 'ETL systems, data processing workflows, and analytics pipelines',
    icon: '⚙️',
    color: '#F59E0B', // Orange
    sortOrder: 5,
    isFeatured: false,
  },
  {
    name: 'CLI Tools',
    slug: 'cli-tools',
    description: 'Command-line utilities and developer tools',
    icon: '💻',
    color: '#6B7280', // Gray
    sortOrder: 6,
    isFeatured: false,
  },
  {
    name: 'Browser Extensions',
    slug: 'browser-extensions',
    description: 'Chrome, Firefox, and Edge extensions for productivity and automation',
    icon: '🧩',
    color: '#3B82F6', // Blue
    sortOrder: 7,
    isFeatured: false,
  },
  {
    name: 'CRMs & Dashboards',
    slug: 'crms-dashboards',
    description: 'Customer relationship management systems and admin dashboards',
    icon: '📊',
    color: '#0EA5E9', // Sky blue
    sortOrder: 8,
    isFeatured: true,
  },
  {
    name: 'APIs & Backends',
    slug: 'apis-backends',
    description: 'RESTful APIs, GraphQL servers, and backend services',
    icon: '🔌',
    color: '#14B8A6', // Teal
    sortOrder: 9,
    isFeatured: false,
  },
  {
    name: 'Workflows & Automation',
    slug: 'workflows-automation',
    description: 'Business process automation, workflow engines, and task schedulers',
    icon: '⚡',
    color: '#F97316', // Orange-red
    sortOrder: 10,
    isFeatured: false,
  },
  {
    name: 'AI Agents',
    slug: 'ai-agents',
    description: 'Autonomous AI agents, chatbots, and intelligent assistants',
    icon: '🧠',
    color: '#A855F7', // Purple
    sortOrder: 11,
    isFeatured: true,
  },
  {
    name: 'SaaS Applications',
    slug: 'saas-applications',
    description: 'Full-featured SaaS products with billing, auth, and multi-tenancy',
    icon: '🚀',
    color: '#EF4444', // Red
    sortOrder: 12,
    isFeatured: true,
  },
];

async function main() {
  console.log('🌱 Seeding database with marketplace categories...');

  try {
    for (const category of categories) {
      const created = await prisma.appCategory.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
          sortOrder: category.sortOrder,
          isFeatured: category.isFeatured,
          isActive: true,
        },
        create: category,
      });

      console.log(`✅ Created/Updated category: ${created.name} (${created.slug})`);
    }

    console.log('✨ Seeding complete!');
  } catch (error: any) {
    // Check if error is due to missing table
    if (error.code === 'P2021') {
      console.log('⚠️  AppCategory table does not exist yet.');
      console.log('   Run migrations first: npx prisma migrate dev');
      console.log('   Skipping seed for now...');
    } else {
      throw error;
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
