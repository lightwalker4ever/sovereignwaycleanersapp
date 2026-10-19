import { notFound } from "next/navigation";
import { getMyCleaningDetail } from "../actions";
import { CleanerJobWorkspace } from "@/components/cleaner/CleanerJobWorkspace";

export default async function CleanerCleaningDetailPage({
  params,
}: {
  params: Promise<{ cleaningId: string }>;
}) {
  const { cleaningId } = await params;
  const cleaning = await getMyCleaningDetail(cleaningId);
  if (!cleaning) notFound();

  return <CleanerJobWorkspace cleaning={cleaning} />;
}
