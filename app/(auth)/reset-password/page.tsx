import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  // The reset link establishes a recovery session via /auth/callback. If there
  // is no session, the link was invalid or expired.
  const user = await getCurrentUser();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-heading">Reset password</CardTitle>
        <CardDescription>
          {user
            ? "Choose a new password for your account."
            : "This reset link is invalid or has expired."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <ResetPasswordForm />
        ) : (
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground block text-center text-small underline"
          >
            Request a new reset link
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
