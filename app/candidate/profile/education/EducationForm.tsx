"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import {
  FormModalBody,
  FormModalFooter,
  MODAL_CHECK_LABEL,
  MODAL_CHECKBOX,
  MODAL_INPUT,
  MODAL_LABEL,
  MODAL_PAIR,
  ModalDateInput,
  Req,
} from "@/components/profile/FormModal";
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
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormModalBody>
          <FormField
            control={form.control}
            name="school"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={MODAL_LABEL}>
                  School / University
                  <Req />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="University of the Philippines"
                    maxLength={FIELD_LIMITS.school}
                    className={MODAL_INPUT}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className={MODAL_PAIR}>
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={MODAL_LABEL}>Country</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Philippines"
                      maxLength={FIELD_LIMITS.location}
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
              name="degree"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={MODAL_LABEL}>Degree</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="BS Computer Science"
                      maxLength={FIELD_LIMITS.degree}
                      className={MODAL_INPUT}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="fieldOfStudy"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={MODAL_LABEL}>Field of Study</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Computer Science"
                    maxLength={FIELD_LIMITS.fieldOfStudy}
                    className={MODAL_INPUT}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <ModalDateInput disabled={currentlyStudying} {...field} />
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
              <FormItem className="flex flex-row items-center gap-2.5">
                <FormControl>
                  <Checkbox
                    className={MODAL_CHECKBOX}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel className={cn("!mt-0", MODAL_CHECK_LABEL)}>
                  I currently study here
                </FormLabel>
              </FormItem>
            )}
          />
        </FormModalBody>
        <FormModalFooter
          saveLabel="Save Education"
          pending={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
}
