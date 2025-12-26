/**
 * Marketplace Filters Component
 * Sidebar filters - Minimalistic Design
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Category {
  name: string;
  slug: string;
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
    <div className="space-y-8">
      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full justify-start text-gray-400 hover:text-white px-0"
        >
          <X className="h-4 w-4 mr-2" />
          Clear filters
        </Button>
      )}

      {/* Categories */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 mb-4 tracking-wide uppercase">Category</h3>
        <div className="space-y-1">
          <button
            onClick={() => updateFilter('category', null)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              !selectedCategory
                ? 'bg-violet-500/20 text-violet-400 font-medium border border-violet-500/30'
                : 'text-gray-400 hover:bg-white/[0.05]'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.slug}
              onClick={() => updateFilter('category', category.slug)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                selectedCategory === category.slug
                  ? 'bg-violet-500/20 text-violet-400 font-medium border border-violet-500/30'
                  : 'text-gray-400 hover:bg-white/[0.05]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{category.icon}</span>
                <span>{category.name}</span>
              </span>
              <span className={`text-xs ${selectedCategory === category.slug ? 'text-violet-300' : 'text-gray-500'}`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 mb-4 tracking-wide uppercase">Pricing</h3>
        <RadioGroup
          value={selectedPricing || 'all'}
          onValueChange={(value) =>
            updateFilter('pricing', value === 'all' ? null : value)
          }
        >
          <div className="space-y-1">
            <div className={`flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${!selectedPricing || selectedPricing === 'all' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'text-gray-400 hover:bg-white/[0.05]'}`}>
              <RadioGroupItem value="all" id="pricing-all" className={!selectedPricing || selectedPricing === 'all' ? 'border-violet-400' : ''} />
              <Label htmlFor="pricing-all" className="cursor-pointer text-sm flex-1">
                All
              </Label>
            </div>
            <div className={`flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${selectedPricing === 'free' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'text-gray-400 hover:bg-white/[0.05]'}`}>
              <RadioGroupItem value="free" id="pricing-free" className={selectedPricing === 'free' ? 'border-violet-400' : ''} />
              <Label htmlFor="pricing-free" className="cursor-pointer text-sm flex-1">
                Free
              </Label>
            </div>
            <div className={`flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${selectedPricing === 'paid' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'text-gray-400 hover:bg-white/[0.05]'}`}>
              <RadioGroupItem value="paid" id="pricing-paid" className={selectedPricing === 'paid' ? 'border-violet-400' : ''} />
              <Label htmlFor="pricing-paid" className="cursor-pointer text-sm flex-1">
                Paid
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
