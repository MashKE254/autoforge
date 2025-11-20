'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  Clock, 
  Loader2, 
  AlertCircle,
  Zap,
  Database,
  Shield,
  Code,
  Server,
  Layers
} from 'lucide-react';

interface Blueprint {
  architecture: {
    frontend: string[];
    backend: string[];
    database: string[];
    infrastructure: string[];
  };
  modules: {
    name: string;
    category: string;
    purpose: string;
    dependencies: string[];
    estimatedComplexity: string;
  }[];
  timeline: {
    phase: string;
    duration: string;
    deliverables: string[];
  }[];
  estimatedComplexity: string;
  estimatedModules: number;
  estimatedTime: string;
  features: string[];
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    authentication: string;
    payments?: string;
    hosting: string;
  };
}

const categoryColors: Record<string, string> = {
  AUTH: 'bg-blue-500',
  PAYMENT: 'bg-green-500',
  DATABASE: 'bg-purple-500',
  UI: 'bg-pink-500',
  API: 'bg-yellow-500',
  WORKFLOW: 'bg-orange-500',
  AGENT: 'bg-red-500',
  INFRASTRUCTURE: 'bg-gray-500',
  UTILITY: 'bg-indigo-500'
};

const complexityColors: Record<string, string> = {
  simple: 'text-green-600',
  moderate: 'text-yellow-600',
  complex: 'text-orange-600',
  enterprise: 'text-red-600'
};

export default function BlueprintPage({
  params
}: {
  params: Promise<{ jobId: string }>;  // Changed to Promise
}) {
  // Unwrap params using React.use()
  const { jobId } = use(params);
  
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchBlueprint = async () => {
      try {
        const response = await fetch(`/api/generation/${jobId}/blueprint`);
        const data = await response.json();
        
        if (response.ok && data.blueprint) {
          setBlueprint(data.blueprint);
          setError(null);
        } else {
          setError(data.error || 'Failed to load blueprint');
        }
      } catch (err) {
        console.error('Failed to fetch blueprint:', err);
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBlueprint();
  }, [jobId]);

  const handleApprove = async () => {
    setApproving(true);
    setError(null);

    try {
      const response = await fetch(`/api/generation/${jobId}/approve`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to progress page (Phase 3)
        router.push(`/generate/progress/${jobId}`);
      } else {
        setError(data.error || 'Failed to start generation');
        setApproving(false);
      }
    } catch (err) {
      console.error('Approval error:', err);
      setError('Network error occurred');
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Generating Blueprint...</h2>
          <p className="text-muted-foreground">Analyzing your requirements and designing the architecture</p>
        </div>
      </div>
    );
  }

  if (error || !blueprint) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Blueprint not found'}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => router.push('/dashboard')} 
          className="mt-4"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Zap className="w-10 h-10 text-primary" />
          Living Blueprint
        </h1>
        <p className="text-muted-foreground text-lg">
          Review your application architecture before generation begins
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Complexity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold capitalize ${complexityColors[blueprint.estimatedComplexity]}`}>
              {blueprint.estimatedComplexity}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{blueprint.estimatedModules}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Production-ready components
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estimated Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{blueprint.estimatedTime}</p>
            <p className="text-sm text-muted-foreground mt-1">
              From approval to deployment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tech Stack Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Frontend</p>
              <p className="font-semibold">{blueprint.techStack.frontend}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Backend</p>
              <p className="font-semibold">{blueprint.techStack.backend}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Database</p>
              <p className="font-semibold">{blueprint.techStack.database}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Authentication</p>
              <p className="font-semibold">{blueprint.techStack.authentication}</p>
            </div>
            {blueprint.techStack.payments && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Payments</p>
                <p className="font-semibold">{blueprint.techStack.payments}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Hosting</p>
              <p className="font-semibold">{blueprint.techStack.hosting}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      {blueprint.features && blueprint.features.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {blueprint.features.map((feature, i) => (
                <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="architecture" className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="architecture">
            <Server className="w-4 h-4 mr-2" />
            Architecture
          </TabsTrigger>
          <TabsTrigger value="modules">
            <Layers className="w-4 h-4 mr-2" />
            Modules ({blueprint.modules.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="w-4 h-4 mr-2" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="architecture" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Frontend */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Code className="w-5 h-5 text-blue-500" />
                    Frontend
                  </h3>
                  <ul className="space-y-2">
                    {blueprint.architecture.frontend.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Backend */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Server className="w-5 h-5 text-green-500" />
                    Backend
                  </h3>
                  <ul className="space-y-2">
                    {blueprint.architecture.backend.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Database */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-500" />
                    Database
                  </h3>
                  <ul className="space-y-2">
                    {blueprint.architecture.database.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Infrastructure */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-orange-500" />
                    Infrastructure
                  </h3>
                  <ul className="space-y-2">
                    {blueprint.architecture.infrastructure.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {blueprint.modules.map((module, i) => (
                    <div 
                      key={i} 
                      className="border-l-4 pl-4 py-3 rounded-r-lg hover:bg-accent/50 transition-colors"
                      style={{ borderColor: categoryColors[module.category] || '#gray' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{module.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {module.purpose}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Badge className={categoryColors[module.category]}>
                            {module.category}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {module.estimatedComplexity}
                          </Badge>
                        </div>
                      </div>
                      {module.dependencies.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Dependencies:</span>{' '}
                            {module.dependencies.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {blueprint.timeline.map((phase, i) => (
                  <div key={i} className="relative">
                    {i !== blueprint.timeline.length - 1 && (
                      <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-border" />
                    )}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {i + 1}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{phase.phase}</h3>
                          <Badge variant="outline">{phase.duration}</Badge>
                        </div>
                        <ul className="space-y-2 mt-3">
                          {phase.deliverables.map((item, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4 sticky bottom-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-lg">
        <Button
          onClick={handleApprove}
          disabled={approving}
          size="lg"
          className="flex-1 h-14 text-lg"
        >
          {approving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Starting Generation...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Approve & Start Generation
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push('/dashboard')}
          disabled={approving}
          className="h-14"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}