import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder for profile sections not built yet (Education, Skills, Work
// Experience, Projects). Replaced with real forms in a later step.
export function ComingSoon({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Coming soon.
      </CardContent>
    </Card>
  );
}
