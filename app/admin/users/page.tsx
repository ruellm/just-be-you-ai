import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Welcome, {user?.email}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Role: {role}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Coming soon: manage users and companies across the platform.
        </CardContent>
      </Card>
    </div>
  );
}
