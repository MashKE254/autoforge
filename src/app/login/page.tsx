"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Loader2, AlertCircle, Rocket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleLogin = async (provider: "google" | "github") => {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(null);
    }
  };

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "OAuthSignin":
        return "Error connecting to the authentication provider. Please try again.";
      case "OAuthCallback":
        return "Error processing authentication. Please try again.";
      case "OAuthCreateAccount":
        return "Could not create your account. Please try again or contact support.";
      case "EmailCreateAccount":
        return "Could not create account with that email.";
      case "Callback":
        return "Authentication error. Please try again.";
      case "OAuthAccountNotLinked":
        return "This email is already associated with another account. Please sign in using your original method.";
      case "SessionRequired":
        return "Please sign in to access this page.";
      default:
        return "An error occurred. Please try again.";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Main Content */}
      <div className="w-full max-w-md relative z-10">

        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block group">
              <Image src="/BASED IN.png" alt="AutoForge" width={100} height={100} className="rounded-lg" />
          </Link>
        </div>

        {/* Auth Card */}
        <Card className="border-white/10 bg-black/60 backdrop-blur-2xl shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-gray-400">
              Sign in or create your account to start building apps with AI
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-300 mb-1">Authentication Error</p>
                  <p className="text-xs text-red-400/80">{getErrorMessage(error)}</p>
                </div>
              </div>
            )}

            {/* Google OAuth */}
            <Button
              variant="outline"
              onClick={() => handleLogin("google")}
              disabled={!!isLoading}
              className="w-full h-12 relative border-white/20 hover:bg-white/10 hover:border-white/30 text-white bg-white/5 transition-all group"
            >
              {isLoading === "google" ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
              )}
              <span className="font-medium">Continue with Google</span>
            </Button>

            {/* GitHub OAuth */}
            <Button
              variant="outline"
              onClick={() => handleLogin("github")}
              disabled={!!isLoading}
              className="w-full h-12 border-white/20 hover:bg-white/10 hover:border-white/30 text-white bg-white/5 transition-all group"
            >
              {isLoading === "github" ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Github className="mr-2 h-5 w-5" />
              )}
              <span className="font-medium">Continue with GitHub</span>
            </Button>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-1">First time here?</p>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    No separate signup needed! Just click either button above and we&apos;ll automatically create your account when you sign in for the first time.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="text-center text-xs text-gray-400 leading-relaxed">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-cyan-400 transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-cyan-400 transition-colors">
                Privacy Policy
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400 mb-2">Having trouble signing in?</p>
          <Link
            href="mailto:support@autoforge.dev"
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Contact Support
          </Link>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
          >
            <span>←</span>
            <span className="group-hover:underline">Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
