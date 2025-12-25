/**
 * Marketplace Search Component
 * Search bar with auto-suggestions
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MarketplaceSearchProps {
  initialQuery?: string;
}

export function MarketplaceSearch({ initialQuery = '' }: MarketplaceSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const params = new URLSearchParams(searchParams);
      params.set('query', query.trim());
      router.push(`/marketplace?${params.toString()}`);
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    const params = new URLSearchParams(searchParams);
    params.delete('query');
    router.push(`/marketplace?${params.toString()}`);
  };

  // Fetch suggestions as user types
  useEffect(() => {
    if (query.length > 2) {
      // TODO: Fetch real suggestions from API
      const mockSuggestions = [
        'CRM for small business',
        'E-commerce platform',
        'Task management app',
        'Invoice generator',
      ].filter((s) => s.toLowerCase().includes(query.toLowerCase()));

      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  return (
    <div className="relative max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for apps... (e.g., CRM, e-commerce, analytics)"
            className="pl-12 pr-24 py-6 text-lg bg-white shadow-lg border-2 border-transparent focus:border-white focus:ring-4 focus:ring-white/20"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          Search
        </Button>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-10 overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                setQuery(suggestion);
                setShowSuggestions(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <Search className="h-4 w-4 text-gray-400" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
