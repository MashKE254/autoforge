'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Loader2, 
  Code2, 
  Calendar,
  ArrowRight,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';

interface Project {
  id: string;
  prompt: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEPLOYING';
  createdAt: string;
  updatedAt: string;
  totalModules: number;
  completedModules: number;
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this would fetch from /api/projects
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/jobs/recent'); // Reusing your existing endpoint for now
        if (res.ok) {
          const data = await res.json();
          setProjects(data.jobs || []);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) fetchProjects();
  }, [session]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || project.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'RUNNING': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'FAILED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'DEPLOYING': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-gray-400">Manage and monitor your generated applications</p>
          </div>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center justify-center px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            New Project
          </Link>
        </div>

        {/* Filters & Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#1A1A1C] border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-violet-500 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="ALL">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="RUNNING">Running</option>
              <option value="FAILED">Failed</option>
            </select>
            <div className="flex bg-[#1A1A1C] border border-white/10 rounded-lg p-1">
              <button 
                onClick={() => setView('grid')}
                className={`p-1.5 rounded ${view === 'grid' ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setView('list')}
                className={`p-1.5 rounded ${view === 'list' ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-[#1A1A1C] border border-white/10 rounded-xl">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Code2 className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-gray-400 mb-6">Start by creating your first AI-generated application</p>
            <Link 
              href="/dashboard"
              className="text-violet-400 hover:text-violet-300 font-medium"
            >
              Create Project &rarr;
            </Link>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredProjects.map((project) => (
              <Link 
                key={project.id}
                href={`/generate/result/${project.id}`}
                className={`group block bg-[#1A1A1C] border border-white/10 rounded-xl hover:border-violet-500/50 transition-all overflow-hidden ${
                  view === 'list' ? 'flex items-center gap-6 p-4' : 'p-6'
                }`}
              >
                {/* Card Icon */}
                <div className={`${view === 'list' ? 'hidden' : 'mb-6'}`}>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                    <Code2 className="w-6 h-6 text-violet-400" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium truncate pr-4">{project.prompt}</h3>
                    {view === 'list' && (
                      <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                    Generated on {new Date(project.createdAt).toLocaleDateString()}
                  </p>

                  {view === 'grid' && (
                    <div className="flex items-center justify-between mt-auto">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors" />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}