import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { LogDetails } from "@/components/logs/log-details";
import { getLog } from "@/lib/logs/queries";

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
  const log = await getLog(id);
  if (!log) notFound();
  return <LogDetails log={log} />;
}
