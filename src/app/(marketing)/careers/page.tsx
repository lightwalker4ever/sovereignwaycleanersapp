import type { Metadata } from "next";
import { CareersIntro } from "@/components/careers/CareersIntro";
import { JobPostingsList } from "@/components/careers/JobPostingsList";
import { ContractorPoolCallout } from "@/components/careers/ContractorPoolCallout";
import { getCareersPipelineTeaser } from "@/lib/app-settings";

export const metadata: Metadata = {
  title: "Careers — Sovereign Way Cleaners",
  description: "Join Sovereign Way Cleaners as an employee, or apply to our approved contractor pool.",
};

export default async function CareersPage() {
  const pipelineTeaser = await getCareersPipelineTeaser();

  return (
    <>
      <CareersIntro pipelineTeaser={pipelineTeaser} />
      <JobPostingsList />
      <ContractorPoolCallout />
    </>
  );
}
