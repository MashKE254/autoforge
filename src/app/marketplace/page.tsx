/**
 * MARKETPLACE - Browse and Purchase Apps
 *
 * File: src/app/marketplace/page.tsx
 *
 * The "App Store" for AutoForge - where users discover and buy generated apps
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { MarketplaceGrid } from '@/components/marketplace/MarketplaceGrid';
import { MarketplaceFilters } from '@/components/marketplace/MarketplaceFilters';
import { MarketplaceSearch } from '@/components/marketplace/MarketplaceSearch';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Marketplace - Discover Apps | AutoForge',
  description: 'Browse and purchase production-ready applications built with AI',
};

interface MarketplacePageProps {
  searchParams: Promise<{
    query?: string;
    category?: string;
    pricing?: string;
    sort?: string;
  }>;
}

export default async function MarketplacePage({
  searchParams,
}: MarketplacePageProps) {
  // Await searchParams (Next.js 15+ requirement)
  const params = await searchParams;

  // Get published apps with filters
  const apps = await getPublishedApps(params);
  const categories = await getCategories();
  const stats = await getMarketplaceStats();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Minimalistic */}
      <section className="border-b border-gray-200">
        <div className="container mx-auto px-6 max-w-7xl py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-gray-500 mb-4">MARKETPLACE</p>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Discover AI-Built Apps
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Production-ready applications built with AI. Deploy in minutes.
            </p>

            {/* Stats - Minimal */}
            <div className="flex items-center gap-8 text-sm">
              <div>
                <div className="text-2xl font-semibold text-gray-900">{stats.totalApps}</div>
                <div className="text-gray-500">Apps</div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <div className="text-2xl font-semibold text-gray-900">{stats.totalCreators}</div>
                <div className="text-gray-500">Creators</div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <div className="text-2xl font-semibold text-gray-900">{stats.totalSales}+</div>
                <div className="text-gray-500">Downloads</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="container mx-auto px-6 max-w-7xl py-12">
          <MarketplaceSearch initialQuery={params.query} />
        </div>
      </section>

      {/* Categories - Minimal Grid */}
      <section className="border-b border-gray-100">
        <div className="container mx-auto px-6 max-w-7xl py-16">
          <h2 className="text-sm font-medium text-gray-500 mb-8 tracking-wide">BROWSE BY CATEGORY</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/marketplace?category=${category.slug}`}
                className="group flex flex-col items-start p-6 border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-sm transition-all bg-white"
              >
                <div className="text-3xl mb-3">{category.icon}</div>
                <div className="text-sm font-semibold text-gray-900 group-hover:text-gray-900">
                  {category.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {category.count} {category.count === 1 ? 'app' : 'apps'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content - Apps Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex gap-12">
            {/* Filters Sidebar - Minimal */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-6">
                <MarketplaceFilters
                  categories={categories}
                  selectedCategory={params.category}
                  selectedPricing={params.pricing}
                />
              </div>
            </aside>

            {/* Apps Grid */}
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-end justify-between mb-8 pb-6 border-b border-gray-100">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {params.query
                      ? `"${params.query}"`
                      : params.category
                      ? categories.find(c => c.slug === params.category)?.name || 'Apps'
                      : 'All Apps'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">
                    {apps.length} {apps.length === 1 ? 'result' : 'results'}
                  </p>
                </div>

                {/* Sort - Minimal */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Sort by</span>
                  <select
                    className="text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-white"
                    defaultValue={params.sort || 'popular'}
                  >
                    <option value="popular">Popular</option>
                    <option value="recent">Recent</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Grid */}
              <Suspense fallback={<MarketplaceGridSkeleton />}>
                <MarketplaceGrid apps={apps} />
              </Suspense>

              {/* Empty State */}
              {apps.length === 0 && (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-lg mb-6">
                    No apps found
                  </p>
                  <Link href="/marketplace">
                    <Button variant="outline" size="sm">Clear filters</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Minimal */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-6 max-w-4xl py-20 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">
            Build and sell your own apps
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Join creators earning revenue with AI-built applications
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/generate">
              <Button size="lg" className="px-8">
                Start Building
              </Button>
            </Link>
            <Link href="/docs/selling">
              <Button size="lg" variant="outline" className="px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function getPublishedApps(filters: {
  query?: string;
  category?: string;
  pricing?: string;
  sort?: string;
}) {
  const where: any = {
    status: 'PUBLISHED',
  };

  // Search query
  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  // Pricing filter
  if (filters.pricing) {
    if (filters.pricing === 'free') {
      where.pricingModel = 'FREE';
    } else if (filters.pricing === 'paid') {
      where.pricingModel = { in: ['SUBSCRIPTION', 'ONE_TIME'] };
    }
  }

  // Sort
  let orderBy: any = { createdAt: 'desc' };
  if (filters.sort === 'price-low') {
    orderBy = { monthlyPrice: 'asc' };
  } else if (filters.sort === 'price-high') {
    orderBy = { monthlyPrice: 'desc' };
  } else if (filters.sort === 'popular') {
    orderBy = { totalCustomers: 'desc' };
  }

  const apps = await prisma.publishedApp.findMany({
    where,
    orderBy,
    take: 50,
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  return apps.map((app) => ({
    id: app.id,
    name: app.name,
    slug: app.slug,
    description: app.description || '',
    logoUrl: app.logoUrl,
    pricingModel: app.pricingModel,
    price: app.monthlyPrice || app.oneTimePrice || 0,
    totalCustomers: app.totalCustomers,
    creator: {
      name: app.user.name || 'Anonymous',
      image: app.user.image,
    },
    deploymentUrl: app.deploymentUrl,
    createdAt: app.createdAt,
  }));
}

async function getCategories() {
  try {
    // Try to fetch categories from database with app counts
    const categories = await prisma.appCategory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            publishedApps: {
              where: { status: 'PUBLISHED' }
            }
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return categories.map(cat => ({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || '📱',
      count: cat._count.publishedApps,
      description: cat.description,
    }));
  } catch (error) {
    // Fallback to static categories if database is not available
    console.error('Failed to fetch categories from database:', error);
    return [
      { name: 'Bots', slug: 'bots', icon: '🤖', count: 12, description: 'Discord, Telegram, Slack bots' },
      { name: 'Trading Systems', slug: 'trading-systems', icon: '📈', count: 8, description: 'Crypto & stock trading bots' },
      { name: 'Web Scrapers', slug: 'web-scrapers', icon: '🕷️', count: 15, description: 'Data extraction tools' },
      { name: 'SaaS Platforms', slug: 'saas-platforms', icon: '🚀', count: 24, description: 'Full-featured SaaS apps' },
      { name: 'Automation Tools', slug: 'automation-tools', icon: '⚡', count: 18, description: 'Workflow automation' },
      { name: 'Analytics', slug: 'analytics', icon: '📊', count: 10, description: 'Data analytics dashboards' },
      { name: 'CRM', slug: 'crm', icon: '👥', count: 14, description: 'Customer relationship management' },
      { name: 'E-Commerce', slug: 'ecommerce', icon: '🛍️', count: 20, description: 'Online stores' },
    ];
  }
}

async function getMarketplaceStats() {
  const [totalApps, totalCreators, totalSales] = await Promise.all([
    prisma.publishedApp.count({ where: { status: 'PUBLISHED' } }),
    prisma.user.count({
      where: { publishedApps: { some: { status: 'PUBLISHED' } } },
    }),
    prisma.transaction.count({ where: { status: 'SUCCEEDED' } }),
  ]);

  return { totalApps, totalCreators, totalSales };
}

// ============================================================================
// COMPONENTS
// ============================================================================

function MarketplaceGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 rounded-xl overflow-hidden animate-pulse"
        >
          <div className="h-48 bg-gray-100" />
          <div className="p-6">
            <div className="h-5 bg-gray-100 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-full mb-2" />
            <div className="h-4 bg-gray-100 rounded w-2/3 mb-6" />
            <div className="h-10 bg-gray-100 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
