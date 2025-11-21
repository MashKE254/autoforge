'use client';

// SharedPreview Component
// Loads generated app in WebContainer for anyone with the link

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebContainerProcess, FileSystemTree, DirectoryNode } from '@webcontainer/api';
import webContainerManager from '../lib/webcontainer-manager';
import { Loader2, ExternalLink, Clock, Eye, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface SharedPreviewProps {
  files: Array<{ path: string; content: string; language: string }>;
  projectName: string;
  expiresAt: Date;
  viewCount?: number;
}

export default function SharedPreview({
  files,
  projectName,
  expiresAt,
  viewCount = 0,
}: SharedPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  const addTerminalOutput = (line: string) => {
    setTerminalOutput(prev => [...prev, line]);
  };

  const buildFileSystemTree = useCallback((): FileSystemTree => {
    const tree: FileSystemTree = {};
    files.forEach(file => {
      const parts = file.path.split('/');
      let current: FileSystemTree = tree;
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // Last part is a file
          current[part] = { file: { contents: file.content } };
        } else {
          // Intermediate parts are directories
          if (!current[part]) {
            current[part] = { directory: {} };
          }
          // Navigate into the directory
          const node = current[part] as DirectoryNode;
          current = node.directory;
        }
      });
    });
    return tree;
  }, [files]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  useEffect(() => {
    let mounted = true;
    let serverProcess: WebContainerProcess | null = null;

    async function init() {
      try {
        setIsLoading(true);
        addTerminalOutput('🚀 BuildNow Shareable Preview');
        addTerminalOutput(`📦 Loading ${files.length} files...`);
        addTerminalOutput('');

        // Step 1: Boot WebContainer
        setLoadingStep('Booting WebContainer...');
        addTerminalOutput('⚡ Initializing WebContainer...');

        const container = await webContainerManager.boot();
        if (!mounted) return;

        addTerminalOutput('✅ WebContainer ready');

        // Step 2: Mount files
        setLoadingStep('Mounting files...');
        addTerminalOutput('📁 Mounting file system...');
        
        const tree = buildFileSystemTree();
        await container.mount(tree);
        
        addTerminalOutput(`✅ Mounted ${files.length} files`);
        addTerminalOutput('');

        // Step 3: Install dependencies
        setLoadingStep('Installing dependencies...');
        addTerminalOutput('📦 Installing npm packages...');
        addTerminalOutput('⏳ This may take 30-60 seconds...');
        
        const installProcess = await container.spawn('npm', ['install']);
        
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (mounted) {
                addTerminalOutput(data);
              }
            },
          })
        );

        const installExitCode = await installProcess.exit;
        
        if (installExitCode !== 0) {
          throw new Error('npm install failed');
        }

        addTerminalOutput('✅ Dependencies installed');
        addTerminalOutput('');

        // Step 4: Start dev server
        setLoadingStep('Starting dev server...');
        addTerminalOutput('🚀 Starting Next.js dev server...');

        serverProcess = await container.spawn('npm', ['run', 'dev']);

        if (serverProcess) {
          serverProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                if (mounted) {
                  addTerminalOutput(data);
                }
              },
            })
          );
        }

        // Listen for server ready
        container.on('server-ready', (port: number, url: string) => {
          if (port === 3000 && mounted) {
            addTerminalOutput('');
            addTerminalOutput(`✅ Server ready at ${url}`);
            addTerminalOutput('🎉 Preview is now live!');
            setPreviewUrl(url);
            setIsLoading(false);
          }
        });

        // Timeout after 90 seconds
        setTimeout(() => {
          if (!previewUrl && mounted) {
            addTerminalOutput('');
            addTerminalOutput('⚠️ Server startup taking longer than expected');
            addTerminalOutput('💡 Try refreshing the page');
          }
        }, 90000);

      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load preview';
          setError(errorMessage);
          addTerminalOutput('');
          addTerminalOutput(`❌ Error: ${errorMessage}`);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (serverProcess) {
        try {
          serverProcess.kill();
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }
    };
  }, [buildFileSystemTree, files.length, previewUrl]);

  // Calculate time remaining
  const timeRemaining = Math.max(
    0,
    new Date(expiresAt).getTime() - Date.now()
  );
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">{projectName}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>
                  Expires in {hoursRemaining}h {minutesRemaining}m
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>{viewCount + 1} views</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Powered by BuildNow • Shared Preview
          </p>
        </div>

        {previewUrl && (
          <Button
            onClick={() => window.open(previewUrl, '_blank')}
            variant="outline"
            size="sm"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Preview */}
        <div className="flex-1 flex flex-col">
          {isLoading && (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-center max-w-md mx-auto p-8">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {loadingStep}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Setting up your preview environment
                </p>
                <div className="bg-white rounded-lg p-4 text-left">
                  <p className="text-xs text-gray-500 mb-2">Progress:</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={loadingStep.includes('WebContainer') ? 'text-blue-600' : 'text-green-600'}>
                        {loadingStep.includes('WebContainer') ? '⏳' : '✅'}
                      </span>
                      <span>Boot WebContainer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={loadingStep.includes('files') ? 'text-blue-600' : loadingStep.includes('dependencies') || loadingStep.includes('dev server') ? 'text-green-600' : 'text-gray-400'}>
                        {loadingStep.includes('files') ? '⏳' : loadingStep.includes('dependencies') || loadingStep.includes('dev server') ? '✅' : '○'}
                      </span>
                      <span>Mount {files.length} files</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={loadingStep.includes('dependencies') ? 'text-blue-600' : loadingStep.includes('dev server') ? 'text-green-600' : 'text-gray-400'}>
                        {loadingStep.includes('dependencies') ? '⏳' : loadingStep.includes('dev server') ? '✅' : '○'}
                      </span>
                      <span>Install dependencies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={loadingStep.includes('dev server') ? 'text-blue-600' : 'text-gray-400'}>
                        {loadingStep.includes('dev server') ? '⏳' : '○'}
                      </span>
                      <span>Start dev server</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Preview Failed
                </h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          )}
        </div>

        {/* Terminal Sidebar */}
        <div className="w-96 border-l bg-black flex flex-col">
          <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-green-400">Terminal</span>
            <span className="text-xs text-gray-500">{files.length} files</span>
          </div>
          <div
            ref={terminalRef}
            className="flex-1 overflow-auto p-4 font-mono text-xs text-green-400 leading-relaxed"
          >
            {terminalOutput.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-words">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}