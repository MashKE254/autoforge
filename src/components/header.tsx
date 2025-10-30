import Link from "next/link";
import { UserAuthButton } from "@/components/user-auth-button"; // We will create this
import { Bot } from "lucide-react"; // Icon

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <nav className="flex items-center space-x-4 lg:space-x-6">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Bot className="h-6 w-6 text-blue-500" />
            <span className="font-bold sm:inline-block">
              AutoForge
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Dashboard
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Pricing
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* This is a Client Component, which is why it's separate */}
          <UserAuthButton />
        </div>
      </div>
    </header>
  );
}

