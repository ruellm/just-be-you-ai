"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { projectSchema, type ProjectValues } from "../schemas";
import { saveProject } from "./actions";
import type { ProjectDTO } from "./WorkExperienceSection";

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
  workExperienceId,
  project,
  skillOptions,
  onSuccess,
}: {
  workExperienceId: string;
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
    const result = await saveProject(workExperienceId, values, project?.id);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project name</FormLabel>
              <FormControl>
                <Input placeholder="Internal dashboard" {...field} />
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
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  <Input type="date" disabled={ongoing} {...field} />
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
            <FormItem className="flex flex-row items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <FormLabel className="!mt-0">This project is ongoing</FormLabel>
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
                <Textarea rows={3} {...field} />
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
              <FormLabel>Skills used</FormLabel>
              <ProjectSkillsPicker
                skills={skillOptions}
                value={field.value}
                onChange={field.onChange}
              />
              <FormMessage />
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
