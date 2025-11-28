"use client";
/**
 * AI Workspace - Bolt.new Style Implementation
 * 
 * File: src/components/ai-workspace.tsx
 * 
 * This is a complete rewrite using the bolt.new architecture:
 * - ActionRunner instead of shell scripts
 * - Templates to ensure all files exist
 * - Direct npm command spawning
 * 
 * Note: Turbopack is NOT used because WebContainer doesn't support
 * the native WASM bindings required by @next/swc-wasm-nodejs
 * 
 * All original features preserved:
 * - Chat sidebar with AI assistant
 * - Code editor with Monaco
 * - Live preview with WebContainer
 * - Terminal output
 * - Download, Share, Deploy
 */

import { useState, useRef, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Maximize2,
  Minimize2,
  Play,
  Terminal,
  AlertCircle,
  CheckCircle2,
  StopCircle,
  Trash2,
  Zap,
  Rocket,
  WifiOff,
  Share2,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { PlanStep } from "./job-plan";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { WebContainer } from "@webcontainer/api";
import WebContainerManager from "@/lib/webcontainer-manager";

// ✅ NEW: Import bolt.new style modules
import { ActionRunner, Action } from "@/lib/action-runner";
import { 
  getNextJsTemplate, 
  mergeWithTemplate,
  validateProjectFiles
} from "@/lib/templates";

// ============================================================================
// TYPES
// ============================================================================

interface InitialFile {
  path: string;
  content: string;
  language: string;
}

interface AIWorkspaceProps {
  plan: PlanStep[];
  projectName: string;
  jobId: string;
  initialFiles?: InitialFile[];
}

interface Message {
  role: "user" | "assistant";
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
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    prisma: "prisma",
    md: "markdown",
    env: "plaintext",
    html: "html",
    mjs: "javascript",
    yml: "yaml",
    yaml: "yaml",
  };
  return map[ext || ""] || "plaintext";
}

function sanitizeFileContent(filepath: string, content: string): string {
  const ext = filepath.split(".").pop()?.toLowerCase();
  
  // Remove markdown code blocks
  content = content.replace(/```(?:typescript|javascript|tsx|jsx|json|css|html|prisma)?\n?/g, "");
  content = content.replace(/```\s*$/g, "");
  
  // Remove file markers
  content = content.replace(/<!--\s*file:\s*[^\n]+\s*-->\s*\n?/g, "");
  
  // Clean up JSON
  if (ext === "json") {
    try {
      const firstBrace = Math.min(
        content.indexOf("{") >= 0 ? content.indexOf("{") : Infinity,
        content.indexOf("[") >= 0 ? content.indexOf("[") : Infinity
      );
      const lastBrace = Math.max(content.lastIndexOf("}"), content.lastIndexOf("]"));
      if (firstBrace !== Infinity && lastBrace >= 0) {
        const extracted = content.substring(firstBrace, lastBrace + 1);
        JSON.parse(extracted); // Validate
        return extracted;
      }
    } catch (e) {
      // Return as-is if can't parse
    }
  }
  
  return content.trim();
}

function extractFilesFromStep(code: string): FileNode[] {
  const files: FileNode[] = [];
  
  // Strategy 1: XML-style markers <!-- file: path -->
  const xmlPattern = /<!--\s*file:\s*([^\n]+?)\s*-->\s*\n([\s\S]*?)(?=<!--\s*file:|$)/gi;
  
  let match;
  while ((match = xmlPattern.exec(code)) !== null) {
    const filepath = match[1].trim();
    let content = match[2].trim();
    content = content.replace(/<!--\s*file:.*?-->\s*$/gi, '').trim();
    content = content.replace(/^```[a-z]*\n?/gm, '').replace(/\n?```$/gm, '').trim();
    
    if (content.length > 10) {
      files.push({
        name: filepath.split("/").pop() || filepath,
        path: filepath,
        content: sanitizeFileContent(filepath, content),
        language: detectLanguageFromPath(filepath),
      });
    }
  }
  
  // Strategy 2: Code fences with filepath ```typescript app/page.tsx
  if (files.length === 0) {
    const fencePattern = /```(?:typescript|javascript|tsx|jsx|json|css|html|txt|yaml|yml|mjs|ts|js)\s+([^\n]+\.[a-zA-Z0-9]+)\s*\n([\s\S]*?)```/g;
    
    while ((match = fencePattern.exec(code)) !== null) {
      const filepath = match[1].trim();
      const content = match[2].trim();
      
      if (content.length > 10) {
        files.push({
          name: filepath.split("/").pop() || filepath,
          path: filepath,
          content: sanitizeFileContent(filepath, content),
          language: detectLanguageFromPath(filepath),
        });
      }
    }
  }
  
  return files;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIWorkspace({ 
  plan, 
  projectName, 
  jobId, 
  initialFiles 
}: AIWorkspaceProps) {
  // ========================================
  // STATE
  // ========================================
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `🚀 **AutoForge AI Workspace**

I can help you build and modify your application!

Your ${plan.length}-step implementation plan is ready.

Ask me to:
• Add new features
• Fix bugs
• Modify components
• Improve styling`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // File state
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  
  // UI state
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // WebContainer state
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [containerError, setContainerError] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  
  // Feature state
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCreatingPreview, setIsCreatingPreview] = useState(false);
  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [missingFiles, setMissingFiles] = useState<string[]>([]);

  // ========================================
  // REFS
  // ========================================
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const initAttempted = useRef(false);
  const filesMountedRef = useRef(false);
  
  // ✅ NEW: ActionRunner ref
  const actionRunnerRef = useRef<ActionRunner | null>(null);

  // ========================================
  // TERMINAL OUTPUT
  // ========================================
  
  const addTerminalOutput = useCallback((text: string) => {
    setTerminalOutput(prev => {
      const newOutput = [...prev, text];
      return newOutput.slice(-300); // Keep last 300 lines
    });
    
    // Auto-scroll
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  // ========================================
  // CROSS-ORIGIN CHECK
  // ========================================
  
  const checkCrossOriginIsolation = useCallback(() => {
    if (typeof window !== "undefined") {
      const isIsolated = window.crossOriginIsolated;
      addTerminalOutput(`🔒 Cross-Origin Isolated: ${isIsolated ? "✅ YES" : "❌ NO"}`);
      
      if (!isIsolated) {
        addTerminalOutput("");
        addTerminalOutput("⚠️ WebContainer requires Cross-Origin Isolation");
        addTerminalOutput("📋 Add headers in middleware.ts and next.config.ts");
        setContainerError("Cross-Origin Isolation not enabled. Check terminal for setup.");
        return false;
      }
      return true;
    }
    return false;
  }, [addTerminalOutput]);

  // ========================================
  // ✅ WEBCONTAINER INITIALIZATION (Bolt.new Style)
  // ========================================
  
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    async function initContainer() {
      try {
        addTerminalOutput("🚀 Initializing AutoForge Workspace...");
        
        if (!checkCrossOriginIsolation()) {
          return;
        }

        // Reuse existing instance if available
        if (WebContainerManager.instance !== null) {
          addTerminalOutput("♻️ Reusing existing WebContainer...");
          const existingInstance = WebContainerManager.instance;
          if (existingInstance) {
            setWebContainer(existingInstance);
            setIsContainerReady(true);
            setContainerError(null);
            addTerminalOutput("✅ WebContainer ready!");
            return;
          }
        }

        addTerminalOutput("⚡ Booting WebContainer...");
        const container = await WebContainerManager.boot();
        
        // ✅ CRITICAL: Register server-ready listener IMMEDIATELY
        container.on('server-ready', (port: number, url: string) => {
          console.log(`🎯 server-ready: port=${port}, url=${url}`);
          if (port === 3000) {
            addTerminalOutput(`✅ Server ready at: ${url}`);
            addTerminalOutput(`🎉 ${projectName} is live!`);
            setPreviewUrl(url);
            setIsInstalling(false);
          }
        });
        
        addTerminalOutput("👂 Server-ready listener registered");
        
        // ✅ NEW: Create ActionRunner (bolt.new style)
        actionRunnerRef.current = new ActionRunner(container, {
          onOutput: addTerminalOutput,
          onServerReady: (url) => {
            setPreviewUrl(url);
            setIsInstalling(false);
          },
          onError: (error) => {
            addTerminalOutput(`❌ Error: ${error.message}`);
          }
        });
        
        setWebContainer(container);
        setIsContainerReady(true);
        setContainerError(null);
        addTerminalOutput("✅ WebContainer initialized");
        
      } catch (error) {
        console.error("WebContainer initialization failed:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        addTerminalOutput(`❌ Initialization failed: ${errorMessage}`);
        
        if (errorMessage.includes("Out of memory") || errorMessage.includes("WebAssembly")) {
          setContainerError("Memory limit reached. Close other tabs and refresh.");
        } else if (errorMessage.includes("single WebContainer")) {
          setContainerError("WebContainer conflict. Refresh page (F5).");
        } else if (errorMessage.includes("not supported")) {
          setContainerError("Browser not supported. Use Chrome 84+, Edge 84+, or Safari 15.2+");
        } else {
          setContainerError(errorMessage);
        }
      }
    }

    initContainer();
  }, [addTerminalOutput, checkCrossOriginIsolation, projectName]);

  // ========================================
  // ✅ FILE EXTRACTION & TEMPLATE MERGE (Bolt.new Style)
  // ========================================
  
  useEffect(() => {
    let extractedFiles: FileNode[] = [];
    
    // Get files from database or extract from plan
    if (initialFiles && initialFiles.length > 0) {
      addTerminalOutput(`📁 Loading ${initialFiles.length} files from database...`);
      
      extractedFiles = initialFiles.map(f => ({
        name: f.path.split("/").pop() || f.path,
        path: f.path,
        content: f.content,
        language: f.language || detectLanguageFromPath(f.path),
      }));
    } else {
      addTerminalOutput("📝 Extracting files from plan...");
      
      plan.forEach((step) => {
        if (step.code && step.status === "completed") {
          const stepFiles = extractFilesFromStep(step.code);
          stepFiles.forEach(file => {
            if (!extractedFiles.find(f => f.path === file.path)) {
              extractedFiles.push(file);
            }
          });
        }
      });
      
      addTerminalOutput(`   Found ${extractedFiles.length} files in plan`);
    }

    // ✅ NEW: Merge with template to ensure all essential files exist
    const template = getNextJsTemplate(projectName);
    const mergedTemplateFiles = mergeWithTemplate(
      template,
      extractedFiles.map(f => ({ path: f.path, content: f.content }))
    );
    
    // Convert back to FileNode format
    const finalFiles: FileNode[] = mergedTemplateFiles.map(f => ({
      name: f.path.split('/').pop() || f.path,
      path: f.path,
      content: f.content,
      language: detectLanguageFromPath(f.path),
    }));
    
    // Check for any still-missing files
    const missing = validateProjectFiles(mergedTemplateFiles);
    if (missing.length > 0) {
      setMissingFiles(missing);
      addTerminalOutput(`⚠️ Still missing: ${missing.join(', ')}`);
    } else {
      setMissingFiles([]);
    }
    
    addTerminalOutput(`✅ ${finalFiles.length} files ready`);

    setFiles(finalFiles);
    
    // Select a good default file
    if (finalFiles.length > 0) {
      const pageFile = finalFiles.find(f => f.path === 'app/page.tsx');
      const layoutFile = finalFiles.find(f => f.path === 'app/layout.tsx');
      setSelectedFile(pageFile || layoutFile || finalFiles[0]);
    }
  }, [plan, projectName, initialFiles, addTerminalOutput]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ========================================
  // ✅ MOUNT & START (Bolt.new Style - Using ActionRunner + Turbopack)
  // ========================================
  
  useEffect(() => {
    if (!webContainer || !isContainerReady || files.length === 0) return;
    if (filesMountedRef.current) return;
    if (!actionRunnerRef.current) return;

    async function mountAndStart() {
      filesMountedRef.current = true;
      setIsInstalling(true);
      
      try {
        addTerminalOutput("");
        addTerminalOutput("📦 Setting up project...");
        addTerminalOutput("");
        
        // ✅ NEW: Build actions array (bolt.new style)
        const actions: Action[] = [];
        
        // 1. File actions - create all files
        for (const file of files) {
          actions.push({
            type: 'file',
            filePath: file.path,
            content: file.content,
          });
        }
        
        // 2. Install dependencies (with prefer-offline for speed)
        actions.push({
          type: 'shell',
          content: 'npm install --silent --no-fund --no-audit --prefer-offline',
        });
        
        // 3. Start dev server (Note: Turbopack doesn't work in WebContainer due to WASM limitations)
        actions.push({
          type: 'start',
          content: 'npm run dev -- --port 3000 --hostname 0.0.0.0',
        });
        
        addTerminalOutput("🚀 Starting Next.js dev server...");
        
        // ✅ Run all actions through ActionRunner
        await actionRunnerRef.current!.runActions(actions);
        
      } catch (error) {
        addTerminalOutput(`❌ Setup failed: ${error}`);
        filesMountedRef.current = false;
        setIsInstalling(false);
      }
    }

    mountAndStart();
  }, [webContainer, isContainerReady, files, addTerminalOutput]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleStopServer = () => {
    if (actionRunnerRef.current) {
      actionRunnerRef.current.stopServer();
      setPreviewUrl("");
    }
  };

  const handleRestartServer = async () => {
    if (actionRunnerRef.current) {
      addTerminalOutput("🔄 Restarting server...");
      setIsInstalling(true);
      setPreviewUrl("");
      await actionRunnerRef.current.restartServer('npm run dev -- --port 3000 --hostname 0.0.0.0');
    }
  };

  const handleClearTerminal = () => {
    setTerminalOutput([]);
    addTerminalOutput("🧹 Terminal cleared");
  };

  const handleAutoFix = async () => {
    if (!actionRunnerRef.current || !webContainer) {
      addTerminalOutput("❌ WebContainer not ready");
      return;
    }
    
    addTerminalOutput("🔧 Running diagnostics...");
    
    // Re-sync all files to WebContainer
    for (const file of files) {
      try {
        const dir = file.path.split('/').slice(0, -1).join('/');
        if (dir) {
          await webContainer.fs.mkdir(dir, { recursive: true }).catch(() => {});
        }
        await webContainer.fs.writeFile(file.path, file.content);
      } catch (e) {
        // Ignore individual file errors
      }
    }
    
    addTerminalOutput("✅ Files synced to WebContainer");
    addTerminalOutput("💡 Click Restart to apply changes");
  };

  const handleEditorChange = async (value: string | undefined) => {
    if (!selectedFile || !value) return;

    // Update local state
    setFiles((prevFiles) =>
      prevFiles.map((f) =>
        f.path === selectedFile.path ? { ...f, content: value } : f
      )
    );
    setSelectedFile({ ...selectedFile, content: value });

    // Sync to WebContainer immediately
    if (webContainer && isContainerReady) {
      try {
        await webContainer.fs.writeFile(selectedFile.path, value);
      } catch (error) {
        console.error("File write error:", error);
      }
    }
  };

  const handleDownload = async () => {
    const zip = new JSZip();

    files.forEach((file) => {
      zip.file(file.path, file.content);
    });

    // Add README
    zip.file("README.md", `# ${projectName}

🚀 **Built with AutoForge** - AI-Powered Code Generation

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view your application.

## Project Structure

\`\`\`
${files.map(f => f.path).join("\n")}
\`\`\`

## Features

- ✅ Production-ready Next.js application
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for styling

Generated by AutoForge
`);

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.zip`);
    addTerminalOutput(`📦 Project downloaded as ZIP`);
  };

  const handleCreateShareablePreview = async () => {
    try {
      setIsCreatingPreview(true);
      addTerminalOutput("🔗 Creating shareable preview...");

      const response = await fetch('/api/preview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create preview');
      }

      const data = await response.json();
      setShareableUrl(data.shareableUrl);

      addTerminalOutput(`✅ Shareable link: ${data.shareableUrl}`);
      
      try {
        await navigator.clipboard.writeText(data.shareableUrl);
        addTerminalOutput("📋 Copied to clipboard!");
      } catch {
        // Clipboard might not be available
      }
    } catch (error) {
      addTerminalOutput(`❌ Failed: ${error}`);
    } finally {
      setIsCreatingPreview(false);
    }
  };

  const handleDeployToProduction = async () => {
    try {
      setIsDeploying(true);
      addTerminalOutput("🚀 Starting deployment to Vercel...");

      const response = await fetch('/api/deploy/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, envVars: {} }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Deployment failed');
      }

      const data = await response.json();
      
      addTerminalOutput(`✅ Deployment started!`);
      addTerminalOutput(`🆔 ID: ${data.deploymentId}`);
      addTerminalOutput(`⏳ Building... (2-3 minutes)`);

      // Poll for completion
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));
        
        const statusRes = await fetch(`/api/deploy/vercel?jobId=${jobId}`);
        const statusData = await statusRes.json();
        
        if (statusData.deployment?.status === 'ready') {
          setDeploymentUrl(data.url);
          addTerminalOutput(`🎉 DEPLOYED: ${data.url}`);
          return;
        }
        
        if (statusData.deployment?.status === 'error') {
          throw new Error('Build failed');
        }
        
        addTerminalOutput(`⏳ Building... (${i + 1}/60)`);
      }
      
      throw new Error('Deployment timeout');
    } catch (error) {
      addTerminalOutput(`❌ Deployment failed: ${error}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/ai/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          files: files.map(f => ({ path: f.path, content: f.content })),
          selectedFile: selectedFile?.path,
          jobId,
        }),
      });

      if (!response.ok) {
        throw new Error("AI service unavailable");
      }

      const data = await response.json();

      const aiMessage: Message = {
        role: "assistant",
        content: data.message || "Done!",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Apply file updates
      if (data.updatedFiles && Array.isArray(data.updatedFiles)) {
        setFiles((prevFiles) => {
          const newFiles = [...prevFiles];
          
          data.updatedFiles.forEach((update: { path: string; content: string }) => {
            const fileIndex = newFiles.findIndex((f) => f.path === update.path);
            if (fileIndex >= 0) {
              newFiles[fileIndex].content = update.content;
            } else {
              newFiles.push({
                name: update.path.split("/").pop() || update.path,
                path: update.path,
                content: update.content,
                language: detectLanguageFromPath(update.path),
              });
            }
            
            // Sync to WebContainer
            if (webContainer && isContainerReady) {
              webContainer.fs.writeFile(update.path, update.content).catch(console.error);
            }
          });
          
          return newFiles;
        });
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I'm having trouble. You can edit files directly in the Code tab.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      className={`flex flex-col bg-white dark:bg-gray-950 ${
        isFullscreen ? "fixed inset-0 z-50" : "h-[800px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AutoForge AI Workspace
          </h2>
          {isContainerReady && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-3 w-3" />
              <span>Ready</span>
            </div>
          )}
          {containerError && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-3 w-3" />
              <span>Error</span>
            </div>
          )}
          {previewUrl && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
              <Eye className="h-3 w-3" />
              <span>Preview Live</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            {files.length} files • {plan.length} steps
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)}>
            {showChat ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {missingFiles.length > 0 && (
        <Alert variant="destructive" className="mx-3 mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Files</AlertTitle>
          <AlertDescription>
            {missingFiles.join(", ")} - Templates added defaults.
          </AlertDescription>
        </Alert>
      )}

      {shareableUrl && (
        <div className="mx-3 mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-1">
                🔗 Shareable Preview Link
              </p>
              <code className="text-xs text-purple-700 dark:text-purple-400 block truncate">
                {shareableUrl}
              </code>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(shareableUrl)}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => window.open(shareableUrl, '_blank')}>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {deploymentUrl && (
        <div className="mx-3 mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-1">
                🎉 Deployed!
              </p>
              <code className="text-xs text-green-700 dark:text-green-400 block truncate">
                {deploymentUrl}
              </code>
            </div>
            <Button size="sm" variant="ghost" onClick={() => window.open(deploymentUrl, '_blank')}>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">AI Assistant</span>
              </div>
            </div>
            <ScrollArea className="flex-1 p-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`mb-4 ${msg.role === "user" ? "text-right" : ""}`}>
                  <div
                    className={`inline-block max-w-[90%] p-3 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className="p-3 border-t border-gray-200 dark:border-gray-800">
              <Textarea
                placeholder="Ask AI to modify code..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="min-h-[60px] text-sm resize-none mb-2"
              />
              <Button className="w-full" onClick={handleSendMessage} disabled={isProcessing || !input.trim()}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {isProcessing ? "Processing..." : "Send"}
              </Button>
            </div>
          </div>
        )}

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="preview" className="flex-1 flex flex-col">
            <div className="border-b border-gray-200 dark:border-gray-800 px-3 flex items-center justify-between">
              <TabsList className="h-10">
                <TabsTrigger value="preview" className="gap-1">
                  <Eye className="h-3 w-3" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="terminal" className="gap-1">
                  <Terminal className="h-3 w-3" />
                  Terminal
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-1">
                  <Code className="h-3 w-3" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-1">
                  <FileCode className="h-3 w-3" />
                  Files
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-2 py-2">
                <Button size="sm" variant="outline" onClick={handleCreateShareablePreview} disabled={isCreatingPreview}>
                  {isCreatingPreview ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Share2 className="h-3 w-3 mr-1" />}
                  Share
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="outline" onClick={handleDeployToProduction} disabled={isDeploying}>
                  {isDeploying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Rocket className="h-3 w-3 mr-1" />}
                  Deploy
                </Button>
              </div>
            </div>

            {/* Preview Tab */}
            <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
              <div className="h-full flex flex-col">
                {isInstalling && (
                  <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Starting Development Server</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Installing dependencies and starting Next.js...
                      </p>
                      <p className="text-xs text-gray-500">
                        This may take 30-60 seconds
                      </p>
                    </div>
                  </div>
                )}
                {previewUrl && !isInstalling && (
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                )}
                {!isInstalling && !previewUrl && containerError && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md">
                      <WifiOff className="h-12 w-12 text-red-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">WebContainer Error</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{containerError}</p>
                      <Button onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-2" />
                        Download & Run Locally
                      </Button>
                    </div>
                  </div>
                )}
                {!isInstalling && !previewUrl && !containerError && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Waiting for server...</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Terminal Tab - FIXED SCROLLING */}
            <TabsContent value="terminal" className="flex-1 m-0 overflow-hidden relative">
              <div className="absolute inset-0 flex flex-col bg-black">
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-green-400">AutoForge Terminal</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={handleClearTerminal} className="h-7 text-gray-400 hover:text-white">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleStopServer} className="h-7 text-red-400 hover:text-red-300">
                      <StopCircle className="h-3 w-3 mr-1" />
                      Stop
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleRestartServer} className="h-7 text-green-400 hover:text-green-300">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Restart
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleAutoFix} className="h-7 text-yellow-400 hover:text-yellow-300">
                      <Zap className="h-3 w-3 mr-1" />
                      Fix
                    </Button>
                  </div>
                </div>
                <div 
                  ref={terminalRef} 
                  className="flex-1 overflow-y-auto overflow-x-hidden p-4 font-mono text-xs text-green-400 leading-relaxed min-h-0"
                >
                  {terminalOutput.map((line, idx) => (
                    <div key={idx} className="whitespace-pre-wrap break-words">{line}</div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Code Tab */}
            <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
              <div className="h-full flex">
                <div className="w-48 border-r border-gray-200 dark:border-gray-800 overflow-auto">
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-500 mb-2">FILES</p>
                    {files.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          selectedFile?.path === file.path
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : ""
                        }`}
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>
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
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Select a file to edit
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="flex-1 m-0 overflow-auto p-4">
              <div className="space-y-2">
                <h3 className="font-medium mb-3">Project Files ({files.length})</h3>
                {files.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-mono">{file.path}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {(file.content.length / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}