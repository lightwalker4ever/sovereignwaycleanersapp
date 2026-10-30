import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getOpenJobPosting } from "@/lib/job-postings";
import { JobApplicationForm } from "@/components/careers/JobApplicationForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const posting = await getOpenJobPosting(id);
  if (!posting) return { title: "Role not found — Sovereign Way Cleaners" };
  return {
    title: `${posting.title} — Sovereign Way Cleaners`,
    description: posting.summary,
  };
}

export default async function JobPostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const posting = await getOpenJobPosting(id);
  if (!posting) notFound();

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
        <Link href="/careers" className="text-sm font-semibold" style={{ color: "var(--color-brand)" }}>
          ← Back to Careers
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{posting.title}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-gray-500">
          <MapPin size={15} aria-hidden="true" /> {posting.location}
        </p>
        <p className="mt-6 text-base leading-7 whitespace-pre-wrap text-gray-700">{posting.description}</p>

        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900">Apply for this role</h2>
          <div className="mt-4">
            <JobApplicationForm jobPostingId={posting.id} />
          </div>
        </div>
      </div>
    </section>
  );
}
