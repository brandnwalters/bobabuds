import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { LogForm } from "@/components/logs/log-form";
import { getLog, getViewerId } from "@/lib/logs/queries";
import { getLogSuggestions } from "@/lib/logs/suggestions";

export const metadata: Metadata = { title: "Edit Log · Boba Buds" };

export default function EditLogPage({ params }: PageProps<"/logs/[id]/edit">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Edit Log</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <EditLogForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditLogForm({
  params,
}: {
  params: PageProps<"/logs/[id]/edit">["params"];
}) {
  const { id } = await params;
  // Per-request: the Supabase session check reads the clock.
  await connection();
  const [log, viewerId, suggestions] = await Promise.all([
    getLog(id),
    getViewerId(),
    getLogSuggestions(),
  ]);
  // Only the author edits; to anyone else this page doesn't exist.
  if (!log || log.authorId !== viewerId) notFound();
  return <LogForm log={log} suggestions={suggestions} />;
}
