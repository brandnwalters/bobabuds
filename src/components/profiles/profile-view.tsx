import { Lock, Pencil } from "lucide-react";
import Link from "next/link";

import { LogListItem } from "@/components/logs/log-list-item";
import { Stars } from "@/components/logs/stars";
import { Avatar } from "@/components/profiles/avatar";
import { RelationshipButton } from "@/components/profiles/relationship-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfileStats, ProfileView as View } from "@/lib/profiles/queries";

/**
 * A Profile: avatar, name and @username, then either the boba journal (stats
 * and Logs, for the user themselves and their friends) or, for anyone else,
 * just the Friend Request button.
 */
export function ProfileView({ profile }: { profile: View }) {
  const { person, relationship } = profile;
  const isSelf = relationship === "self";
  const firstName = person.displayName.split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar
          url={person.avatarUrl}
          displayName={person.displayName}
          labelled
          className="size-20 text-2xl"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h1 className="truncate text-2xl font-extrabold tracking-tight">
              {person.displayName}
            </h1>
            <p className="truncate text-muted-foreground">@{person.username}</p>
          </div>
          {isSelf ? (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/profile/edit">
                <Pencil aria-hidden />
                Edit profile
              </Link>
            </Button>
          ) : (
            <RelationshipButton userId={person.id} relationship={relationship} />
          )}
        </div>
      </div>

      {profile.view === "limited" ? (
        <Card>
          <CardContent className="flex items-center gap-3 text-muted-foreground">
            <Lock aria-hidden className="size-5 shrink-0" />
            <p>Become buds with {firstName} to see their boba journal.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <StatsCard stats={profile.stats} />
          <section aria-labelledby="profile-logs" className="space-y-3">
            <h2 id="profile-logs" className="text-lg font-extrabold">
              {isSelf ? "My Logs" : "Logs"}
            </h2>
            {profile.logs.length === 0 ? (
              <Card>
                <CardContent className="space-y-3 text-center">
                  <p className="text-muted-foreground">
                    {isSelf
                      ? "No Logs yet. What was your last boba?"
                      : `${firstName} hasn't logged a drink yet.`}
                  </p>
                  {isSelf && (
                    <Button asChild>
                      <Link href="/log">Log a drink</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <ul aria-label={`${person.displayName}'s Logs`} className="space-y-3">
                {profile.logs.map((log) => (
                  <li key={log.id}>
                    <LogListItem log={log} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatsCard({ stats }: { stats: ProfileStats }) {
  return (
    <section aria-label="Boba stats">
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Logs">
          <span data-testid="stat-logs">{stats.logCount}</span>
        </Stat>
        <Stat label="Top shop">
          {stats.topShop ? (
            <Link
              href={`/shops/${stats.topShop.id}`}
              data-testid="stat-top-shop"
              className="line-clamp-2 underline-offset-2 hover:underline"
            >
              {stats.topShop.name}
            </Link>
          ) : (
            <span data-testid="stat-top-shop">–</span>
          )}
        </Stat>
        <Stat label="Average rating">
          {stats.averageRating === null ? (
            <span data-testid="stat-average">–</span>
          ) : (
            <span className="flex flex-col items-center gap-1">
              <span data-testid="stat-average">{stats.averageRating.toFixed(1)}</span>
              <span aria-hidden className="contents">
                <Stars rating={Math.round(stats.averageRating * 2) / 2} />
              </span>
            </span>
          )}
        </Stat>
      </dl>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse justify-end gap-1 rounded-2xl border bg-card p-3">
      <dt className="text-xs font-bold text-muted-foreground uppercase">{label}</dt>
      <dd className="text-lg leading-tight font-extrabold">{children}</dd>
    </div>
  );
}
