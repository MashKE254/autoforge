/**
 * MARKETPLACE - Browse and Purchase Apps
 *
 * File: src/app/marketplace/page.tsx
 *
 * REDESIGNED: Dark theme to match platform consistency
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { MarketplaceGrid } from '@/components/marketplace/MarketplaceGrid';
import { MarketplaceFilters } from '@/components/marketplace/MarketplaceFilters';
import { MarketplaceSearch } from '@/components/marketplace/MarketplaceSearch';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Sparkles, TrendingUp, Users } from 'lucide-react';

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
  const params = await searchParams;
  const apps = await getPublishedApps(params);
  const categories = await getCategories();
  const stats = await getMarketplaceStats();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="border-b border-white/10">
          <div className="container mx-auto px-6 max-w-7xl py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                <span>AI-Built Applications</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                Discover AI-Built Apps
              </h1>

              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                Production-ready applications built with AI. Deploy in minutes, start earning today.
              </p>

              {/* Stats */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{stats.totalApps}</div>
                    <div className="text-sm text-gray-500">Apps Available</div>
                  </div>
                </div>

                <div className="h-12 w-px bg-white/10" />

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{stats.totalCreators}</div>
                    <div className="text-sm text-gray-500">Creators</div>
                  </div>
                </div>

                <div className="h-12 w-px bg-white/10" />

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{stats.totalSales}+</div>
                    <div className="text-sm text-gray-500">Downloads</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search Section */}
        <section className="border-b border-white/10 bg-white/[0.02]">
          <div className="container mx-auto px-6 max-w-7xl py-12">
            <MarketplaceSearch initialQuery={params.query} />
          </div>
        </section>

        {/* Categories */}
        <section className="border-b border-white/10">
          <div className="container mx-auto px-6 max-w-7xl py-16">
            <h2 className="text-sm font-medium text-gray-500 mb-8 tracking-wide uppercase">
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/marketplace?category=${category.slug}`}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.05] hover:border-violet-500/50 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-cyan-500/0 group-hover:from-violet-500/10 group-hover:to-cyan-500/10 transition-all duration-300" />
                  <div className="relative">
                    <div className="text-4xl mb-3">{category.icon}</div>
                    <div className="text-sm font-semibold text-white mb-1">
                      {category.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.count} {category.count === 1 ? 'app' : 'apps'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="flex gap-12">
              {/* Filters Sidebar */}
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
                <div className="flex items-end justify-between mb-8 pb-6 border-b border-white/10">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">
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

                  {/* Sort */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Sort by</span>
                    <select
                      className="text-sm px-4 py-2 bg-white/[0.05] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-white"
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
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/[0.05] border border-white/10 mb-6">
                      <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-lg mb-6">
                      No apps found
                    </p>
                    <Link href="/marketplace">
                      <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/[0.05]">
                        Clear filters
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-white/10 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent">
          <div className="container mx-auto px-6 max-w-4xl py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Start Earning Today</span>
            </div>

            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Build and sell your own apps
            </h2>

            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
              Join creators earning revenue with AI-built applications. Go from idea to income in minutes.
            </p>

            <div className="flex gap-4 justify-center">
              <Link href="/generate">
                <Button size="lg" className="px-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500">
                  Start Building
                </Button>
              </Link>
              <Link href="/docs/selling">
                <Button size="lg" variant="outline" className="px-8 border-white/10 hover:bg-white/[0.05]">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
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

  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  if (filters.pricing) {
    if (filters.pricing === 'free') {
      where.pricingModel = 'FREE';
    } else if (filters.pricing === 'paid') {
      where.pricingModel = { in: ['SUBSCRIPTION', 'ONE_TIME'] };
    }
  }

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
          className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] animate-pulse"
        >
          <div className="h-48 bg-white/[0.05]" />
          <div className="p-6">
            <div className="h-5 bg-white/[0.05] rounded w-3/4 mb-3" />
            <div className="h-4 bg-white/[0.05] rounded w-full mb-2" />
            <div className="h-4 bg-white/[0.05] rounded w-2/3 mb-6" />
            <div className="h-10 bg-white/[0.05] rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
