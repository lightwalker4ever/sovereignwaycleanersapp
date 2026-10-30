import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getOpenJobPostings } from "@/lib/job-postings";

export async function JobPostingsList() {
  const postings = await getOpenJobPostings();

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Open roles</h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Join the team directly -- see what we&apos;re currently hiring for.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-5">
          {postings.map((posting) => (
            <Link
              key={posting.id}
              href={`/careers/jobs/${posting.id}`}
              className="group flex items-center justify-between gap-4 rounded-2xl bg-gray-50 p-6 transition-colors hover:bg-gray-100"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{posting.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{posting.summary}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <MapPin size={13} aria-hidden="true" /> {posting.location}
                </p>
              </div>
              <ArrowRight
                size={20}
                className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-1"
                style={{ color: "var(--color-brand)" }}
                aria-hidden="true"
              />
            </Link>
          ))}
          {postings.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">
              No open roles right now -- check back soon, or apply to join our contractor pool below.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
