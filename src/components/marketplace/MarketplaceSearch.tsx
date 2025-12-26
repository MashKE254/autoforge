/**
 * Marketplace Search Component
 * Search bar - Minimalistic Design
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface MarketplaceSearchProps {
  initialQuery?: string;
}

export function MarketplaceSearch({ initialQuery = '' }: MarketplaceSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const params = new URLSearchParams(searchParams);
      params.set('query', query.trim());
      router.push(`/marketplace?${params.toString()}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    const params = new URLSearchParams(searchParams);
    params.delete('query');
    router.push(`/marketplace?${params.toString()}`);
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps..."
            className="w-full pl-12 pr-12 py-4 text-base bg-white/[0.05] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
