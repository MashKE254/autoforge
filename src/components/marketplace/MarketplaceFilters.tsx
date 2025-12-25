/**
 * Marketplace Filters Component
 * Sidebar filters for category, pricing, etc.
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface Category {
  name: string;
  icon: string;
  count: number;
}

interface MarketplaceFiltersProps {
  categories: Category[];
  selectedCategory?: string;
  selectedPricing?: string;
}

export function MarketplaceFilters({
  categories,
  selectedCategory,
  selectedPricing,
}: MarketplaceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/marketplace?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/marketplace');
  };

  const hasFilters = selectedCategory || selectedPricing;

  return (
    <div className="space-y-6">
      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          Clear All Filters
        </Button>
      )}

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            onClick={() => updateFilter('category', null)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              !selectedCategory
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'hover:bg-gray-50'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => updateFilter('category', category.name.toLowerCase())}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                selectedCategory === category.name.toLowerCase()
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </span>
              <span className="text-sm text-gray-500">{category.count}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedPricing || 'all'}
            onValueChange={(value) =>
              updateFilter('pricing', value === 'all' ? null : value)
            }
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="pricing-all" />
                <Label htmlFor="pricing-all" className="cursor-pointer">
                  All Apps
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="free" id="pricing-free" />
                <Label htmlFor="pricing-free" className="cursor-pointer">
                  Free
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="pricing-paid" />
                <Label htmlFor="pricing-paid" className="cursor-pointer">
                  Paid
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="feature-api" />
            <Label
              htmlFor="feature-api"
              className="text-sm font-normal cursor-pointer"
            >
              Has API
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="feature-mobile" />
            <Label
              htmlFor="feature-mobile"
              className="text-sm font-normal cursor-pointer"
            >
              Mobile Ready
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="feature-auth" />
            <Label
              htmlFor="feature-auth"
              className="text-sm font-normal cursor-pointer"
            >
              User Authentication
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="feature-payments" />
            <Label
              htmlFor="feature-payments"
              className="text-sm font-normal cursor-pointer"
            >
              Payment Processing
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="feature-ai" />
            <Label
              htmlFor="feature-ai"
              className="text-sm font-normal cursor-pointer"
            >
              AI-Powered
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Price Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Slider
              defaultValue={[0, 100]}
              max={500}
              step={10}
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>$0</span>
              <span>$500+</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[5, 4, 3].map((stars) => (
            <button
              key={stars}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <span className="flex">
                {[...Array(stars)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
                {[...Array(5 - stars)].map((_, i) => (
                  <span key={i} className="text-gray-300">★</span>
                ))}
              </span>
              <span className="text-sm text-gray-600">& up</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
