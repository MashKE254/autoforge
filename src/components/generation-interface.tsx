"use client";

/**
 * Generation Interface - Bolt.new Style
 * 
 * File: src/components/generation-interface.tsx
 * 
 * Updated to support instant generation for simple apps.
 * No more waiting for blueprint approval or module generation.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Loader2, 
  Zap, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  Code,
  Rocket
} from "lucide-react";

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export default function GenerationInterface() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[] | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  /**
   * Instant generation - generates and returns files immediately
   * Best for simple apps like calculators, todo lists, etc.
   */
  const handleInstantGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setLoadingStatus("🚀 Generating your application...");
    setGeneratedFiles(null);

    try {
      const response = await fetch("/api/generate/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setLoadingStatus("✅ Generation complete!");
      setGeneratedFiles(data.files);
      setJobId(data.jobId);

      // Redirect to workspace after a brief delay
      setTimeout(() => {
        router.push(`/generate/result/${data.jobId}`);
      }, 1000);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setLoadingStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Background generation - uses Trigger.dev for complex apps
   * Better for larger applications that might take longer
   */
  const handleBackgroundGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setLoadingStatus("🚀 Starting generation...");

    try {
      const response = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start generation");
      }

      setLoadingStatus("Redirecting to job page...");
      
      // Redirect to job status page
      router.push(`/job/${data.jobId}`);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setLoadingStatus("");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Your Application
          </CardTitle>
          <CardDescription className="text-lg">
            Describe what you want to build and we&apos;ll generate it instantly
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Prompt Input */}
          <div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'A calculator app with basic operations' or 'A todo list with add, delete, and complete functionality'"
              className="min-h-[150px] text-lg resize-none"
              disabled={isLoading}
            />
            <p className="text-sm text-gray-500 mt-2">
              Be specific about the features you want. The more detail, the better!
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Generation Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading Status */}
          {isLoading && loadingStatus && (
            <Alert className="bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertTitle className="text-blue-800">Generating...</AlertTitle>
              <AlertDescription className="text-blue-700">
                {loadingStatus}
              </AlertDescription>
            </Alert>
          )}

          {/* Generated Files Preview */}
          {generatedFiles && (
            <Alert className="bg-green-50 border-green-200">
              <Code className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">
                Generated {generatedFiles.length} Files!
              </AlertTitle>
              <AlertDescription className="text-green-700">
                <ul className="mt-2 space-y-1">
                  {generatedFiles.slice(0, 5).map((file) => (
                    <li key={file.path} className="text-sm font-mono">
                      {file.path}
                    </li>
                  ))}
                  {generatedFiles.length > 5 && (
                    <li className="text-sm">
                      ...and {generatedFiles.length - 5} more
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Instant Generate - Primary Action */}
            <Button
              onClick={handleInstantGenerate}
              disabled={isLoading || !prompt.trim()}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Generate Instantly
                </>
              )}
            </Button>

            {/* Background Generate - Secondary Action */}
            <Button
              onClick={handleBackgroundGenerate}
              disabled={isLoading || !prompt.trim()}
              variant="outline"
              className="flex-1 h-14 text-lg"
            >
              <Rocket className="mr-2 h-5 w-5" />
              Generate in Background
            </Button>
          </div>

          {/* Tips */}
          <div className="text-center text-sm text-gray-500 space-y-1">
            <p>
              <strong>Instant:</strong> Best for simple apps (calculator, todo, timer)
            </p>
            <p>
              <strong>Background:</strong> Better for complex apps that might take longer
            </p>
          </div>

          {/* Go to Result Button */}
          {jobId && !isLoading && (
            <Button
              onClick={() => router.push(`/generate/result/${jobId}`)}
              className="w-full h-12"
              variant="outline"
            >
              View Your Application
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Example Prompts */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4 text-center text-gray-700">
          Try these examples:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "A calculator app with add, subtract, multiply, divide",
            "A todo list with add, delete, and mark complete",
            "A weather dashboard that shows the current weather",
            "A simple timer with start, pause, and reset",
            "A note-taking app with create, edit, and delete",
            "A countdown timer to a specific date",
          ].map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              disabled={isLoading}
              className="p-3 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}