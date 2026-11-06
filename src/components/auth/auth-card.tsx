import { Card, CardContent } from "@/components/ui/card";

/** Centered single-card layout for the signed-out and onboarding screens. */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <p className="text-xl font-extrabold tracking-tight">
          <span aria-hidden>🧋 </span>
          Boba <span className="text-primary">Buds</span>
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
