// This is a Server Component, so we can use `async`
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User } from "lucide-react";

// Our new, interactive Client Component
import { GenerationInterface } from "@/components/generation-interface";

export default async function DashboardPage() {
  // 1. Get the session on the server
  const session = await getServerSession(authOptions);

  // 2. If no session, redirect to sign-in page
  if (!session || !session.user) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  // 3. If we have a session, display the page
  // Extend the user type to include optional id
  const user = session.user as typeof session.user & { id?: string };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">
        Welcome back, {user.name?.split(" ")[0] || "User"}!
      </h1>
      
      {/* This is the main layout of the dashboard.
        We've replaced the old placeholder with our new interactive component.
      */}
      <div className="space-y-6">
        
        {/* The Main Generation Interface */}
        <GenerationInterface />

        {/* User Info Card (from before) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6" />
              <span>Account Details</span>
            </CardTitle>
            <CardDescription>
              Your session and account information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg font-semibold">{user.email}</p>
            </div>
            {user.id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="text-sm font-mono text-muted-foreground break-all">
                  {user.id}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

