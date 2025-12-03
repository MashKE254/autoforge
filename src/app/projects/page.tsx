'use client';

/**
 * Projects Page
 * 
 * File: src/app/projects/page.tsx
 * 
 * Displays all user's generated projects with delete functionality
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FolderOpen,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  FileCode,
  ExternalLink,
} from 'lucide-react';

// --- Types ---

interface Project {
  id: string;
  prompt: string;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING';
  createdAt: string;
  fileCount: number;
}

// --- Sub-components ---

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    COMPLETED: { color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: CheckCircle, label: 'Completed' },
    RUNNING: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Loader2, label: 'Running' },
    FAILED: { color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: XCircle, label: 'Failed' },
    PENDING: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: Clock, label: 'Pending' },
  };
  
  const { color, icon: Icon, label } = config[status] || config.PENDING;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      <Icon className={`w-3 h-3 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
      {label}
    </div>
  );
}

function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  projectPrompt,
  isDeleting 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  projectPrompt: string;
  isDeleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1A1A1C] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Delete Project</h3>
            <p className="text-sm text-gray-400">This action cannot be undone</p>
          </div>
        </div>
        
        <p className="text-gray-300 text-sm mb-2">
          Are you sure you want to delete this project?
        </p>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-6">
          <p className="text-gray-400 text-sm line-clamp-2">
            &quot;{projectPrompt}&quot;
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mb-6">
        <FolderOpen className="w-10 h-10 text-violet-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
      <p className="text-gray-400 text-center max-w-sm mb-6">
        Start by describing what you want to build and AutoForge will generate it for you.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Create Your First Project
      </Link>
    </div>
  );
}

// --- Main Component ---

export default function ProjectsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    projectId: string | null;
    projectPrompt: string;
  }>({
    isOpen: false,
    projectId: null,
    projectPrompt: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  // Fetch projects
  useEffect(() => {
    if (session?.user?.id) {
      fetchProjects();
    }
  }, [session?.user?.id]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/jobs/recent?limit=100');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (project: Project) => {
    setDeleteModal({
      isOpen: true,
      projectId: project.id,
      projectPrompt: project.prompt,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.projectId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${deleteModal.projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove from local state
        setProjects(prev => prev.filter(p => p.id !== deleteModal.projectId));
        setDeleteModal({ isOpen: false, projectId: null, projectPrompt: '' });
      } else {
        const error = await res.json();
        alert(`Failed to delete: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClose = () => {
    if (!isDeleting) {
      setDeleteModal({ isOpen: false, projectId: null, projectPrompt: '' });
    }
  };

  // Filter projects by search
  const filteredProjects = projects.filter(project =>
    project.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Projects</h1>
              <p className="text-gray-400 text-sm mt-1">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              New Project
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Search and View Toggle */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Projects List */}
            {viewMode === 'list' ? (
              <div className="bg-[#1A1A1C] border border-white/10 rounded-xl overflow-hidden">
                <div className="divide-y divide-white/5">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="group flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                    >
                      {/* Project Info */}
                      <Link
                        href={`/generate/result/${project.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <FileCode className="w-5 h-5 text-violet-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate group-hover:text-violet-200 transition-colors">
                              {project.prompt.length > 80 
                                ? project.prompt.slice(0, 80) + '...' 
                                : project.prompt}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-gray-500 text-xs">
                                {formatDate(project.createdAt)}
                              </span>
                              {project.fileCount > 0 && (
                                <span className="text-gray-500 text-xs">
                                  {project.fileCount} files
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-3">
                        <StatusBadge status={project.status} />
                        
                        <Link
                          href={`/generate/result/${project.id}`}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Open project"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteClick(project);
                          }}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group bg-[#1A1A1C] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                        <FileCode className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteClick(project)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <Link href={`/generate/result/${project.id}`}>
                      <p className="text-white font-medium line-clamp-2 mb-3 group-hover:text-violet-200 transition-colors">
                        {project.prompt}
                      </p>
                    </Link>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(project.createdAt)}
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                    
                    {project.fileCount > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <span className="text-xs text-gray-500">
                          {project.fileCount} files generated
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {filteredProjects.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No projects matching &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        projectPrompt={deleteModal.projectPrompt}
        isDeleting={isDeleting}
      />
    </div>
  );
}