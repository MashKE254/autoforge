'use client';

/**
 * Fast Streaming Dashboard (like bolt.new)
 * 
 * File: src/app/dashboard/page.tsx
 * 
 * Features:
 * - INSTANT streaming generation
 * - Live file preview as they're generated
 * - Background jobs only for complex SaaS
 */

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, Sparkles, AlertCircle, Zap, Bot, Workflow,
  CheckCircle, Clock, Code, Cpu, Globe, Mail, MessageSquare,
  CreditCard, Server, Container, Building2, Database, FileCode, Eye
} from 'lucide-react';

interface StreamedFile {
  path: string;
  content: string;
  index: number;
}

interface Classification {
  type: string;
  confidence: number;
  features?: Record<string, boolean>;
  techStack?: string[];
}

const examplePrompts = {
  ui: [
    { title: 'Calculator', prompt: 'A calculator with add, subtract, multiply, divide. Dark mode and history.', icon: Code },
    { title: 'Kanban Board', prompt: 'A Trello-like kanban board with drag and drop columns.', icon: Cpu },
    { title: 'Dashboard', prompt: 'An analytics dashboard with charts and KPI cards.', icon: Globe },
  ],
  saas: [
    { title: 'Project Management', prompt: 'Build a project management SaaS with Stripe subscription billing, team workspaces, and admin dashboard.', icon: Building2 },
    { title: 'Feedback Tool', prompt: 'A customer feedback SaaS with pricing tiers, Stripe checkout, and analytics.', icon: MessageSquare },
  ],
  api: [
    { title: 'User API', prompt: 'Create a REST API for user management with JWT auth and rate limiting. No frontend.', icon: Database },
    { title: 'Inventory API', prompt: 'Build a headless inventory API with CRUD, pagination, and OpenAPI docs.', icon: Server },
  ],
  workflow: [
    { title: 'Welcome Flow', prompt: 'When a user signs up, send welcome email, wait 2 days, send follow-up.', icon: Mail },
    { title: 'Daily Report', prompt: 'Every day at 9 AM, gather metrics and email a summary report.', icon: Clock },
  ],
  agent: [
    { title: 'Research Agent', prompt: 'An AI agent that searches the web and summarizes findings.', icon: Bot },
    { title: 'Content Crew', prompt: 'Team of AI agents: researcher, writer, reviewer for blog posts.', icon: MessageSquare },
  ],
};

const typeConfig: Record<string, { label: string; color: string; useStreaming: boolean }> = {
  'ui-application': { label: 'UI App', color: 'text-blue-400', useStreaming: true },
  'full-saas': { label: 'Full SaaS', color: 'text-green-400', useStreaming: false },
  'full-stack-saas': { label: 'Full-Stack SaaS', color: 'text-emerald-400', useStreaming: false },
  'api-backend': { label: 'API Backend', color: 'text-cyan-400', useStreaming: true },
  'workflow-automation': { label: 'Workflow', color: 'text-orange-400', useStreaming: false },
  'ai-agent-network': { label: 'AI Agents', color: 'text-purple-400', useStreaming: false },
  'infrastructure': { label: 'Infrastructure', color: 'text-slate-400', useStreaming: true },
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('ui');
  
  const [streamedFiles, setStreamedFiles] = useState<StreamedFile[]>([]);
  const [currentChunk, setCurrentChunk] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [generationComplete, setGenerationComplete] = useState(false);
  
  const [classification, setClassification] = useState<Classification | null>(null);
  const [classifying, setClassifying] = useState(false);
  
  const [includeInfrastructure, setIncludeInfrastructure] = useState(false);
  const [useBackgroundJob, setUseBackgroundJob] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Classify prompt as user types
  useEffect(() => {
    if (!prompt.trim() || prompt.length < 10) {
      setClassification(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setClassifying(true);
      try {
        const res = await fetch(`/api/generate/enhanced?prompt=${encodeURIComponent(prompt)}`);
        const data = await res.json();
        if (data.primaryType) {
          setClassification({
            type: data.primaryType,
            confidence: data.confidence,
            features: data.detectedFeatures,
            techStack: data.suggestedTechStack,
          });
          const config = typeConfig[data.primaryType];
          if (config && !config.useStreaming) {
            setUseBackgroundJob(true);
          } else {
            setUseBackgroundJob(false);
          }
        }
      } catch {
        // Silent
      } finally {
        setClassifying(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [prompt]);

  // STREAMING GENERATION
  const handleStreamingGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setStreamedFiles([]);
    setCurrentChunk('');
    setJobId(null);
    setGenerationComplete(false);
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Failed to start generation');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'job') setJobId(data.jobId);
              else if (data.type === 'chunk') setCurrentChunk(prev => prev + data.content);
              else if (data.type === 'file') {
                setStreamedFiles(prev => [...prev, { path: data.path, content: data.content, index: data.index }]);
              }
              else if (data.type === 'complete') {
                setGenerationComplete(true);
                setJobId(data.jobId);
                // Auto-redirect to workspace after a brief moment
                setTimeout(() => {
                  router.push(`/generate/result/${data.jobId}`);
                }, 1500);
              }
              else if (data.type === 'error') throw new Error(data.message);
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // BACKGROUND JOB GENERATION
  const handleBackgroundGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const res = await fetch('/api/generate/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), includeInfrastructure }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      router.push(`/job/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    useBackgroundJob ? handleBackgroundGenerate() : handleStreamingGenerate();
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const getTypeConfig = (type: string) => typeConfig[type] || typeConfig['ui-application'];

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {session?.user?.name || 'Builder'}!</h1>
        <p className="text-gray-400">
          Create apps instantly with <span className="text-blue-400">streaming generation</span> — see code appear in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-6">
          <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Create New Application
              </CardTitle>
              <CardDescription>Describe what you want — generation starts instantly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., 'A todo app with categories and dark mode'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] text-lg"
                disabled={isGenerating}
              />

              {classification && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                  <span className={`font-medium ${getTypeConfig(classification.type).color}`}>
                    {getTypeConfig(classification.type).label}
                  </span>
                  <Badge variant="outline">{Math.round(classification.confidence * 100)}%</Badge>
                  {classification.features?.hasBilling && (
                    <Badge className="bg-green-500/20 text-green-400"><CreditCard className="w-3 h-3 mr-1" /> Billing</Badge>
                  )}
                  {!typeConfig[classification.type]?.useStreaming && (
                    <Badge className="bg-orange-500/20 text-orange-400">Background Job</Badge>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-gray-900/30 border border-gray-800">
                <div className="flex items-center space-x-2">
                  <Checkbox id="bg" checked={useBackgroundJob} onCheckedChange={(c) => setUseBackgroundJob(c === true)} />
                  <Label htmlFor="bg" className="text-sm cursor-pointer">Use background job</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="infra" checked={includeInfrastructure} onCheckedChange={(c) => setIncludeInfrastructure(c === true)} />
                  <Label htmlFor="infra" className="text-sm cursor-pointer flex items-center gap-1">
                    <Container className="w-3 h-3" /> Add Docker/CI
                  </Label>
                </div>
              </div>

              {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

              <div className="flex gap-2">
                <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}
                  className="flex-1 h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  {isGenerating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating...</> : <><Zap className="mr-2 h-5 w-5" />Generate Instantly</>}
                </Button>
                {isGenerating && !useBackgroundJob && <Button variant="outline" onClick={handleCancel}>Cancel</Button>}
                {generationComplete && jobId && (
                  <Button onClick={() => router.push(`/generate/result/${jobId}`)} className="bg-green-600 hover:bg-green-700">
                    <Eye className="mr-2 h-4 w-4" />View
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Examples */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Examples</CardTitle></CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5 mb-3">
                  <TabsTrigger value="ui" className="text-xs">UI</TabsTrigger>
                  <TabsTrigger value="saas" className="text-xs">SaaS</TabsTrigger>
                  <TabsTrigger value="api" className="text-xs">API</TabsTrigger>
                  <TabsTrigger value="workflow" className="text-xs">Flow</TabsTrigger>
                  <TabsTrigger value="agent" className="text-xs">Agent</TabsTrigger>
                </TabsList>
                {Object.entries(examplePrompts).map(([cat, examples]) => (
                  <TabsContent key={cat} value={cat} className="mt-2 space-y-2">
                    {examples.map((ex, i) => (
                      <button key={i} onClick={() => setPrompt(ex.prompt)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-800 hover:bg-gray-900 text-left text-sm">
                        <ex.icon className="w-4 h-4 text-blue-500" /><span className="font-medium">{ex.title}</span>
                      </button>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Preview */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3 border-b border-gray-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Live Generation
              {isGenerating && <Badge className="bg-blue-500/20 text-blue-400 animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Streaming</Badge>}
              {generationComplete && <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {streamedFiles.length === 0 && !isGenerating ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Code className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Files will appear here in real-time</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {streamedFiles.map((file, i) => (
                    <div key={i} className="rounded-lg border border-gray-800 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800">
                        <FileCode className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-mono text-gray-300">{file.path}</span>
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      </div>
                      <pre className="p-3 text-xs overflow-x-auto bg-gray-950 max-h-[150px] overflow-y-auto">
                        <code className="text-gray-400">{file.content.slice(0, 400)}{file.content.length > 400 && '...'}</code>
                      </pre>
                    </div>
                  ))}
                  {isGenerating && currentChunk && (
                    <div className="rounded-lg border border-blue-500/50 overflow-hidden animate-pulse">
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/30">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <span className="text-sm text-blue-300">Generating...</span>
                      </div>
                      <pre className="p-3 text-xs bg-gray-950 max-h-[80px] overflow-hidden">
                        <code className="text-gray-500">{currentChunk.slice(-200)}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      {streamedFiles.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-6">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{streamedFiles.length}</div>
            <div className="text-xs text-gray-500">Files</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{streamedFiles.reduce((a, f) => a + f.content.length, 0).toLocaleString()}</div>
            <div className="text-xs text-gray-500">Characters</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{streamedFiles.reduce((a, f) => a + f.content.split('\n').length, 0)}</div>
            <div className="text-xs text-gray-500">Lines</div>
          </Card>
        </div>
      )}
    </div>
  );
}
