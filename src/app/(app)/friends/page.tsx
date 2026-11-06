import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";

import { ActionButton } from "@/components/friends/action-button";
import { BudRow } from "@/components/friends/bud-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  unfriend,
} from "@/lib/friends/actions";
import {
  getFriendsOverview,
  searchBuds,
  type Bud,
  type Relationship,
} from "@/lib/friends/queries";

export const metadata: Metadata = { title: "Friends · Boba Buds" };

export default function FriendsPage({ searchParams }: PageProps<"/friends">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Friends</h1>
      {/* Disabled until the real form streams in, or typing would be lost. */}
      <Suspense fallback={<SearchForm query="" disabled />}>
        <Search searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <FriendLists />
      </Suspense>
    </div>
  );
}

function SearchForm({
  query,
  disabled = false,
}: {
  query: string;
  disabled?: boolean;
}) {
  return (
    <Form action="/friends" role="search" className="flex gap-2">
      <label htmlFor="friend-search" className="sr-only">
        Find buds by @username
      </label>
      <Input
        id="friend-search"
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Find buds by @username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        className="h-10 rounded-full bg-card px-4"
      />
      <Button type="submit" className="h-10 rounded-full" disabled={disabled}>
        Search
      </Button>
    </Form>
  );
}

async function Search({
  searchParams,
}: {
  searchParams: PageProps<"/friends">["searchParams"];
}) {
  const q = (await searchParams).q;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  // Keyed so the field shows the new query after each search.
  const form = <SearchForm key={query} query={query} />;
  if (!query) return form;

  const results = await searchBuds(query);
  return (
    <div className="space-y-4">
      {form}
      <Section title="Search results" id="search-results">
        {results.length === 0 ? (
          <Empty>No buds match @{query.replace(/^@/, "")}.</Empty>
        ) : (
          <List>
            {results.map((bud) => (
              <BudRow key={bud.id} bud={bud}>
                <SearchAction bud={bud} relationship={bud.relationship} />
              </BudRow>
            ))}
          </List>
        )}
      </Section>
    </div>
  );
}

function SearchAction({
  bud,
  relationship,
}: {
  bud: Bud;
  relationship: Relationship;
}) {
  switch (relationship) {
    case "friends":
      return <Status>Friends</Status>;
    case "outgoing":
      return <Status>Requested</Status>;
    case "incoming":
      return (
        <ActionButton action={acceptFriendRequest.bind(null, bud.id)}>
          Accept
        </ActionButton>
      );
    case "none":
      return (
        <ActionButton action={sendFriendRequest.bind(null, bud.id)}>
          Add friend
        </ActionButton>
      );
    case "self":
      return null;
  }
}

async function FriendLists() {
  const { incoming, outgoing, friends } = await getFriendsOverview();

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <Section title="Friend Requests" id="incoming-requests">
          <List>
            {incoming.map((bud) => (
              <BudRow key={bud.id} bud={bud}>
                <ActionButton action={acceptFriendRequest.bind(null, bud.id)}>
                  Accept
                </ActionButton>
                <ActionButton
                  action={declineFriendRequest.bind(null, bud.id)}
                  variant="outline"
                >
                  Decline
                </ActionButton>
              </BudRow>
            ))}
          </List>
        </Section>
      )}

      <Section title="Your friends" id="friends">
        {friends.length === 0 ? (
          <Empty>
            No buds yet. Search for a friend&apos;s @username above to send
            them a Friend Request.
          </Empty>
        ) : (
          <List>
            {friends.map((bud) => (
              <BudRow key={bud.id} bud={bud}>
                <ActionButton action={unfriend.bind(null, bud.id)} variant="ghost">
                  Unfriend
                </ActionButton>
              </BudRow>
            ))}
          </List>
        )}
      </Section>

      {outgoing.length > 0 && (
        <Section title="Sent requests" id="outgoing-requests">
          <List>
            {outgoing.map((bud) => (
              <BudRow key={bud.id} bud={bud}>
                <Status>Pending</Status>
                <ActionButton
                  action={cancelFriendRequest.bind(null, bud.id)}
                  variant="outline"
                >
                  Cancel
                </ActionButton>
              </BudRow>
            ))}
          </List>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl border bg-card px-4 py-3 shadow-sm"
    >
      <h2 id={id} className="text-lg font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y">{children}</ul>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-muted-foreground">{children}</p>;
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-milk-tea-100 px-3 py-1 text-sm font-semibold text-muted-foreground">
      {children}
    </span>
  );
}
