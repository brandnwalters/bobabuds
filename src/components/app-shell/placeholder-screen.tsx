import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Temporary screen body used until each tab's real slice lands. */
export function PlaceholderScreen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="rounded-full bg-taro-100 px-2.5 py-1 text-sm text-taro">
              Coming soon
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">{children}</CardContent>
      </Card>
    </div>
  );
}
