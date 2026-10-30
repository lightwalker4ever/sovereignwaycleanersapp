import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CreateJobPostingForm } from "@/components/admin/CreateJobPostingForm";
import { JobPostingRow } from "@/components/admin/JobPostingRow";
import { listJobPostings } from "./actions";
import { PageContainer } from "@/components/shell/PageContainer";

export default async function JobPostingsPage() {
  const postings = await listJobPostings();

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Open roles shown on the public Careers page. Close a posting to hide it without deleting it.
        </p>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Postings</CardTitle>
          <CardDescription>Deliberately simple -- just title, summary, location, and a description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreateJobPostingForm />

          <div className="divide-y divide-gray-100 rounded-lg ring-1 ring-foreground/10">
            {postings.map((posting) => (
              <JobPostingRow key={posting.id} posting={posting} />
            ))}
            {postings.length === 0 && <p className="p-4 text-center text-sm text-gray-400">No job postings yet.</p>}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
