import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateUserForm } from "./CreateUserForm";

export default function NewUserPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <Link
        href="/admin/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to users
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Create user</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Provision a business or admin account. Candidates sign up themselves
          with Google.
        </p>
      </div>
      <CreateUserForm />
    </div>
  );
}
