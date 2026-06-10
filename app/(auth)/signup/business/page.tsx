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

export default function BusinessSignupPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign up as a business</CardTitle>
        <CardDescription>
          Hire talent through AI-powered interviews.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <GoogleAuthButton role="business" label="Sign up with Google" />
      </CardContent>
      <CardFooter className="text-muted-foreground flex-col gap-2 text-sm">
        <Link href="/signup" className="hover:underline">
          Are you a candidate? Sign up here
        </Link>
        <Link href="/login" className="hover:underline">
          Already have an account? Log in
        </Link>
      </CardFooter>
    </Card>
  );
}
