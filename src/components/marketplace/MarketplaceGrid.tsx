/**
 * Marketplace Grid Component
 * Displays apps in a responsive grid - Minimalistic Design
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';

interface MarketplaceApp {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  pricingModel: string;
  price: number;
  totalCustomers: number;
  creator: {
    name: string;
    image: string | null;
  };
  deploymentUrl: string | null;
  createdAt: Date;
}

interface MarketplaceGridProps {
  apps: MarketplaceApp[];
}

export function MarketplaceGrid({ apps }: MarketplaceGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {apps.map((app) => (
        <AppCard key={app.id} app={app} />
      ))}
    </div>
  );
}

function AppCard({ app }: { app: MarketplaceApp }) {
  const formattedPrice = app.pricingModel === 'FREE'
    ? 'Free'
    : `$${(app.price / 100).toFixed(0)}${app.pricingModel === 'SUBSCRIPTION' ? '/mo' : ''}`;

  return (
    <Link
      href={`/marketplace/${app.slug}`}
      className="group block border border-white/10 rounded-xl overflow-hidden hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-200 bg-white/[0.02]"
    >
      {/* App Preview */}
      <div className="relative h-48 bg-gradient-to-br from-white/[0.05] to-white/[0.08] overflow-hidden">
        {app.logoUrl ? (
          <Image
            src={app.logoUrl}
            alt={app.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-5xl font-bold text-gray-600">
              {app.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Preview Icon */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-violet-500/20 backdrop-blur-sm border border-violet-500/30 rounded-full p-2 shadow-lg">
            <ArrowUpRight className="h-4 w-4 text-violet-400" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">
            {app.name}
          </h3>
          <div className="text-sm font-medium text-white shrink-0 ml-3">
            {formattedPrice}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 line-clamp-2 mb-4 min-h-[2.5rem]">
          {app.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          {/* Creator */}
          <div className="flex items-center gap-2">
            {app.creator.image ? (
              <Image
                src={app.creator.image}
                alt={app.creator.name}
                width={20}
                height={20}
                className="rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-medium text-gray-400">
                {app.creator.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-gray-500">{app.creator.name}</span>
          </div>

          {/* Users Count */}
          <div className="text-xs text-gray-500">
            {app.totalCustomers > 0 && `${app.totalCustomers} ${app.totalCustomers === 1 ? 'user' : 'users'}`}
          </div>
        </div>
      </div>
    </Link>
  );
}
