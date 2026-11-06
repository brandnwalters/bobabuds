import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { LogDetails } from "@/components/logs/log-details";
import { LogOwnerActions } from "@/components/logs/log-owner-actions";
import { getLog, getViewerId } from "@/lib/logs/queries";

export const metadata: Metadata = { title: "Log · Boba Buds" };

export default function LogPage({ params }: PageProps<"/logs/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <LogById params={params} />
    </Suspense>
  );
}

async function LogById({ params }: { params: PageProps<"/logs/[id]">["params"] }) {
  const { id } = await params;
  // Per-request: the Supabase session check reads the clock.
  await connection();
  const [log, viewerId] = await Promise.all([getLog(id), getViewerId()]);
  if (!log) notFound();
  return (
    <div className="space-y-4">
      <LogDetails log={log} />
      {log.authorId === viewerId && <LogOwnerActions logId={log.id} />}
    </div>
  );
}
