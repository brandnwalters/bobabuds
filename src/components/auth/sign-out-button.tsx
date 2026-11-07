import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

/** Signs out on this device and returns to the sign-in page. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline">
        <LogOut aria-hidden />
        Sign out
      </Button>
    </form>
  );
}
