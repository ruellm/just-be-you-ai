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
  ProjectSkillsPicker,
} from "@/components/profile/ProjectSkillsPicker";
import type { SkillOption } from "@/components/profile/SkillCombobox";
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
import { FIELD_LIMITS, projectSchema, type ProjectValues } from "../schemas";
import { saveProject } from "./actions";
import type { ProjectDTO } from "./ProjectsSection";

const EMPTY: ProjectValues = {
  name: "",
  url: "",
  startDate: "",
  endDate: "",
  ongoing: false,
  description: "",
  skillIds: [],
};

export function ProjectForm({
  project,
  skillOptions,
  onSuccess,
}: {
  project: ProjectDTO | null;
  skillOptions: SkillOption[];
  onSuccess: () => void;
}) {
  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
      ? {
          name: project.name,
          url: project.url,
          startDate: project.startDate,
          endDate: project.endDate,
          ongoing: project.ongoing,
          description: project.description,
          skillIds: project.skillIds,
        }
      : EMPTY,
  });

  const ongoing = form.watch("ongoing");

  async function onSubmit(values: ProjectValues) {
    const result = await saveProject(values, project?.id);
    if (result.success) {
      toast.success(project ? "Project updated" : "Project added");
      onSuccess();
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof ProjectValues, { message });
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={MODAL_LABEL}>
                  Project Name
                  <Req />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Internal dashboard"
                    maxLength={FIELD_LIMITS.projectName}
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
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={MODAL_LABEL}>
                  URL
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://example.com"
                    maxLength={FIELD_LIMITS.url}
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
                    <ModalDateInput disabled={ongoing} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="ongoing"
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
                  This project is ongoing
                </FormLabel>
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
                    rows={3}
                    maxLength={FIELD_LIMITS.description}
                    className={MODAL_TEXTAREA}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="skillIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={MODAL_LABEL}>Skills Used</FormLabel>
                <ProjectSkillsPicker
                  skills={skillOptions}
                  value={field.value}
                  onChange={field.onChange}
                  triggerClassName={cn(
                    MODAL_INPUT,
                    "justify-between hover:bg-brand-surface"
                  )}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </FormModalBody>
        <FormModalFooter
          saveLabel="Save Project"
          pending={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
}
