/**
 * Marketplace Grid Component
 * Displays apps in a responsive grid
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Users, ExternalLink } from 'lucide-react';
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
    : `$${(app.price / 100).toFixed(2)}${app.pricingModel === 'SUBSCRIPTION' ? '/mo' : ''}`;

  return (
    <Card className="group hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="p-0">
        {/* App Preview Image */}
        <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-t-lg overflow-hidden">
          {app.logoUrl ? (
            <Image
              src={app.logoUrl}
              alt={app.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-6xl font-bold text-blue-200">
                {app.name.charAt(0)}
              </div>
            </div>
          )}

          {/* Pricing Badge */}
          <div className="absolute top-4 right-4">
            <Badge
              variant={app.pricingModel === 'FREE' ? 'secondary' : 'default'}
              className="font-semibold"
            >
              {formattedPrice}
            </Badge>
          </div>

          {/* Preview Overlay */}
          {app.deploymentUrl && (
            <Link
              href={app.deploymentUrl}
              target="_blank"
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <div className="bg-white rounded-full p-3">
                <ExternalLink className="h-6 w-6 text-blue-600" />
              </div>
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6">
        {/* App Name */}
        <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
          {app.name}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {app.description}
        </p>

        {/* Creator Info */}
        <div className="flex items-center gap-2 mb-4">
          {app.creator.image ? (
            <Image
              src={app.creator.image}
              alt={app.creator.name}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
              {app.creator.name.charAt(0)}
            </div>
          )}
          <span className="text-sm text-gray-500">by {app.creator.name}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>4.8</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{app.totalCustomers} users</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 gap-2">
        <Link href={`/marketplace/${app.slug}`} className="flex-1">
          <Button variant="outline" className="w-full">
            View Details
          </Button>
        </Link>
        <Link href={`/marketplace/${app.slug}/purchase`} className="flex-1">
          <Button className="w-full">
            {app.pricingModel === 'FREE' ? 'Get Free' : 'Buy Now'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
