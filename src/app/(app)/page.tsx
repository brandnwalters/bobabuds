import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { FeedList } from "@/components/feed/feed-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listFeed } from "@/lib/logs/queries";

export default function FeedPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Feed</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Feed />
      </Suspense>
    </div>
  );
}

async function Feed() {
  // Per-request: the Supabase session check reads the clock.
  await connection();
  const firstPage = await listFeed();

  if (firstPage.logs.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 text-center">
          <p className="text-lg font-bold">Your Feed is empty</p>
          <p className="text-muted-foreground">
            Log your first drink, or add friends to see what they&apos;re
            sipping.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/log">Log a drink</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/friends">Find friends</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <FeedList firstPage={firstPage} />;
}
