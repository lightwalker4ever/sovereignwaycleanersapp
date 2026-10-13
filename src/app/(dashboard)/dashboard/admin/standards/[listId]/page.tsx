import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EditableTextCell } from "@/components/admin/EditableTextCell";
import { StandardRowActions } from "@/components/admin/StandardRowActions";
import { CreateStandardForm } from "@/components/admin/CreateStandardForm";
import { getStandardList, updateStandardListField, updateStandardField } from "../actions";

export default async function StandardListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const list = await getStandardList(listId);
  if (!list) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/admin/standards" className="text-sm text-gray-500 hover:underline">
          ← Standards
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{list.name}</h1>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>List details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Name</p>
            <EditableTextCell
              value={list.name}
              onSave={updateStandardListField.bind(null, list.id, "name")}
            />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Description
            </p>
            <EditableTextCell
              value={list.description}
              placeholder="Add a description"
              onSave={updateStandardListField.bind(null, list.id, "description")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Standards</CardTitle>
          <CardDescription>What a cleaner needs to photograph to meet this list.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreateStandardForm listId={list.id} />

          <div className="divide-y divide-gray-100 rounded-lg ring-1 ring-foreground/10">
            {list.standards.map((standard, index) => (
              <div key={standard.id} className="flex items-start gap-3 p-3">
                <StandardRowActions
                  standardId={standard.id}
                  listId={list.id}
                  isFirst={index === 0}
                  isLast={index === list.standards.length - 1}
                />
                <div className="flex-1 space-y-1">
                  <EditableTextCell
                    value={standard.title}
                    onSave={updateStandardField.bind(null, standard.id, list.id, "title")}
                  />
                  <EditableTextCell
                    value={standard.description}
                    placeholder="Add a description"
                    onSave={updateStandardField.bind(null, standard.id, list.id, "description")}
                  />
                </div>
              </div>
            ))}
            {list.standards.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-400">No standards yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
