"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FIELD_LIMITS, summarySchema, type SummaryValues } from "../schemas";
import { saveSummary } from "../actions";

export function SummaryForm({ defaultValue }: { defaultValue: string }) {
  const form = useForm<SummaryValues>({
    resolver: zodResolver(summarySchema),
    defaultValues: { summary: defaultValue },
  });

  async function onSubmit(values: SummaryValues) {
    const result = await saveSummary(values);
    if (result.success) {
      toast.success("Profile updated");
      form.reset(values);
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof SummaryValues, { message });
      }
    }
    toast.error(result.error ?? "Could not save your changes.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile summary</FormLabel>
              <FormControl>
                <Textarea rows={6} maxLength={FIELD_LIMITS.summary} {...field} />
              </FormControl>
              <FormDescription>
                Tell employers about yourself — your background, what you&apos;re
                looking for, what makes you stand out.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save"}
        </Button>
      </form>
    </Form>
  );
}
