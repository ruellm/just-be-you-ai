"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { educationSchema, FIELD_LIMITS, type EducationValues } from "../schemas";
import { saveEducation } from "./actions";
import type { EducationDTO } from "./EducationSection";

const EMPTY: EducationValues = {
  school: "",
  country: "",
  degree: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  currentlyStudying: false,
};

export function EducationForm({
  entry,
  onSuccess,
}: {
  entry: EducationDTO | null;
  onSuccess: () => void;
}) {
  const form = useForm<EducationValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: entry
      ? {
          school: entry.school,
          country: entry.country,
          degree: entry.degree,
          fieldOfStudy: entry.fieldOfStudy,
          startDate: entry.startDate,
          endDate: entry.endDate,
          currentlyStudying: entry.currentlyStudying,
        }
      : EMPTY,
  });

  const currentlyStudying = form.watch("currentlyStudying");

  async function onSubmit(values: EducationValues) {
    const result = await saveEducation(values, entry?.id);
    if (result.success) {
      toast.success(entry ? "Education updated" : "Education added");
      onSuccess();
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof EducationValues, { message });
      }
    }
    toast.error(result.error ?? "Could not save your changes.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="school"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School / University</FormLabel>
              <FormControl>
                <Input
                  placeholder="University of the Philippines"
                  maxLength={FIELD_LIMITS.school}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="Philippines" maxLength={FIELD_LIMITS.location} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="degree"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Degree</FormLabel>
                <FormControl>
                  <Input
                    placeholder="BS Computer Science"
                    maxLength={FIELD_LIMITS.degree}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fieldOfStudy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Field of study</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Computer Science"
                    maxLength={FIELD_LIMITS.fieldOfStudy}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={currentlyStudying} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="currentlyStudying"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <FormLabel className="!mt-0">I currently study here</FormLabel>
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
