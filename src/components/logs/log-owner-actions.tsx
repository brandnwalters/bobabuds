"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteLog, type DeleteLogState } from "@/lib/logs/actions";

/** Edit and Delete for a Log's author. Delete asks for confirmation first. */
export function LogOwnerActions({ logId }: { logId: string }) {
  const [state, formAction, pending] = useActionState(
    async (): Promise<DeleteLogState> => deleteLog(logId),
    {},
  );

  return (
    <div className="flex gap-2">
      <Button asChild variant="secondary">
        <Link href={`/logs/${logId}/edit`}>
          <Pencil aria-hidden />
          Edit
        </Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="text-destructive">
            <Trash2 aria-hidden />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Log?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be gone for you and your friends, along with its Cheers.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
            <form action={formAction}>
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={pending}
              >
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
