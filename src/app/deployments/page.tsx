'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  GitBranch, 
  Clock, 
  ExternalLink, 
  MoreHorizontal, 
  RefreshCw,
  Terminal,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

// Mock Data
const deployments = [
  {
    id: 'dpl_1',
    projectName: 'Analytics Dashboard Pro',
    url: 'analytics-dashboard-pro.vercel.app',
    branch: 'main',
    status: 'READY',
    lastDeployed: '2 mins ago',
    commit: 'Initial generation',
  },
  {
    id: 'dpl_2',
    projectName: 'SaaS Landing Page',
    url: 'saas-landing-xi.vercel.app',
    branch: 'main',
    status: 'ERROR',
    lastDeployed: '1 hour ago',
    commit: 'Update pricing section',
  }
];

export default function DeploymentsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Deployments</h1>
            <p className="text-gray-400">Manage your live applications and domains</p>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2 bg-[#1A1A1C] border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="bg-[#1A1A1C] border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-black/20 text-xs uppercase text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">URL</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {deployments.map((deploy) => (
                <tr key={deploy.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{deploy.projectName}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {deploy.lastDeployed}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      deploy.status === 'READY' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {deploy.status === 'READY' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {deploy.status}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a 
                      href={`https://${deploy.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-300 hover:text-violet-400 transition-colors group"
                    >
                      <Globe className="w-4 h-4 text-gray-500 group-hover:text-violet-400" />
                      {deploy.url}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
                      <GitBranch className="w-4 h-4" />
                      {deploy.branch}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-gray-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {deployments.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Globe className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No active deployments found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}