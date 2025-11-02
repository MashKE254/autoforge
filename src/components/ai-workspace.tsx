"use client";

import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  Code,
  Eye,
  Download,
  RefreshCw,
  Sparkles,
  FileCode,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { PlanStep } from "./job-plan";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface AIWorkspaceProps {
  plan: PlanStep[];
  projectName: string;
  jobId: string;
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

export default function AIWorkspace({ plan, projectName, jobId }: AIWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `👋 Hi! I'm your AI coding assistant. I can help you:\n\n✨ Modify any part of your app\n🎨 Change styling and layout\n🔧 Fix bugs and errors\n📦 Add new features\n\nJust tell me what you'd like to change!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [showChat, setShowChat] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Convert plan to file structure
  useEffect(() => {
    const fileList: FileNode[] = [];

    const detectLanguage = (filename: string): string => {
      const ext = filename.split(".").pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        ts: "typescript",
        tsx: "typescript",
        js: "javascript",
        jsx: "javascript",
        json: "json",
        css: "css",
        html: "html",
      };
      return languageMap[ext || ""] || "plaintext";
    };

          plan.forEach((step) => {
      if (step.code && step.status === "completed") {
        const filename = step.title
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        const code = step.code.trim();
        let filepath = "";

        // Smart file detection
        if (code.includes('"dependencies"')) {
          filepath = "package.json";
        } else if (code.includes("@prisma") || code.includes("model ")) {
          filepath = "schema.prisma";
        } else if (step.title.toLowerCase().includes("component")) {
          filepath = `${filename}.tsx`;
        } else if (step.title.toLowerCase().includes("api")) {
          filepath = `${filename}.ts`;
        } else {
          filepath = `${filename}.tsx`;
        }

        fileList.push({
          name: filepath.split("/").pop() || filename,
          path: filepath,
          content: step.code,
          language: detectLanguage(filepath),
        });
      }
    });

    setFiles(fileList);
    if (fileList.length > 0 && !selectedFile) {
      setSelectedFile(fileList[0]);
    }
  }, [plan, selectedFile]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate preview HTML
  const generatePreviewHTML = () => {
    const componentFile = files.find((f) =>
      f.path.toLowerCase().includes("component")
    );

    if (!componentFile) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>body { margin: 0; padding: 20px; font-family: system-ui; }</style>
          </head>
          <body>
            <div class="flex items-center justify-center min-h-screen">
              <div class="text-center">
                <h1 class="text-2xl font-bold mb-4">Preview Not Available</h1>
                <p class="text-gray-600">Select a component file to preview</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    // Extract JSX from component
    const jsxContent = componentFile.content;

    // Simple React component rendering (for demo purposes)

    // Simple React component rendering (for demo purposes)
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            ${jsxContent}
            
            // Try to render the component
            try {
              const root = ReactDOM.createRoot(document.getElementById('root'));
              // Find the default export or main component
              const ComponentToRender = typeof Component !== 'undefined' ? Component : 
                                        typeof App !== 'undefined' ? App :
                                        () => React.createElement('div', { className: 'p-8' }, 
                                          React.createElement('h1', { className: 'text-2xl font-bold' }, 'Component Preview'),
                                          React.createElement('p', { className: 'text-gray-600 mt-2' }, 'Component rendered successfully!')
                                        );
              root.render(React.createElement(ComponentToRender));
            } catch (error) {
              document.getElementById('root').innerHTML = 
                '<div style="padding: 20px; color: red;">Error rendering component: ' + error.message + '</div>';
            }
          </script>
        </body>
      </html>
    `;
  };

  // Handle AI message
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
      // Call your AI API
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          files: files.map((f) => ({ path: f.path, content: f.content })),
          selectedFile: selectedFile?.path,
          jobId,
        }),
      });

      const data = await response.json() as {
        message: string;
        updatedFiles?: Array<{ path: string; content: string }>;
      };

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I've updated your code!",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If AI modified files, update them
      if (data.updatedFiles) {
        setFiles((prev) =>
          prev.map((file) => {
            const updated = data.updatedFiles
              ? data.updatedFiles.find(
                  (f: { path: string; content: string }) => f.path === file.path
                )
              : undefined;
            return updated ? { ...file, content: updated.content } : file;
          })
        );

        // Refresh preview
        setPreviewKey((prev) => prev + 1);
      }
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle code editor changes
  const handleEditorChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      setFiles((prev) =>
        prev.map((file) =>
          file.path === selectedFile.path ? { ...file, content: value } : file
        )
      );
      setSelectedFile({ ...selectedFile, content: value });
      // Debounced preview refresh
      setTimeout(() => setPreviewKey((prev) => prev + 1), 1000);
    }
  };

  // Download project
  const handleDownload = async () => {
    const zip = new JSZip();
    files.forEach((file) => {
      zip.file(file.path, file.content);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${projectName}.zip`);
  };

  return (
    <div className={`flex flex-col h-screen ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Workspace
          </h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              {showChat ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewKey((p) => p + 1)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - AI Chat */}
        {showChat && (
          <div className="w-96 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <Sparkles className="h-4 w-4 inline mr-2" />
                      )}
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask me to modify your app..."
                  className="min-h-20 resize-none"
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isProcessing}
                  size="icon"
                  className="h-20 w-12 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Center/Right - Code & Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="preview" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start border-b rounded-none h-12 bg-gray-50 dark:bg-gray-900">
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-2">
                <Code className="h-4 w-4" />
                Code Editor
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-2">
                <FileCode className="h-4 w-4" />
                Files ({files.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 m-0 p-0">
              {showPreview && (
                <iframe
                  key={previewKey}
                  ref={iframeRef}
                  srcDoc={generatePreviewHTML()}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title="Preview"
                />
              )}
            </TabsContent>

            <TabsContent value="code" className="flex-1 m-0 p-0">
              <div className="h-full flex flex-col">
                {/* File selector */}
                <div className="border-b border-gray-200 dark:border-gray-800 p-2 bg-gray-50 dark:bg-gray-900">
                  <select
                    value={selectedFile?.path || ""}
                    onChange={(e) => {
                      const file = files.find((f) => f.path === e.target.value);
                      setSelectedFile(file || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
                  >
                    {files.map((file) => (
                      <option key={file.path} value={file.path}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Editor */}
                <div className="flex-1">
                  {selectedFile ? (
                    <Editor
                      height="100%"
                      language={selectedFile.language}
                      value={selectedFile.content}
                      onChange={handleEditorChange}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: true },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: "on",
                        formatOnPaste: true,
                        formatOnType: true,
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

            <TabsContent value="files" className="flex-1 m-0 p-4 overflow-auto">
              <div className="space-y-2">
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedFile?.path === file.path
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-gray-500" />
                      <span className="font-mono text-sm">{file.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}