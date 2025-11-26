'use client';

/**
 * Updated Dashboard Page with Workflow & Agent Support
 * 
 * File: src/app/dashboard/page.tsx
 * 
 * Features:
 * - Example prompts for UI, Workflow, and Agent generation
 * - Real-time classification preview
 * - Visual indicator of what will be generated
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  Zap, 
  Bot, 
  Workflow,
  ArrowRight,
  CheckCircle,
  Clock,
  Code,
  Cpu,
  Globe,
  Mail,
  MessageSquare
} from 'lucide-react';

interface Classification {
  type: string;
  confidence: number;
  confidencePercent: string;
  description: string;
  reasoning: string;
  techStack: string[];
}

interface RecentJob {
  id: string;
  createdAt: string;
  status: string;
  prompt: string;
  progress: number;
}

// Example prompts for each category
const examplePrompts = {
  ui: [
    {
      title: 'Calculator',
      prompt: 'A calculator with add, subtract, multiply, divide operations. Include dark mode and calculation history.',
      icon: Code,
    },
    {
      title: 'Kanban Board',
      prompt: 'A Trello-like kanban board with drag and drop, columns for todo/in-progress/done, and card editing.',
      icon: Cpu,
    },
    {
      title: 'Dashboard',
      prompt: 'An analytics dashboard with line charts, bar charts, KPI cards, and date filters.',
      icon: Globe,
    },
  ],
  workflow: [
    {
      title: 'Welcome Flow',
      prompt: 'When a new user signs up, send them a welcome email, wait 2 days, then send a follow-up. Notify team on Slack.',
      icon: Mail,
    },
    {
      title: 'Daily Report',
      prompt: 'Every day at 9 AM, gather metrics from our database, generate a summary report, and email it to the team.',
      icon: Clock,
    },
    {
      title: 'Data Sync',
      prompt: 'Every hour, sync customer data between our database and Hubspot CRM. Handle conflicts by preferring recent updates.',
      icon: Zap,
    },
  ],
  agent: [
    {
      title: 'Research Agent',
      prompt: 'An AI agent that can search the web, read articles, and summarize findings to answer research questions.',
      icon: Bot,
    },
    {
      title: 'Content Crew',
      prompt: 'A team of AI agents: researcher, writer, and reviewer. They collaborate to produce high-quality blog posts.',
      icon: MessageSquare,
    },
    {
      title: 'Support Agent',
      prompt: 'A customer support AI that answers from knowledge base, looks up orders, and escalates to humans when needed.',
      icon: Cpu,
    },
  ],
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [activeTab, setActiveTab] = useState('ui');

  // Load recent jobs
  useEffect(() => {
    if (status === 'authenticated') {
      fetchRecentJobs();
    }
  }, [status]);

  // Classify prompt as user types (debounced)
  useEffect(() => {
    if (!prompt.trim() || prompt.length < 10) {
      setClassification(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setClassifying(true);
      try {
        const res = await fetch('/api/generate/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (data.success) {
          setClassification(data.classification);
        }
      } catch {
        // Silent fail for classification
      } finally {
        setClassifying(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [prompt]);

  const fetchRecentJobs = async () => {
    try {
      const res = await fetch('/api/generation/recent?limit=5');
      const data = await res.json();
      if (data.success) {
        setRecentJobs(data.jobs);
      }
    } catch {
      // Silent fail
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      // Redirect to job page
      router.push(`/job/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  const getStatusBadge = (jobStatus: string) => {
    switch (jobStatus) {
      case 'COMPLETED':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{jobStatus}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('workflow')) return <Workflow className="w-5 h-5" />;
    if (type.includes('agent')) return <Bot className="w-5 h-5" />;
    return <Code className="w-5 h-5" />;
  };

  const getTypeColor = (type: string) => {
    if (type.includes('workflow')) return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
    if (type.includes('agent')) return 'bg-purple-500/20 text-purple-500 border-purple-500/50';
    return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {session?.user?.name || 'Builder'}!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create UI apps, workflow automations, or AI agent networks from a single prompt.
        </p>
      </div>

      {/* Main Generation Card */}
      <Card className="mb-8 border-2 border-blue-100 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Create New Application
          </CardTitle>
          <CardDescription>
            Describe what you want to build. We&apos;ll automatically detect if it&apos;s a UI app, workflow, or AI agent system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., 'A calculator app' or 'When a user signs up, send welcome email' or 'An AI agent that researches topics'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] text-lg"
            disabled={loading}
          />

          {/* Classification Preview */}
          {(classification || classifying) && (
            <div className={`p-4 rounded-lg border ${classification ? getTypeColor(classification.type) : 'bg-gray-100'}`}>
              {classifying ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing your prompt...</span>
                </div>
              ) : classification && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(classification.type)}
                    <span className="font-semibold">{classification.description}</span>
                    <Badge variant="outline" className="ml-auto">
                      {classification.confidencePercent} confident
                    </Badge>
                  </div>
                  <p className="text-sm opacity-80">{classification.reasoning}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {classification.techStack.map((tech, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Application
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Example Prompts */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Example Prompts</CardTitle>
          <CardDescription>Click any example to use it as a starting point</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ui" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                UI Apps
              </TabsTrigger>
              <TabsTrigger value="workflow" className="flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                Workflows
              </TabsTrigger>
              <TabsTrigger value="agent" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                AI Agents
              </TabsTrigger>
            </TabsList>

            {(['ui', 'workflow', 'agent'] as const).map((category) => (
              <TabsContent key={category} value={category} className="mt-4">
                <div className="grid gap-3">
                  {examplePrompts[category].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(example.prompt)}
                      className="flex items-start gap-3 p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900 text-left transition-colors"
                    >
                      <example.icon className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{example.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{example.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                  onClick={() => router.push(`/job/${job.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{job.prompt}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(job.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}