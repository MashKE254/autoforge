"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleLogin = async (provider: "google" | "github") => {
    setIsLoading(provider);
    try {
      // This redirects to the dashboard after successful login
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration matching your 'AutoForge' theme */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      <div className="absolute h-full w-full bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
             {/* Using the logo file found in your public folder */}
             <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Image src="/Logo.svg" alt="AutoForge" width={32} height={32} />
             </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome to AutoForge
          </CardTitle>
          <CardDescription>
            Sign in to start generating apps from prompts
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button 
            variant="outline" 
            onClick={() => handleLogin("google")}
            disabled={!!isLoading}
            className="w-full h-11 relative"
          >
            {isLoading === "google" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Continue with Google
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleLogin("github")}
            disabled={!!isLoading}
            className="w-full h-11"
          >
            {isLoading === "github" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Github className="mr-2 h-4 w-4" />
            )}
            Continue with GitHub
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
             By clicking continue, you agree to our{" "}
             <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
               Terms of Service
             </Link>{" "}
             and{" "}
             <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
               Privacy Policy
             </Link>
             .
          </div>
        </CardContent>
      </Card>
    </div>
  );
}