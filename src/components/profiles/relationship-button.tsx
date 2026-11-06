import { Check } from "lucide-react";

import { ActionButton } from "@/components/friends/action-button";
import { Button } from "@/components/ui/button";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
} from "@/lib/friends/actions";
import type { Relationship } from "@/lib/friends/queries";

/**
 * The Profile's Friend Request button for where the viewer stands with
 * `userId`: Add friend, Requested (with Cancel request), Accept (with
 * Decline) or Friends. Nothing on your own Profile.
 */
export function RelationshipButton({
  userId,
  relationship,
}: {
  userId: string;
  relationship: Relationship;
}) {
  switch (relationship) {
    case "self":
      return null;
    case "none":
      return (
        <ActionButton action={sendFriendRequest.bind(null, userId)}>Add friend</ActionButton>
      );
    case "outgoing":
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" className="rounded-full" disabled>
            Requested
          </Button>
          <ActionButton action={cancelFriendRequest.bind(null, userId)} variant="ghost">
            Cancel request
          </ActionButton>
        </div>
      );
    case "incoming":
      return (
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton action={acceptFriendRequest.bind(null, userId)}>Accept</ActionButton>
          <ActionButton action={declineFriendRequest.bind(null, userId)} variant="outline">
            Decline
          </ActionButton>
        </div>
      );
    case "friends":
      return (
        // A status, not an action: unfriending lives on the Friends page.
        <Button size="sm" variant="secondary" className="rounded-full" disabled>
          <Check aria-hidden />
          Friends
        </Button>
      );
  }
}
