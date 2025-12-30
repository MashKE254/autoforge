'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Eye, GitFork, Sparkles, Clock } from 'lucide-react';

interface TrendingApp {
  id: string;
  shareId: string;
  title: string;
  description: string;
  creatorName: string;
  thumbnailUrl?: string;
  viewCount: number;
  remixCount: number;
  createdAt: string;
}

type SortBy = 'views' | 'remixes' | 'recent';

export default function TrendingPage() {
  const [apps, setApps] = useState<TrendingApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('views');

  useEffect(() => {
    fetchTrendingApps();
  }, [sortBy]);

  const fetchTrendingApps = async () => {
    try {
      const res = await fetch(`/api/share/trending?sortBy=${sortBy}`);
      const data = await res.json();

      if (data.success) {
        setApps(data.apps);
      }
    } catch (error) {
      console.error('Failed to fetch trending apps:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
              Trending Apps
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Discover the most popular apps built with AutoForge
          </p>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('views')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                sortBy === 'views'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Most Viewed
            </button>
            <button
              onClick={() => setSortBy('remixes')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                sortBy === 'remixes'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <GitFork className="w-4 h-4 inline mr-2" />
              Most Remixed
            </button>
            <button
              onClick={() => setSortBy('recent')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                sortBy === 'recent'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Recently Shared
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Loading trending apps...</div>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-400 mb-2">No trending apps yet</h2>
            <p className="text-gray-500">Be the first to share your creation!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app, index) => (
              <Link
                key={app.id}
                href={`/share/${app.shareId}`}
                className="group bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/20"
              >
                {/* Rank Badge */}
                {index < 3 && (
                  <div className="absolute top-4 left-4 z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      'bg-orange-600 text-white'
                    }`}>
                      #{index + 1}
                    </div>
                  </div>
                )}

                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-violet-900/20 to-cyan-900/20 relative overflow-hidden">
                  {app.thumbnailUrl ? (
                    <img
                      src={app.thumbnailUrl}
                      alt={app.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-16 h-16 text-violet-500/30" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-white group-hover:text-violet-400 transition-colors line-clamp-2">
                    {app.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {app.description}
                  </p>

                  {/* Creator */}
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                      {app.creatorName?.charAt(0) || '?'}
                    </div>
                    <span>{app.creatorName}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Eye className="w-4 h-4" />
                      <span>{app.viewCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <GitFork className="w-4 h-4" />
                      <span>{app.remixCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* CTA */}
      <div className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
          <p className="text-gray-400 mb-6">
            Create your own app in seconds and join the trending list
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
          >
            <Sparkles className="w-5 h-5" />
            Start Building
          </Link>
        </div>
      </div>
    </div>
  );
}
