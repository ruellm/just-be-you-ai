"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AtSign, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_LINK,
  AUTH_PRIMARY_BUTTON,
} from "@/components/auth/AuthCard";
import { signInWithPassword } from "./actions";

// THE real sign-in form — businesses AND admins both authenticate through it.
// v2 restyled the presentation only; the schema, the signInWithPassword call,
// the redirect and the error handling below are unchanged.
const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    const result = await signInWithPassword(values.email, values.password);
    if ("redirectTo" in result) {
      router.push(result.redirectTo);
      return;
    }
    form.setError("root", { message: result.error });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={AUTH_LABEL}>Email Address</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    className={AUTH_INPUT}
                    {...field}
                  />
                </FormControl>
                <AtSign
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-brand-ink-secondary/70"
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-3">
                <FormLabel className={AUTH_LABEL}>Password</FormLabel>
                <Link href="/forgot-password" className={`text-small ${AUTH_LINK}`}>
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    className={AUTH_INPUT}
                    {...field}
                  />
                </FormControl>
                <Lock
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-brand-ink-secondary/70"
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root ? (
          <p className="text-destructive text-small">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <Button
          type="submit"
          className={AUTH_PRIMARY_BUTTON}
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </Form>
  );
}
