'use client';

/**
 * AI Workspace - AutoForge 2.0
 * 
 * File: src/components/ai-workspace.tsx
 * 
 * Features:
 * - Dark theme with subtle gradients
 * - WebContainer sandbox preview (instant, simulated)
 * - Live preview mode (real infrastructure)
 * - Monaco code editor
 * - Terminal output
 * - Download as ZIP
 * - "Go Live" button for managed infrastructure provisioning
 * - Deploy to Vercel
 * - Optional monetization with Stripe Connect
 * - Sandbox vs Live mode indicator
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send,
  Code,
  Eye,
  Download,
  Sparkles,
  FileCode,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Terminal,
  RefreshCw,
  ExternalLink,
  FolderTree,
  MessageSquare,
  Copy,
  Check,
  Rocket,
  DollarSign,
  AlertCircle,
  Zap,
  Database,
  Shield,
  Globe,
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { WebContainer } from '@webcontainer/api';
import WebContainerManager from '@/lib/webcontainer-manager';
import { ActionRunner, Action } from '@/lib/action-runner';
import { getNextJsTemplate, mergeWithTemplate } from '@/lib/templates';
import DeployModal from '@/components/DeployModal';
import MonetizeModal from '@/components/monetization/monetizeModal';

// ============================================================================
// TYPES
// ============================================================================

interface InitialFile {
  path: string;
  content: string;
  language: string;
}

interface PlanStep {
  title: string;
  description: string;
  [key: string]: unknown;
}

interface AIWorkspaceProps {
  plan: PlanStep[];
  projectName: string;
  jobId: string;
  initialFiles?: InitialFile[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FileNode {
  name: string;
  path: string;
  content: string;
  language: string;
}

type PreviewMode = 'sandbox' | 'live';
type ProvisioningStep = 'database' | 'auth' | 'payments' | 'deploy';
type ProvisioningStatus = 'idle' | 'provisioning' | 'ready' | 'error';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function detectLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    md: 'markdown',
    html: 'html',
    mjs: 'javascript',
    prisma: 'prisma',
    yml: 'yaml',
    yaml: 'yaml',
    sql: 'sql',
  };
  return map[ext] || 'plaintext';
}

function groupFilesByFolder(files: FileNode[]): Record<string, FileNode[]> {
  const groups: Record<string, FileNode[]> = { '/': [] };

  files.forEach((file) => {
    const parts = file.path.split('/');
    if (parts.length === 1) {
      groups['/'].push(file);
    } else {
      const folder = parts.slice(0, -1).join('/');
      if (!groups[folder]) {
        groups[folder] = [];
      }
      groups[folder].push(file);
    }
  });

  return groups;
}

// ============================================================================
// FILE TREE COMPONENT
// ============================================================================

function FileTree({
  files,
  selectedFile,
  onSelectFile,
}: {
  files: FileNode[];
  selectedFile: FileNode | null;
  onSelectFile: (file: FileNode) => void;
}) {
  const groupedFiles = groupFilesByFolder(files);
  const sortedFolders = Object.keys(groupedFiles).sort();

  return (
    <div className="p-2 text-sm">
      {sortedFolders.map((folder) => (
        <div key={folder} className="mb-2">
          {folder !== '/' && (
            <div className="flex items-center gap-1 px-2 py-1 text-gray-500 text-xs font-medium uppercase">
              <FolderTree className="w-3 h-3" />
              {folder}
            </div>
          )}
          {groupedFiles[folder].map((file) => (
            <button
              key={file.path}
              onClick={() => onSelectFile(file)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                selectedFile?.path === file.path
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileCode className="w-4 h-4 shrink-0" />
              <span className="truncate">{file.name}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// GO LIVE MODAL COMPONENT
// ============================================================================

function GoLiveModal({
  isOpen,
  onClose,
  jobId,
  appName,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  appName: string;
  onSuccess: (url: string, managedProjectId: string) => void;
}) {
  const [status, setStatus] = useState<ProvisioningStatus>('idle');
  const [currentStep, setCurrentStep] = useState<ProvisioningStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<ProvisioningStep>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [managedProjectId, setManagedProjectId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const STEPS: { id: ProvisioningStep; label: string; description: string; icon: React.ElementType }[] = [
    { id: 'database', label: 'Database', description: 'Provisioning PostgreSQL database', icon: Database },
    { id: 'auth', label: 'Authentication', description: 'Setting up Clerk auth', icon: Shield },
    { id: 'payments', label: 'Payments', description: 'Configuring Stripe', icon: DollarSign },
    { id: 'deploy', label: 'Deployment', description: 'Deploying to Vercel', icon: Globe },
  ];

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setCurrentStep(null);
      setCompletedSteps(new Set());
      setError(null);
      setLiveUrl(null);
    }
  }, [isOpen]);

  // Poll for status
  useEffect(() => {
    if (!managedProjectId || status !== 'provisioning') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/go-live?id=${managedProjectId}`);
        const data = await response.json();

        if (data.status === 'PREVIEW_READY' || data.status === 'DEPLOYED') {
          setLiveUrl(data.url);
          setStatus('ready');
          setCompletedSteps(new Set(['database', 'auth', 'payments', 'deploy']));
          clearInterval(pollInterval);
          onSuccess(data.url, managedProjectId);
        } else if (data.status === 'ERROR') {
          setError(data.error || 'Provisioning failed');
          setStatus('error');
          clearInterval(pollInterval);
        } else if (data.step) {
          const stepMap: Record<string, ProvisioningStep> = {
            database: 'database',
            auth: 'auth',
            payments: 'payments',
            preview: 'deploy',
            deploy: 'deploy',
          };
          const step = stepMap[data.step];
          if (step) {
            setCurrentStep(step);
            const stepOrder: ProvisioningStep[] = ['database', 'auth', 'payments', 'deploy'];
            const idx = stepOrder.indexOf(step);
            setCompletedSteps(new Set(stepOrder.slice(0, idx)));
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [managedProjectId, status, onSuccess]);

  const handleGoLive = async () => {
    setStatus('provisioning');
    setError(null);
    setCurrentStep('database');

    try {
      const response = await fetch('/api/go-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationJobId: jobId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start provisioning');
      }

      setManagedProjectId(data.managedProjectId);

      if (data.previewUrl) {
        setLiveUrl(data.previewUrl);
        setStatus('ready');
        setCompletedSteps(new Set(['database', 'auth', 'payments', 'deploy']));
        onSuccess(data.previewUrl, data.managedProjectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const handleCopyUrl = () => {
    if (liveUrl) {
      navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStepStatus = (stepId: ProvisioningStep): 'pending' | 'active' | 'complete' => {
    if (completedSteps.has(stepId)) return 'complete';
    if (currentStep === stepId) return 'active';
    return 'pending';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Go Live</h2>
              <p className="text-sm text-gray-400">{appName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'idle' && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  We&apos;ll automatically set up:
                </h3>
                <div className="space-y-3">
                  {STEPS.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <step.icon className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{step.label}</p>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-6">
                <Sparkles className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">
                  Takes about 2-3 minutes. No configuration needed.
                </span>
              </div>

              <button
                onClick={handleGoLive}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Go Live Now
              </button>
            </>
          )}

          {status === 'provisioning' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-green-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 animate-spin" />
                  <Zap className="absolute inset-0 m-auto w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Setting Up Your App</h3>
                <p className="text-sm text-gray-400">This takes about 2-3 minutes</p>
              </div>

              <div className="space-y-2">
                {STEPS.map((step) => {
                  const stepStatus = getStepStatus(step.id);
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        stepStatus === 'active'
                          ? 'bg-green-500/10 border border-green-500/20'
                          : stepStatus === 'complete'
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-white/5 border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          stepStatus === 'active'
                            ? 'bg-green-500/20'
                            : stepStatus === 'complete'
                            ? 'bg-emerald-500/20'
                            : 'bg-white/5'
                        }`}
                      >
                        {stepStatus === 'complete' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : stepStatus === 'active' ? (
                          <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                        ) : (
                          <step.icon className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            stepStatus === 'active'
                              ? 'text-green-300'
                              : stepStatus === 'complete'
                              ? 'text-emerald-300'
                              : 'text-gray-500'
                          }`}
                        >
                          {step.label}
                        </p>
                        {stepStatus === 'active' && (
                          <p className="text-xs text-green-400">{step.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {status === 'ready' && liveUrl && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Your App is Live! 🎉</h3>
              <p className="text-gray-400 text-sm mb-6">
                Database, auth, and payments are all configured.
              </p>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="flex-1 text-sm text-white truncate">{liveUrl}</span>
                <button
                  onClick={handleCopyUrl}
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex gap-3">
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open App
                </a>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Something Went Wrong</h3>
              <p className="text-red-400 text-sm mb-6">{error}</p>
              <button
                onClick={handleGoLive}
                className="py-2.5 px-6 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SANDBOX BANNER COMPONENT
// ============================================================================

function SandboxBanner({ onGoLive }: { onGoLive: () => void }) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-amber-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>
          <strong>Sandbox Preview:</strong> Database and auth are simulated. Go live to make it real.
        </span>
      </div>
      <button
        onClick={onGoLive}
        className="px-3 py-1 text-xs font-medium bg-amber-500 text-black rounded hover:bg-amber-400 transition-colors flex items-center gap-1"
      >
        <Zap className="w-3 h-3" />
        Go Live
      </button>
    </div>
  );
}

// ============================================================================
// LIVE BANNER COMPONENT
// ============================================================================

function LiveBanner({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <Check className="w-4 h-4" />
        <span>
          <strong>Live:</strong> Your app is running with real infrastructure.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-300 truncate max-w-[200px]">{url}</span>
        <button
          onClick={handleCopy}
          className="p-1 text-green-400 hover:text-green-300 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-green-400 hover:text-green-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIWorkspace({
  projectName,
  jobId,
  initialFiles,
}: AIWorkspaceProps) {
  // Parse initial files
  const initialFileNodes =
    initialFiles && initialFiles.length > 0
      ? initialFiles.map((f) => ({
          name: f.path.split('/').pop() || f.path,
          path: f.path,
          content: f.content,
          language: f.language || detectLanguageFromPath(f.path),
        }))
      : [];

  // =========================================================================
  // STATE
  // =========================================================================
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'terminal'>('preview');
  const [files, setFiles] = useState<FileNode[]>(initialFileNodes);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(
    initialFileNodes.find((f) => f.path === 'app/page.tsx') || initialFileNodes[0] || null
  );
  const [sandboxUrl, setSandboxUrl] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Preview mode state
  const [previewMode, setPreviewMode] = useState<PreviewMode>('sandbox');
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [managedProjectId, setManagedProjectId] = useState<string | null>(null);

  // Modal States
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showMonetizeModal, setShowMonetizeModal] = useState(false);

  // =========================================================================
  // REFS
  // =========================================================================
  const webContainerRef = useRef<WebContainer | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const actionRunnerRef = useRef<ActionRunner | null>(null);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // =========================================================================
  // TERMINAL OUTPUT HELPER
  // =========================================================================
  const addTerminalOutput = useCallback((line: string) => {
    setTerminalOutput((prev) => [...prev, line]);
    if (terminalRef.current) {
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, 0);
    }
  }, []);

  // =========================================================================
  // INITIALIZE WELCOME MESSAGE
  // =========================================================================
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Welcome to your workspace! Your app "${projectName}" is ready to preview.\n\nThis is a **sandbox preview** — database and auth are simulated. Click "Go Live" to provision real infrastructure.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [projectName, messages.length]);

  // =========================================================================
  // INITIALIZE WEBCONTAINER (WITH DOUBLE-INIT GUARD)
  // =========================================================================
  useEffect(() => {
    if (files.length === 0) return;

    if (isInitializingRef.current || hasInitializedRef.current) {
      console.log('⚠️ WebContainer init skipped (already initializing or initialized)');
      return;
    }

    const initContainer = async () => {
      isInitializingRef.current = true;

      try {
        addTerminalOutput('🚀 Initializing sandbox workspace...');

        const crossOriginIsolated =
          typeof window !== 'undefined' && window.crossOriginIsolated;
        addTerminalOutput(
          `🔒 Cross-Origin Isolated: ${crossOriginIsolated ? '✅ YES' : '❌ NO'}`
        );

        if (!crossOriginIsolated) {
          addTerminalOutput('⚠️ WebContainer requires cross-origin isolation');
          addTerminalOutput('💡 Tip: Use "Go Live" for a fully functional preview');
          isInitializingRef.current = false;
          return;
        }

        addTerminalOutput('⚡ Booting WebContainer...');
        const container = await WebContainerManager.boot();
        webContainerRef.current = container;

        actionRunnerRef.current = new ActionRunner(container, {
          onOutput: addTerminalOutput,
        });

        addTerminalOutput('✅ WebContainer initialized');
        addTerminalOutput('📦 Setting up project...');

        const template = getNextJsTemplate(projectName);
        const allFiles = mergeWithTemplate(
          template,
          files.map((f) => ({ path: f.path, content: f.content }))
        );

        for (const file of allFiles) {
          addTerminalOutput(`📄 ${file.path}`);
        }

        const actions: Action[] = allFiles.map((file) => ({
          type: 'file',
          filePath: file.path,
          content: file.content,
        }));

        actions.push({
          type: 'shell',
          content: 'npm install --silent --no-fund --no-audit --prefer-offline',
        });

        actions.push({
          type: 'start',
          content: 'npm run dev -- --port 3000 --hostname 0.0.0.0',
        });

        addTerminalOutput('🚀 Starting Next.js dev server...');
        addTerminalOutput('⏳ This may take 30-60 seconds...');
        setIsInstalling(true);

        container.on('server-ready', (port: number, url: string) => {
          addTerminalOutput(`✅ Server ready on port ${port}`);
          addTerminalOutput(`🌐 ${url}`);
          addTerminalOutput('');
          addTerminalOutput('📍 This is a SANDBOX preview.');
          addTerminalOutput('   Database and auth are simulated.');
          addTerminalOutput('   Click "Go Live" for real infrastructure.');
          setSandboxUrl(url);
          setIsInstalling(false);
          setIsContainerReady(true);
        });

        await actionRunnerRef.current.runActions(actions);
        hasInitializedRef.current = true;
      } catch (error) {
        console.error('WebContainer error:', error);
        addTerminalOutput(`❌ Error: ${error}`);
        addTerminalOutput('💡 Try using "Go Live" for a fully functional preview');
        setIsInstalling(false);
      } finally {
        isInitializingRef.current = false;
      }
    };

    initContainer();
  }, [files, projectName, addTerminalOutput]);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  const handleEditorChange = async (value: string | undefined) => {
    if (!selectedFile || !value) return;

    setFiles((prev) =>
      prev.map((f) => (f.path === selectedFile.path ? { ...f, content: value } : f))
    );
    setSelectedFile({ ...selectedFile, content: value });

    if (webContainerRef.current && isContainerReady) {
      try {
        await webContainerRef.current.fs.writeFile(selectedFile.path, value);
      } catch (error) {
        console.error('File write error:', error);
      }
    }
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    files.forEach((file) => zip.file(file.path, file.content));
    zip.file(
      'README.md',
      `# ${projectName}\n\nGenerated by AutoForge\n\n## Setup\n\n1. Install dependencies: \`npm install\`\n2. Set up environment variables (see .env.example)\n3. Run development server: \`npm run dev\`\n\n## Environment Variables\n\nThis app uses:\n- Clerk for authentication\n- Supabase for database\n- Stripe for payments (optional)\n\nSee .env.example for required variables.`
    );
    zip.file(
      '.env.example',
      `# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
`
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.zip`);
    addTerminalOutput('📦 Project downloaded');
  };

  const handleCopyUrl = () => {
    const url = previewMode === 'live' && liveUrl ? liveUrl : sandboxUrl;
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRestartServer = async () => {
    if (actionRunnerRef.current) {
      addTerminalOutput('🔄 Restarting server...');
      setIsInstalling(true);
      setSandboxUrl('');
      await actionRunnerRef.current.restartServer(
        'npm run dev -- --port 3000 --hostname 0.0.0.0'
      );
    }
  };

  const handleGoLiveSuccess = (url: string, projectId: string) => {
    setLiveUrl(url);
    setManagedProjectId(projectId);
    setPreviewMode('live');
    addTerminalOutput('');
    addTerminalOutput('🎉 Your app is now LIVE!');
    addTerminalOutput(`🌐 ${url}`);
    addTerminalOutput('');
    addTerminalOutput('✅ Database: Supabase (PostgreSQL)');
    addTerminalOutput('✅ Auth: Clerk');
    addTerminalOutput('✅ Payments: Stripe (test mode)');
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="h-screen flex bg-[#0A0A0B] text-white overflow-hidden">
      {/* ================================================================== */}
      {/* SIDEBAR */}
      {/* ================================================================== */}
      {sidebarOpen && (
        <div className="w-80 border-r border-white/10 flex flex-col bg-[#111113]">
          <div className="h-12 border-b border-white/10 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="font-medium text-sm">AI Assistant</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-gray-400 hover:text-white rounded"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-2 mx-4 mt-2 bg-white/5">
              <TabsTrigger value="chat" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="files" className="text-xs">
                <FolderTree className="w-3 h-3 mr-1" />
                Files
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`${
                      msg.role === 'user'
                        ? 'ml-8 bg-violet-500/20 rounded-lg p-3'
                        : 'mr-8 bg-white/5 rounded-lg p-3'
                    }`}
                  >
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {typeof window !== 'undefined' ? msg.timestamp.toLocaleTimeString() : ''}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask about your code..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                  />
                  <button className="p-2 bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="files" className="flex-1 overflow-y-auto m-0 p-0">
              <FileTree
                files={files}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ================================================================== */}
      {/* MAIN CONTENT */}
      {/* ================================================================== */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-[#111113]">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {(['preview', 'code', 'terminal'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'preview' && <Eye className="w-3 h-3 inline mr-1" />}
                {tab === 'code' && <Code className="w-3 h-3 inline mr-1" />}
                {tab === 'terminal' && <Terminal className="w-3 h-3 inline mr-1" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Preview Mode Toggle (only show when preview tab is active and live URL exists) */}
          {activeTab === 'preview' && liveUrl && (
            <>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('sandbox')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    previewMode === 'sandbox'
                      ? 'bg-amber-500 text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sandbox
                </button>
                <button
                  onClick={() => setPreviewMode('live')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    previewMode === 'live'
                      ? 'bg-green-500 text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Live
                </button>
              </div>
            </>
          )}

          <div className="w-px h-5 bg-white/10" />

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Download className="w-3 h-3" />
            Download
          </button>

          <button
            onClick={handleRestartServer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Restart
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Go Live Button - PRIMARY ACTION (when not yet live) */}
          {!liveUrl ? (
            <button
              onClick={() => setShowGoLiveModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/25"
            >
              <Zap className="w-3 h-3" />
              Go Live
            </button>
          ) : (
            <>
              {/* Deploy Button */}
              <button
                onClick={() => setShowDeployModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                <Rocket className="w-3 h-3" />
                Deploy
              </button>

              {/* Monetize Button */}
              <button
                onClick={() => setShowMonetizeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-500 hover:to-purple-500 transition-all"
              >
                <DollarSign className="w-3 h-3" />
                Monetize
              </button>
            </>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="h-full flex flex-col">
              {/* Mode Banner */}
              {previewMode === 'sandbox' && !liveUrl && (
                <SandboxBanner onGoLive={() => setShowGoLiveModal(true)} />
              )}
              {previewMode === 'sandbox' && liveUrl && (
                <SandboxBanner onGoLive={() => setPreviewMode('live')} />
              )}
              {previewMode === 'live' && liveUrl && <LiveBanner url={liveUrl} />}

              {/* URL Bar */}
              {(sandboxUrl || liveUrl) && (
                <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-[#111113]">
                  <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        previewMode === 'live' && liveUrl ? 'bg-green-400' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-xs text-gray-400 truncate">
                      {previewMode === 'live' && liveUrl ? liveUrl : sandboxUrl}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={previewMode === 'live' && liveUrl ? liveUrl : sandboxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Preview Content */}
              <div className="flex-1 bg-white">
                {isInstalling ? (
                  <div className="h-full flex flex-col items-center justify-center bg-[#1A1A1C]">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-4" />
                    <p className="text-gray-400 text-sm">Starting development server...</p>
                    <p className="text-gray-500 text-xs mt-1">This may take 30-60 seconds</p>
                  </div>
                ) : previewMode === 'live' && liveUrl ? (
                  <iframe
                    src={liveUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                  />
                ) : sandboxUrl ? (
                  <iframe
                    src={sandboxUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                    allow="cross-origin-isolated"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-[#1A1A1C]">
                    <Eye className="w-8 h-8 text-gray-600 mb-4" />
                    <p className="text-gray-400 text-sm">Preview will appear here</p>
                    <p className="text-gray-500 text-xs mt-2">
                      Or click &quot;Go Live&quot; to provision real infrastructure
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Code Tab */}
          {activeTab === 'code' && (
            <div className="h-full flex">
              <div className="w-48 border-r border-white/10 overflow-y-auto bg-[#111113]">
                <FileTree
                  files={files}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                />
              </div>

              <div className="flex-1">
                {selectedFile ? (
                  <Editor
                    height="100%"
                    language={selectedFile.language}
                    value={selectedFile.content}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      padding: { top: 16 },
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-[#1E1E1E]">
                    <p className="text-gray-500">Select a file to edit</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terminal Tab */}
          {activeTab === 'terminal' && (
            <div
              ref={terminalRef}
              className="h-full overflow-y-auto bg-[#0D0D0D] p-4 font-mono text-xs"
            >
              {terminalOutput.map((line, i) => (
                <div key={i} className="text-gray-300 whitespace-pre-wrap">
                  {line}
                </div>
              ))}
              {terminalOutput.length === 0 && (
                <div className="text-gray-600">Terminal output will appear here...</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODALS */}
      {/* ================================================================== */}
      <GoLiveModal
        isOpen={showGoLiveModal}
        onClose={() => setShowGoLiveModal(false)}
        jobId={jobId}
        appName={projectName}
        onSuccess={handleGoLiveSuccess}
      />

      <DeployModal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        jobId={jobId}
        appName={projectName}
        onDeploySuccess={(url: string) => {
          addTerminalOutput(`✅ Deployed to: ${url}`);
        }}
      />

      <MonetizeModal
        isOpen={showMonetizeModal}
        onClose={() => setShowMonetizeModal(false)}
        generationJobId={jobId}
        appName={projectName}
      />
    </div>
  );
}