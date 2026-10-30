import type { Metadata } from "next";
import { ContractorEvidenceUpload } from "@/components/careers/ContractorEvidenceUpload";

export const metadata: Metadata = {
  title: "Upload your documents — Sovereign Way Cleaners",
};

export default function CareersEvidencePage() {
  return <ContractorEvidenceUpload />;
}
