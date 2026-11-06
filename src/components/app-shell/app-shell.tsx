import Link from "next/link";

import { TabBar } from "@/components/app-shell/tab-bar";

/**
 * The signed-in app frame: header with the wordmark, the main column and the
 * tab bar. Mobile-first; on desktop the content sits in a centered column and
 * the tabs move into the header.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            <span aria-hidden>🧋 </span>
            Boba <span className="text-primary">Buds</span>
          </Link>
          <div className="hidden md:block">
            <TabBar />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-24 md:pb-10">
        {children}
      </main>
      <div className="md:hidden">
        <TabBar />
      </div>
    </div>
  );
}
