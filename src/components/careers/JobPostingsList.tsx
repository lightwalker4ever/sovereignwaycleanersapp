import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { getOpenJobPostings } from "@/lib/job-postings";

export async function JobPostingsList() {
  const postings = await getOpenJobPostings();

  if (postings.length === 0) {
    return (
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border-2 p-8 text-center sm:p-10" style={{ borderColor: "var(--color-brand-light)" }}>
            <div
              className="mx-auto inline-flex items-center justify-center rounded-full p-3"
              style={{ backgroundColor: "var(--color-brand-light)" }}
            >
              <Users size={24} style={{ color: "var(--color-brand)" }} aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              No open positions at the moment
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-600">
              We don&apos;t have any roles open right now, but we&apos;re growing. New positions
              are posted here as soon as they&apos;re available — check back soon, or explore
              joining our approved contractor network below.
            </p>
          </div>
        </div>
      </section>
    );
  }

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
        </div>
      </div>
    </section>
  );
}
