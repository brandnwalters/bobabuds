import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { LogForm } from "@/components/logs/log-form";
import { getLogSuggestions } from "@/lib/logs/suggestions";

export const metadata: Metadata = { title: "Log a drink · Boba Buds" };

export default function LogPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Log a drink</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <NewLogForm />
      </Suspense>
    </div>
  );
}

async function NewLogForm() {
  // Per-request: the Supabase session check reads the clock.
  await connection();
  return <LogForm suggestions={await getLogSuggestions()} />;
}
