import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Candidates */}
        <section className="space-y-2">
          <p className="text-sm font-medium">Candidates</p>
          <GoogleAuthButton label="Sign in with Google" />
          <p className="text-muted-foreground text-sm">
            New candidate?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </p>
        </section>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card text-muted-foreground px-2 text-xs uppercase">
              Businesses &amp; Admins
            </span>
          </div>
        </div>

        {/* Businesses & admins */}
        <LoginForm />
      </CardContent>
    </Card>
  );
}
