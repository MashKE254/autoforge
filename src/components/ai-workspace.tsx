'use client';

/**
 * AI Workspace - Complete Implementation
 * 
 * File: src/components/ai-workspace.tsx
 * 
 * Features:
 * - Dark theme with subtle gradients
 * - WebContainer live preview
 * - Monaco code editor
 * - Terminal output
 * - Download as ZIP
 * - Deploy to Vercel button (NO Stripe required)
 * - Optional "Turn into Business" monetization
 * - Double-initialization guard fixed
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function detectLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
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
  };
  return map[ext || ''] || 'plaintext';
}

// ============================================================================
// FILE TREE COMPONENT
// ============================================================================

function FileTree({ 
  files, 
  selectedFile, 
  onSelectFile 
}: { 
  files: FileNode[]; 
  selectedFile: FileNode | null;
  onSelectFile: (file: FileNode) => void;
}) {
  const fileTree = files.reduce((acc, file) => {
    const parts = file.path.split('/');
    if (parts.length === 1) {
      acc.root = acc.root || [];
      acc.root.push(file);
    } else {
      const dir = parts.slice(0, -1).join('/');
      acc[dir] = acc[dir] || [];
      acc[dir].push(file);
    }
    return acc;
  }, {} as Record<string, FileNode[]>);

  const directories = Object.keys(fileTree).filter(d => d !== 'root').sort();

  return (
    <div className="text-sm">
      {fileTree.root?.map((file) => (
        <button
          key={file.path}
          onClick={() => onSelectFile(file)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-colors ${
            selectedFile?.path === file.path ? 'bg-white/10 text-white' : 'text-gray-400'
          }`}
        >
          <FileCode className="w-4 h-4 shrink-0" />
          <span className="truncate">{file.name}</span>
        </button>
      ))}

      {directories.map((dir) => (
        <div key={dir}>
          <div className="flex items-center gap-2 px-3 py-1.5 text-gray-500">
            <FolderTree className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">{dir}</span>
          </div>
          {fileTree[dir].map((file) => (
            <button
              key={file.path}
              onClick={() => onSelectFile(file)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 pl-7 text-left hover:bg-white/5 transition-colors ${
                selectedFile?.path === file.path ? 'bg-white/10 text-white' : 'text-gray-400'
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
// MAIN COMPONENT
// ============================================================================

export default function AIWorkspace({
  projectName,
  jobId,
  initialFiles,
}: AIWorkspaceProps) {
  const initialFileNodes = initialFiles && initialFiles.length > 0
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
    initialFileNodes.find(f => f.path === 'app/page.tsx') || initialFileNodes[0] || null
  );
  const [previewUrl, setPreviewUrl] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Modal States
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showMonetizeModal, setShowMonetizeModal] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

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
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
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
          content: `Welcome to your workspace! Your app "${projectName}" is ready to preview.`,
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
        addTerminalOutput('🚀 Initializing workspace...');
        
        const crossOriginIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
        addTerminalOutput(`🔒 Cross-Origin Isolated: ${crossOriginIsolated ? '✅ YES' : '❌ NO'}`);

        if (!crossOriginIsolated) {
          addTerminalOutput('⚠️ WebContainer requires cross-origin isolation');
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
        setIsInstalling(true);

        container.on('server-ready', (port: number, url: string) => {
          addTerminalOutput(`✅ Server ready on port ${port}`);
          addTerminalOutput(`🌐 ${url}`);
          setPreviewUrl(url);
          setIsInstalling(false);
          setIsContainerReady(true);
        });

        await actionRunnerRef.current.runActions(actions);
        hasInitializedRef.current = true;

      } catch (error) {
        console.error('WebContainer error:', error);
        addTerminalOutput(`❌ Error: ${error}`);
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
    zip.file('README.md', `# ${projectName}\n\nGenerated by AutoForge`);
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.zip`);
    addTerminalOutput('📦 Project downloaded');
  };

  const handleCopyUrl = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRestartServer = async () => {
    if (actionRunnerRef.current) {
      addTerminalOutput('🔄 Restarting server...');
      setIsInstalling(true);
      setPreviewUrl('');
      await actionRunnerRef.current.restartServer('npm run dev -- --port 3000 --hostname 0.0.0.0');
    }
  };

  const handleDeploySuccess = (url: string) => {
    setDeployedUrl(url);
    addTerminalOutput(`🎉 Deployed successfully: ${url}`);
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
            <TabsList className="w-full justify-start gap-2 p-2 bg-transparent border-b border-white/10">
              <TabsTrigger 
                value="chat" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 text-xs"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger 
                value="files" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 text-xs"
              >
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
                      msg.role === 'assistant'
                        ? 'mr-8 bg-white/5 rounded-lg p-3'
                        : 'ml-8 bg-violet-500/20 rounded-lg p-3'
                    }`}
                  >
                    <p className="text-sm text-gray-200">{msg.content}</p>
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

          {/* Deploy Button - PRIMARY ACTION */}
          <button
            onClick={() => setShowDeployModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/25"
          >
            <Rocket className="w-3 h-3" />
            Deploy
          </button>

          {/* Monetize Button - OPTIONAL */}
          {deployedUrl && (
            <button
              onClick={() => setShowMonetizeModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-500 hover:to-purple-500 transition-all"
            >
              <DollarSign className="w-3 h-3" />
              Monetize
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="h-full flex flex-col">
              {previewUrl && (
                <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-[#111113]">
                  <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-400 truncate">{previewUrl}</span>
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              <div className="flex-1 bg-white">
                {isInstalling ? (
                  <div className="h-full flex flex-col items-center justify-center bg-[#1A1A1C]">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-4" />
                    <p className="text-gray-400 text-sm">Starting development server...</p>
                    <p className="text-gray-500 text-xs mt-1">This may take 30-60 seconds</p>
                  </div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                    allow="cross-origin-isolated"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-[#1A1A1C]">
                    <Eye className="w-8 h-8 text-gray-600 mb-4" />
                    <p className="text-gray-400 text-sm">Preview will appear here</p>
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
      <DeployModal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        jobId={jobId}
        appName={projectName}
        onDeploySuccess={handleDeploySuccess}
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