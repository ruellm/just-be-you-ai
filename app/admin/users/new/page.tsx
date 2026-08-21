import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateUserForm } from "./CreateUserForm";

export default function NewUserPage() {
  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Users
      </Link>
      <div className="border-b border-brand-border pb-5">
        <h1 className="text-page-title font-semibold tracking-[-0.5px] text-brand-primary">
          Create a New User
        </h1>
        <p className="mt-3 text-body text-brand-ink-secondary">
          Provision a business or admin account. Candidates sign up themselves
          with Google.
        </p>
      </div>
      <CreateUserForm />
    </div>
  );
}
