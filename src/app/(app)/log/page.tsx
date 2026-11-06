import type { Metadata } from "next";

import { LogForm } from "@/components/logs/log-form";

export const metadata: Metadata = { title: "Log a drink · Boba Buds" };

export default function LogPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Log a drink</h1>
      <LogForm />
    </div>
  );
}
