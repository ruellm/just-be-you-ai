"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  FormModalBody,
  FormModalContent,
  FormModalFooter,
  MODAL_INPUT,
  MODAL_LABEL,
  Req,
} from "./FormModal";

// Shared "Edit Profile Image" modal — used by BOTH the candidate profile
// (writes profileImageUrl) and the business company profile (writes logoUrl).
// It is a URL input, not an upload: no storage, no image processing.
//
// The modal does NOT call a server action. It hands the validated URL back to
// the caller, which puts it into its react-hook-form state; the page's existing
// sticky save bar then persists it through saveBasicInfo / saveCompany. That
// keeps one write path per page and leaves the save-bar behaviour untouched.

const MAX_URL = 300;

const profileImageSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Profile image URL is required")
    .url("Enter a valid URL")
    .max(MAX_URL, `Keep it under ${MAX_URL} characters`),
});

type ProfileImageValues = z.infer<typeof profileImageSchema>;

export function ProfileImageModal({
  value,
  onSubmit,
  trigger,
  label = "Profile Image URL",
}: {
  /** Current URL, pre-filled when the modal opens. */
  value: string;
  /** Receives the validated URL; the caller decides where to store it. */
  onSubmit: (url: string) => void;
  trigger: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<ProfileImageValues>({
    resolver: zodResolver(profileImageSchema),
    defaultValues: { url: value },
  });

  // Re-seed from the caller each time the modal opens, so re-opening after a
  // cancel doesn't show a stale draft.
  useEffect(() => {
    if (open) form.reset({ url: value });
  }, [open, value, form]);

  function handleSave(values: ProfileImageValues) {
    onSubmit(values.url.trim());
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <FormModalContent icon={ImageIcon} title="Edit Profile Image" size="sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <FormModalBody>
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={MODAL_LABEL}>
                      {label}
                      <Req />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        maxLength={MAX_URL}
                        placeholder="e.g. https://example.com/image.png"
                        className={MODAL_INPUT}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormModalBody>
            {/* The design labels this "Edit Profile Image" (duplicating the
                title); "Save" matches every other modal in the app. */}
            <FormModalFooter saveLabel="Save" />
          </form>
        </Form>
      </FormModalContent>
    </Dialog>
  );
}
