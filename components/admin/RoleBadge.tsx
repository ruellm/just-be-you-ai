import type { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<Role, string> = {
  candidate: "Candidate",
  business: "Business",
  admin: "Admin",
};

const ROLE_CLASS: Record<Role, string> = {
  candidate: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  business:
    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  admin: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge className={cn("border-transparent", ROLE_CLASS[role])}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
