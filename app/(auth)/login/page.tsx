import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <GoogleAuthButton label="Sign in with Google" />
      </CardContent>
      <CardFooter className="text-muted-foreground flex-col gap-2 text-sm">
        <Link href="/signup" className="hover:underline">
          New candidate? Sign up
        </Link>
        <Link href="/signup/business" className="hover:underline">
          New business? Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
