import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// This is the utility from shadcn for merging Tailwind classes
import { cn } from "@/lib/utils";

// We will install and import this in the next module for light/dark mode
// import { ThemeProvider } from "@/components/theme-provider";

// Setup the professional 'Inter' font
const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "AutoForge - The Intelligent SaaS Platform",
  description: "Build, deploy, and monetize applications from natural language.",
  // We'll add a proper favicon and icons later
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        {/*
          We will wrap this in a ThemeProvider in the next step
          to enable dark mode and theme switching.
        */}
        {/* <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        > */}
        
        {/* This is where your app's pages will render */}
        <div className="relative flex min-h-screen flex-col">
          {children}
        </div>
        
        {/* </ThemeProvider> */}
      </body>
    </html>
  );
}
