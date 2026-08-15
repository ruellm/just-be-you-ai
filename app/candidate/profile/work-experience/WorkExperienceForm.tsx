"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormModalBody,
  FormModalFooter,
  MODAL_CHECK_LABEL,
  MODAL_CHECKBOX,
  MODAL_INPUT,
  MODAL_LABEL,
  MODAL_PAIR,
  MODAL_TEXTAREA,
  ModalDateInput,
  Req,
} from "@/components/profile/FormModal";
import {
  EMPLOYMENT_TYPE_LABELS,
  FIELD_LIMITS,
  workExperienceSchema,
  type EmploymentTypeValue,
  type WorkExperienceValues,
} from "../schemas";
import { saveWorkExperience } from "./actions";
import type { WorkExperienceDTO } from "./WorkExperienceSection";

const EMPTY: WorkExperienceValues = {
  position: "",
  companyName: "",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  employmentType: "full_time",
  description: "",
};

const EMPLOYMENT_TYPES = Object.keys(
  EMPLOYMENT_TYPE_LABELS
) as EmploymentTypeValue[];

export function WorkExperienceForm({
  entry,
  onSuccess,
}: {
  entry: WorkExperienceDTO | null;
  onSuccess: () => void;
}) {
  const form = useForm<WorkExperienceValues>({
    resolver: zodResolver(workExperienceSchema),
    defaultValues: entry
      ? {
          position: entry.position,
          companyName: entry.companyName,
          startDate: entry.startDate,
          endDate: entry.endDate,
          currentlyWorking: entry.currentlyWorking,
          employmentType: entry.employmentType,
          description: entry.description,
        }
      : EMPTY,
  });

  const currentlyWorking = form.watch("currentlyWorking");

  async function onSubmit(values: WorkExperienceValues) {
    const result = await saveWorkExperience(values, entry?.id);
    if (result.success) {
      toast.success(entry ? "Work experience updated" : "Work experience added");
      onSuccess();
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof WorkExperienceValues, { message });
      }
    }
    toast.error(result.error ?? "Could not save your changes.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormModalBody>
          <div className={MODAL_PAIR}>
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={MODAL_LABEL}>
                    Position
                    <Req />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Software Engineer"
                      maxLength={FIELD_LIMITS.position}
                      className={MODAL_INPUT}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={MODAL_LABEL}>
                    Company
                    <Req />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme Inc."
                      maxLength={FIELD_LIMITS.companyName}
                      className={MODAL_INPUT}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className={MODAL_PAIR}>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={MODAL_LABEL}>Start Date</FormLabel>
                  <FormControl>
                    <ModalDateInput {...field} />
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
                  <FormLabel className={MODAL_LABEL}>End Date</FormLabel>
                  <FormControl>
                    <ModalDateInput disabled={currentlyWorking} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="currentlyWorking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2.5">
                <FormControl>
                  <Checkbox
                    className={MODAL_CHECKBOX}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel className={cn("!mt-0", MODAL_CHECK_LABEL)}>
                  I currently work here
                </FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={MODAL_LABEL}>Employment Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className={cn(MODAL_INPUT, "w-full")}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="font-body">
                    {EMPLOYMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {EMPLOYMENT_TYPE_LABELS[type]}
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
                <FormLabel className={MODAL_LABEL}>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    maxLength={FIELD_LIMITS.description}
                    className={MODAL_TEXTAREA}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormModalBody>
        <FormModalFooter
          saveLabel="Save Work Experience"
          pending={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
}
