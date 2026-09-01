"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { MODAL_INPUT, MODAL_TEXTAREA, Req } from "@/components/profile/FormModal";
import {
  BTN_INK,
  BTN_PRIMARY,
  ProfileSectionCard,
  ProfileSectionHeader,
} from "@/app/candidate/profile/ProfileSectionCard";
import {
  DESCRIPTION_MAX,
  VERTICALS,
  questionSetSchema,
  type QuestionSetValues,
} from "./schemas";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createQuestionSet, updateQuestionSet } from "./actions";

const LABEL = "text-small font-semibold text-brand-ink";
const INPUT = cn(MODAL_INPUT, "h-9");
const ICON_BTN =
  "flex size-6 items-center justify-center rounded-full border transition-colors disabled:opacity-40";

export function QuestionSetForm({
  mode,
  questionSetId,
  defaultValues,
}: {
  mode: "create" | "edit";
  questionSetId?: string;
  defaultValues: QuestionSetValues;
}) {
  const router = useRouter();
  const form = useForm<QuestionSetValues>({
    resolver: zodResolver(questionSetSchema),
    defaultValues,
  });
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "questions",
  });
  const descriptionLength = form.watch("description")?.length ?? 0;

  async function onSubmit(values: QuestionSetValues) {
    const result =
      mode === "create"
        ? await createQuestionSet(values)
        : await updateQuestionSet(questionSetId as string, values);

    if (result.success) {
      toast.success(mode === "create" ? "Question set created" : "Saved");
      router.push("/admin/ai-config");
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof QuestionSetValues, { message });
      }
    }
    toast.error(result.error ?? "Could not save.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ProfileSectionCard>
          <h2 className="text-heading font-semibold text-brand-primary">
            Basic Information
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>
                    Name
                    <Req />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="IT — Software Engineering"
                      className={INPUT}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vertical"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Vertical</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={cn(INPUT, "w-full")}>
                        <SelectValue placeholder="Select a vertical" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-[8px] border-brand-border font-body">
                      {VERTICALS.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL}>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    maxLength={DESCRIPTION_MAX}
                    className={cn(MODAL_TEXTAREA, "min-h-[96px] resize-y")}
                    {...field}
                  />
                </FormControl>
                <div className="flex items-start justify-between gap-4">
                  <FormMessage />
                  <p
                    className={cn(
                      "ml-auto text-meta",
                      descriptionLength > DESCRIPTION_MAX
                        ? "text-accent-2"
                        : "text-brand-ink-secondary"
                    )}
                  >
                    {descriptionLength}/{DESCRIPTION_MAX} characters
                  </p>
                </div>
              </FormItem>
            )}
          />
        </ProfileSectionCard>

        <ProfileSectionCard>
          <ProfileSectionHeader
            title="Question Sets"
            subtitle="Questions are asked in the order shown below."
            action={
              <Button
                type="button"
                onClick={() => append({ text: "" })}
                className={BTN_PRIMARY}
              >
                <Plus className="size-4" /> Add Question
              </Button>
            }
          />

          {fields.length === 0 ? (
            <p className="text-small text-brand-ink-secondary">
              No questions yet — add one above.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="flex items-start gap-3">
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-meta font-semibold text-white">
                    {index + 1}
                  </span>
                  <FormField
                    control={form.control}
                    name={`questions.${index}.text`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="Question text…"
                            className={cn(MODAL_TEXTAREA, "min-h-[72px] resize-y")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label="Move up"
                      className={cn(
                        ICON_BTN,
                        "border-brand-primary text-brand-primary hover:bg-brand-container"
                      )}
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label="Move down"
                      className={cn(
                        ICON_BTN,
                        "border-brand-primary text-brand-primary hover:bg-brand-container"
                      )}
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    {/* Local form op, not a server action: this drops a
                        useFieldArray entry and nothing persists until the set
                        is saved. ConfirmDialog (not ConfirmDelete) because
                        there is no async action to await and no toast to fire. */}
                    <ConfirmDialog
                      icon={Trash2}
                      title="Delete Question"
                      description="This removes the question from this set. Nothing is saved until you save the question set."
                      confirmLabel="Delete Question"
                      contentClassName="sm:max-w-[693px]"
                      onConfirm={() => remove(index)}
                      trigger={
                        <button
                          type="button"
                          aria-label="Remove"
                          className={cn(
                            ICON_BTN,
                            "border-accent-2 bg-accent-2 text-white hover:bg-accent-2/90"
                          )}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProfileSectionCard>

        <div className="flex justify-center gap-3">
          <Button asChild className={BTN_INK}>
            <Link href="/admin/ai-config">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className={BTN_PRIMARY}
          >
            {form.formState.isSubmitting
              ? "Saving…"
              : mode === "create"
                ? "Create Question Set"
                : "Edit Question Set"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
