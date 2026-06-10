"use client";

import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
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
import {
  VERTICALS,
  questionSetSchema,
  type QuestionSetValues,
} from "./schemas";
import { createQuestionSet, updateQuestionSet } from "./actions";

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="IT — Software Engineering" {...field} />
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
              <FormLabel>Vertical</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a vertical" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Questions</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ text: "" })}
            >
              <Plus /> Add question
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No questions yet — add one above.
            </p>
          ) : (
            <div className="space-y-2">
              {fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="flex items-start gap-2">
                  <span className="text-muted-foreground w-5 pt-2 text-right text-sm">
                    {index + 1}.
                  </span>
                  <FormField
                    control={form.control}
                    name={`questions.${index}.text`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Textarea rows={2} placeholder="Question text…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label="Move up"
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      aria-label="Remove"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save"}
        </Button>
      </form>
    </Form>
  );
}
