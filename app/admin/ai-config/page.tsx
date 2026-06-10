import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/profile/ConfirmDelete";
import { deleteQuestionSet } from "./actions";

export default async function AiConfigPage() {
  const sets = await prisma.questionSet.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">AI Question Configuration</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            These question sets will power the AI interview in Phase 2.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/ai-config/new">
            <Plus /> Create new question set
          </Link>
        </Button>
      </div>

      {sets.length === 0 ? (
        <div className="space-y-3 py-12 text-center">
          <p className="text-muted-foreground text-sm">No question sets yet.</p>
          <Button asChild>
            <Link href="/admin/ai-config/new">Create a question set</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {sets.map((set) => (
            <Card key={set.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {set.name}
                    <Badge variant="secondary">{set.vertical}</Badge>
                  </CardTitle>
                  {set.description ? (
                    <p className="text-muted-foreground text-sm">
                      {set.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/ai-config/${set.id}/edit`}>Edit</Link>
                  </Button>
                  <ConfirmDelete
                    onConfirm={deleteQuestionSet.bind(null, set.id)}
                    title="Delete this question set?"
                    description="Its questions will be deleted too. This cannot be undone."
                    successMessage="Question set deleted"
                    trigger={
                      <Button variant="outline" size="sm">
                        Delete
                      </Button>
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {set._count.questions}{" "}
                {set._count.questions === 1 ? "question" : "questions"}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
