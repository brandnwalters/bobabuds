import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { CheeredBy } from "@/components/cheers/cheered-by";
import { CheersButton } from "@/components/cheers/cheers-button";
import { LogDetails } from "@/components/logs/log-details";
import { LogOwnerActions } from "@/components/logs/log-owner-actions";
import { getLog } from "@/lib/logs/queries";
import { createClient, getViewerId } from "@/lib/supabase/server";

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
  const [log, viewerId] = await Promise.all([
    getLog(id),
    createClient().then(getViewerId),
  ]);
  if (!log) notFound();
  return (
    <div className="space-y-4">
      <LogDetails log={log} />
      <section aria-label="Cheers" className="space-y-3">
        <CheersButton
          logId={log.id}
          count={log.cheers.count}
          viewerCheered={log.cheers.viewerCheered}
        />
        <CheeredBy cheerers={log.cheers.cheerers} />
      </section>
      {log.authorId === viewerId && <LogOwnerActions logId={log.id} />}
    </div>
  );
}
