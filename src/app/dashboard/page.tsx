import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

//
// FIX 1: This is now a default import (no curly braces)
//
import GenerationInterface from "@/components/generation-interface";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// This is a Server Component (no "use client")
export default async function DashboardPage() {
  // 1. Get the user's session from the server
  const session = await getServerSession(authOptions);

  // 2. If the user is not logged in, redirect to the sign-in page
  if (!session || !session.user) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  // 3. We now know the user is logged in
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Alert className="mb-8 border-blue-500">
        <User className="h-4 w-4" />
        <AlertTitle className="text-lg font-semibold">
          Welcome back, {session.user.name || "User"}!
        </AlertTitle>
        <AlertDescription>
          You are logged in as {session.user.email}. You can now start generating
          your new application.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Create New Application</CardTitle>
        </CardHeader>
        <CardContent>
          {/* We are rendering the client component here */}
          <GenerationInterface />
        </CardContent>
      </Card>
    </div>
  );
}

