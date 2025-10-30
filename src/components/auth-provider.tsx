"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

// This is a simple wrapper to make SessionProvider a client component
// This allows you to use session data in any client component
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}

