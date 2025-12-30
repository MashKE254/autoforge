'use client';

import { useState } from 'react';
import { Share2, Check, Twitter, Linkedin, Copy, ExternalLink } from 'lucide-react';

interface ShareButtonProps {
  generationJobId: string;
  title?: string;
  description?: string;
}

export default function ShareButton({ generationJobId, title, description }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const createShareLink = async () => {
    if (shareLink) {
      setIsOpen(true);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationJobId,
          title,
          description,
          showCode: false
        })
      });

      const data = await res.json();

      if (data.success) {
        setShareLink(data.shareLink.url);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOnTwitter = () => {
    if (!shareLink) return;
    const text = `Check out what I just built with AutoForge! ${title || ''} 🚀`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    if (!shareLink) return;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`, '_blank');
  };

  return (
    <>
      {/* Share Button */}
      <button
        onClick={createShareLink}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-lg hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 transition-all hover:scale-105 hover:shadow-lg hover:shadow-violet-500/50"
      >
        <Share2 className="w-4 h-4" />
        {loading ? 'Creating...' : 'Share'}
      </button>

      {/* Share Modal */}
      {isOpen && shareLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Share2 className="w-6 h-6 text-violet-400" />
                Share Your App
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Share Link */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block">Share on Social Media</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={shareOnTwitter}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                  Twitter
                </button>
                <button
                  onClick={shareOnLinkedIn}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                  LinkedIn
                </button>
              </div>
            </div>

            {/* View Share Page */}
            <a
              href={shareLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Share Page
            </a>

            {/* Info */}
            <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <p className="text-sm text-gray-300">
                💡 <strong>Pro tip:</strong> Share your creation on social media to inspire others and grow your audience!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
