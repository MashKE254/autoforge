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
import { Sparkles, TrendingUp, Star, Zap } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Marketplace - Discover Apps | AutoForge',
  description: 'Browse and purchase production-ready applications built with AI',
};

interface MarketplacePageProps {
  searchParams: {
    query?: string;
    category?: string;
    pricing?: string;
    sort?: string;
  };
}

export default async function MarketplacePage({
  searchParams,
}: MarketplacePageProps) {
  // Get published apps with filters
  const apps = await getPublishedApps(searchParams);
  const categories = await getCategories();
  const stats = await getMarketplaceStats();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold mb-4">
              Discover AI-Built Apps
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Production-ready applications built with AI. Buy, customize, and launch in minutes.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">{stats.totalApps}</div>
                <div className="text-sm text-blue-100">Apps Available</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">{stats.totalCreators}</div>
                <div className="text-sm text-blue-100">Creators</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">{stats.totalSales}</div>
                <div className="text-sm text-blue-100">Sales</div>
              </div>
            </div>

            {/* Search */}
            <MarketplaceSearch initialQuery={searchParams.query} />
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/marketplace?category=${category.slug}`}
                className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="text-2xl">{category.icon}</div>
                <div>
                  <div className="font-medium group-hover:text-blue-600">
                    {category.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {category.count} apps
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Filters */}
      <section className="py-6 bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <QuickFilter icon={Sparkles} label="New Arrivals" value="new" />
            <QuickFilter icon={TrendingUp} label="Trending" value="trending" />
            <QuickFilter icon={Star} label="Top Rated" value="top-rated" />
            <QuickFilter icon={Zap} label="Free" value="free" />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex gap-8">
            {/* Filters Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <MarketplaceFilters
                categories={categories}
                selectedCategory={searchParams.category}
                selectedPricing={searchParams.pricing}
              />
            </aside>

            {/* Apps Grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    {searchParams.query
                      ? `Results for "${searchParams.query}"`
                      : searchParams.category
                      ? `${searchParams.category} Apps`
                      : 'All Apps'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {apps.length} {apps.length === 1 ? 'app' : 'apps'} found
                  </p>
                </div>

                {/* Sort Dropdown */}
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={searchParams.sort || 'popular'}
                >
                  <option value="popular">Most Popular</option>
                  <option value="recent">Recently Added</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

              <Suspense fallback={<MarketplaceGridSkeleton />}>
                <MarketplaceGrid apps={apps} />
              </Suspense>

              {apps.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-lg mb-4">
                    No apps found matching your criteria
                  </p>
                  <Link href="/marketplace">
                    <Button>Clear Filters</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Build Your Own App and Sell It Here
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of creators earning passive income with AI-built applications
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/generate">
              <Button size="lg" variant="secondary">
                Start Building
              </Button>
            </Link>
            <Link href="/docs/selling">
              <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 border-white text-white">
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
  // Fetch categories from database with app counts
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

function QuickFilter({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={`/marketplace?sort=${value}`}
      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function MarketplaceGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse"
        >
          <div className="h-40 bg-gray-200 rounded-lg mb-4" />
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-full mb-4" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
