"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  BTN_INK,
  BTN_PRIMARY,
  ProfileSectionCard,
} from "@/app/candidate/profile/ProfileSectionCard";
import { MODAL_INPUT, MODAL_LABEL, Req } from "@/components/profile/FormModal";
import { provisionUserSchema, type ProvisionUserValues } from "./schemas";
import { provisionUser } from "./actions";

const FIELD_LABEL = "text-sm font-semibold text-brand-ink";
const FIELD_INPUT = cn(MODAL_INPUT, "h-9");

function generatePassword(): string {
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
  const [showPassword, setShowPassword] = useState(false);

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
      <ProfileSectionCard className="max-w-xl">
        <div className="space-y-4">
          <div className="rounded-[12px] border border-brand-border bg-status-success p-4">
            <p className="text-sm font-semibold text-brand-ink">User created</p>
          </div>
          <div className="space-y-1">
            <p className={MODAL_LABEL}>Email</p>
            <p className="text-sm font-medium text-brand-ink">{created.email}</p>
          </div>
          <div className="space-y-1">
            <p className={MODAL_LABEL}>Temporary password</p>
            <div className="flex items-center gap-2">
              <code className="rounded-[8px] border border-brand-border bg-brand-container px-3 py-1.5 text-sm text-brand-ink">
                {created.password}
              </code>
              <Button
                type="button"
                size="sm"
                className={cn(BTN_INK, "h-8 px-3 text-xs")}
                onClick={() => {
                  navigator.clipboard.writeText(created.password);
                  toast.success("Password copied");
                }}
              >
                <Copy /> Copy
              </Button>
            </div>
          </div>
          <p className="text-sm text-brand-ink-secondary">
            Copy this password and share it with the user. They&apos;ll be
            required to change it on first login. This password will not be
            shown again.
          </p>
          <Button asChild className={BTN_PRIMARY}>
            <Link href="/admin/users">Back to Users</Link>
          </Button>
        </div>
      </ProfileSectionCard>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ProfileSectionCard>
          <h2 className="text-2xl font-semibold text-brand-primary">
            Basic Information
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={FIELD_LABEL}>
                    Full Name
                    <Req />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Juan Dela Cruz"
                      className={FIELD_INPUT}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={FIELD_LABEL}>
                    Email
                    <Req />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@company.com"
                      className={FIELD_INPUT}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={FIELD_LABEL}>
                    Password
                    <Req />
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        className={cn(FIELD_INPUT, "pr-[130px]")}
                        {...field}
                      />
                    </FormControl>
                    <div className="absolute inset-y-0 right-1.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                        className="flex size-6 items-center justify-center text-brand-border hover:text-brand-ink-secondary"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-6 rounded-[5px] bg-brand-ink px-3 text-xs font-semibold text-white hover:bg-brand-ink/90"
                        onClick={() =>
                          form.setValue("password", generatePassword(), {
                            shouldValidate: true,
                          })
                        }
                      >
                        <RefreshCw className="size-3" /> Generate
                      </Button>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={FIELD_LABEL}>
                    User Role
                    <Req />
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={cn(FIELD_INPUT, "w-full")}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-[8px] border-brand-border font-body">
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <FormLabel className={FIELD_LABEL}>
                      Company Name
                      <Req />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Inc."
                        className={FIELD_INPUT}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>
        </ProfileSectionCard>

        <div className="flex justify-center gap-3">
          <Button asChild className={BTN_INK}>
            <Link href="/admin/users">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className={BTN_PRIMARY}
          >
            {form.formState.isSubmitting ? "Creating…" : "Create User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
