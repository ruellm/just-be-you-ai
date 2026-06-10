"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { provisionUserSchema, type ProvisionUserValues } from "./schemas";
import { provisionUser } from "./actions";

function generatePassword(): string {
  // Ambiguity-free charset; guarantee at least one digit.
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  let pw = Array.from(bytes, (n) => chars[n % chars.length]).join("");
  if (!/\d/.test(pw)) pw = `${pw.slice(0, -1)}7`;
  return pw;
}

export function CreateUserForm() {
  const [created, setCreated] = useState<{ email: string; password: string } | null>(
    null
  );

  const form = useForm<ProvisionUserValues>({
    resolver: zodResolver(provisionUserSchema),
    defaultValues: {
      role: "business",
      email: "",
      fullName: "",
      companyName: "",
      password: "",
    },
  });

  const role = form.watch("role");

  async function onSubmit(values: ProvisionUserValues) {
    const result = await provisionUser(values);
    if (result.success) {
      setCreated({ email: values.email, password: values.password });
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof ProvisionUserValues, { message });
      }
    }
    if (result.error) toast.error(result.error);
  }

  if (created) {
    return (
      <div className="max-w-md space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <p className="font-medium">User created</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Email</p>
          <p className="text-sm font-medium">{created.email}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Temporary password</p>
          <div className="flex items-center gap-2">
            <code className="bg-muted rounded px-2 py-1 text-sm">
              {created.password}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(created.password);
                toast.success("Password copied");
              }}
            >
              <Copy /> Copy
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Copy this password and share it with the user. They&apos;ll be required
          to change it on first login. This password will not be shown again.
        </p>
        <Button asChild variant="outline">
          <Link href="/admin/users">Back to users</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-6">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="Juan Dela Cruz" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {role === "business" ? (
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Inc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temporary password</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    form.setValue("password", generatePassword(), {
                      shouldValidate: true,
                    })
                  }
                >
                  <RefreshCw /> Generate
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating…" : "Create user"}
        </Button>
      </form>
    </Form>
  );
}
