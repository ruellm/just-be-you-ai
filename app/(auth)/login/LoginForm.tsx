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
import { signInWithPassword } from "./actions";

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium tracking-[0.6px] text-brand-ink-secondary uppercase">
                Email
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    className="h-14 rounded-[8px] border-brand-border bg-brand-surface pr-11"
                    {...field}
                  />
                </FormControl>
                <AtSign className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-brand-ink-secondary/70" />
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
              <FormLabel className="text-xs font-medium tracking-[0.6px] text-brand-ink-secondary uppercase">
                Password
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    className="h-14 rounded-[8px] border-brand-border bg-brand-surface pr-11"
                    {...field}
                  />
                </FormControl>
                <Lock className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-brand-ink-secondary/70" />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full rounded-[8px] bg-brand-secondary text-white shadow-sm hover:bg-brand-secondary/90"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <Link
          href="/forgot-password"
          className="block text-center text-sm text-brand-ink-secondary hover:text-brand-primary"
        >
          Forgot password?
        </Link>
      </form>
    </Form>
  );
}
