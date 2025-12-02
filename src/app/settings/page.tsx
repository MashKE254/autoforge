'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Save, Loader2, Key } from 'lucide-react';

export default function ProfileSettings() {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  // Mock state for API keys
  const [openAIKey, setOpenAIKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-1">Profile Information</h2>
        <p className="text-sm text-gray-400">Manage your public profile details</p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-300">Display Name</label>
          <input
            type="text"
            defaultValue={session?.user?.name || ''}
            className="bg-[#0A0A0B] border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-300">Email Address</label>
          <input
            type="email"
            defaultValue={session?.user?.email || ''}
            disabled
            className="bg-[#0A0A0B] border border-white/10 rounded-lg px-4 py-2.5 opacity-50 cursor-not-allowed"
          />
        </div>
      </div>

      <hr className="border-white/10" />

      <div>
        <h2 className="text-xl font-bold mb-1">BYO API Keys</h2>
        <p className="text-sm text-gray-400">Use your own keys to lower generation costs</p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Key className="w-4 h-4" /> OpenAI API Key
          </label>
          <input
            type="password"
            placeholder="sk-..."
            value={openAIKey}
            onChange={(e) => setOpenAIKey(e.target.value)}
            className="bg-[#0A0A0B] border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-violet-500 font-mono"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Key className="w-4 h-4" /> Anthropic API Key
          </label>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            className="bg-[#0A0A0B] border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-violet-500 font-mono"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}