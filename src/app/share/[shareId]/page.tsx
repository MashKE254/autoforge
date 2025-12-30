'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, Eye, GitFork, Twitter, Linkedin, Link as LinkIcon, Code, ExternalLink } from 'lucide-react';

interface ShareData {
  id: string;
  shareId: string;
  title: string;
  description: string;
  creatorName: string;
  thumbnailUrl?: string;
  allowRemix: boolean;
  showCode: boolean;
  viewCount: number;
  remixCount: number;
  createdAt: string;
  generation: {
    id: string;
    prompt: string;
    status: string;
    deploymentUrl?: string;
    files?: Array<{
      path: string;
      content: string;
      language: string;
    }>;
  };
}

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const shareId = params?.shareId as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [remixing, setRemixing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    if (shareId) {
      fetchShareData();
    }
  }, [shareId]);

  const fetchShareData = async () => {
    try {
      const res = await fetch(`/api/share/${shareId}`);
      const data = await res.json();

      if (data.success) {
        setShareData(data.share);
      } else {
        console.error('Failed to fetch share data');
      }
    } catch (error) {
      console.error('Error fetching share:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemix = async () => {
    if (!shareData) return;

    setRemixing(true);

    try {
      const res = await fetch(`/api/share/${shareId}/remix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modifiedPrompt: shareData.generation.prompt
        })
      });

      const data = await res.json();

      if (data.success) {
        // Redirect to the new generation
        router.push(`/dashboard?job=${data.remix.newJobId}`);
      } else if (data.requiresAuth) {
        // Show sign-up modal or redirect to login
        router.push(`/login?callbackUrl=/share/${shareId}&action=remix`);
      }
    } catch (error) {
      console.error('Remix error:', error);
    } finally {
      setRemixing(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleShareTwitter = () => {
    const text = `Check out "${shareData?.title}" - Built with AutoForge in seconds! 🚀`;
    const url = `${window.location.origin}/share/${shareId}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const url = `${window.location.origin}/share/${shareId}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Share Not Found</h1>
          <p className="text-gray-400 mb-6">This share link doesn't exist or has been removed.</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Go to AutoForge
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Image src="/BASED IN.png" alt="AutoForge" width={24} height={24} className="rounded-lg" />
            </div>
            <span className="text-xl font-bold">AutoForge</span>
          </Link>

          {!session && (
            <Link
              href="/login"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Creator Attribution */}
          <div className="mb-6">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold">
                  {shareData.creatorName?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created by</p>
                <p className="text-white font-medium">{shareData.creatorName}</p>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {shareData.title}
            </h1>
            <p className="text-xl text-gray-300 mb-6">{shareData.description}</p>

            {/* Stats & Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Eye className="w-4 h-4" />
                <span>{shareData.viewCount.toLocaleString()} views</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <GitFork className="w-4 h-4" />
                <span>{shareData.remixCount.toLocaleString()} remixes</span>
              </div>

              <div className="flex-1" />

              {/* Share Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors relative"
                  title="Copy link"
                >
                  <LinkIcon className="w-5 h-5" />
                  {showCopied && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-500 text-white text-xs rounded whitespace-nowrap">
                      Copied!
                    </span>
                  )}
                </button>
                <button
                  onClick={handleShareTwitter}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Share on Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShareLinkedIn}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Share on LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="mb-8">
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-semibold">Live Preview</h2>
                {shareData.generation.deploymentUrl && (
                  <a
                    href={shareData.generation.deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Open in new tab
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <div className="aspect-video bg-black/50">
                {shareData.generation.deploymentUrl ? (
                  <iframe
                    src={shareData.generation.deploymentUrl}
                    className="w-full h-full"
                    title="App Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No preview available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Remix Section */}
          {shareData.allowRemix && (
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-8 mb-8">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-cyan-400" />
                    Forge Your Own Version
                  </h2>
                  <p className="text-gray-300 mb-4">
                    Use this app as a starting point to create your own. Customize the prompt and generate a new version in seconds.
                  </p>
                  <div className="bg-black/30 rounded-lg p-4 mb-4 border border-white/10">
                    <p className="text-sm text-gray-400 mb-2">Original Prompt:</p>
                    <p className="text-white">{shareData.generation.prompt}</p>
                  </div>
                  <button
                    onClick={handleRemix}
                    disabled={remixing}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
                  >
                    <GitFork className="w-5 h-5" />
                    {remixing ? 'Creating Remix...' : 'Remix This App'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Code View (if enabled) */}
          {shareData.showCode && shareData.generation.files && (
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Code className="w-5 h-5" />
                Source Code
              </h2>
              <div className="space-y-2">
                {shareData.generation.files.slice(0, 5).map((file, idx) => (
                  <details key={idx} className="bg-black/30 rounded-lg overflow-hidden">
                    <summary className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors">
                      <span className="font-mono text-sm text-cyan-400">{file.path}</span>
                    </summary>
                    <pre className="p-4 overflow-x-auto">
                      <code className="text-sm text-gray-300">{file.content}</code>
                    </pre>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Build Your Own App in Seconds</h3>
          <p className="text-gray-400 mb-6">
            Join thousands of creators using AutoForge to build, deploy, and monetize apps with AI
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
          >
            <Sparkles className="w-5 h-5" />
            Start Building Free
          </Link>
        </div>
      </footer>
    </div>
  );
}
