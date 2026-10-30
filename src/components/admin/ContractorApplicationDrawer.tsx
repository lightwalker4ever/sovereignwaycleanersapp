"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
  DrawerSection,
} from "@/components/ui/Drawer";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getContractorApplicationDetail,
  requestContractorEvidence,
  approveContractorApplication,
  rejectContractorApplication,
  type ContractorApplicationDetail,
} from "@/app/(dashboard)/dashboard/admin/recruitment/actions";
import { RECRUITMENT_PERIODS, RECRUITMENT_DAYS, RECRUITMENT_DAY_LABEL, AREA_OF_EXPERIENCE_LABEL } from "@/lib/recruitment-config";

type Mode = "view" | "request-evidence" | "approve" | "reject";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  evidence_requested: "Evidence requested",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

export function ContractorApplicationDrawer({
  applicationId,
  open,
  onOpenChange,
}: {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<ContractorApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [evidenceNote, setEvidenceNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode("view");
    setError(null);
    setEvidenceNote("");
    setRejectReason("");
    setLoading(true);
    getContractorApplicationDetail(applicationId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [open, applicationId]);

  function handleRequestEvidence() {
    setError(null);
    startTransition(async () => {
      const result = await requestContractorEvidence(applicationId, evidenceNote);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveContractorApplication(applicationId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectContractorApplication(applicationId, rejectReason);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const decided = detail?.status === "approved" || detail?.status === "rejected";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{detail ? detail.reference : "Contractor application"}</DrawerTitle>
          <DrawerClose />
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-dash-muted">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && detail && (
            <>
              <DrawerSection label="Status">
                <Badge variant={decided ? (detail.status === "approved" ? "default" : "destructive") : "outline"}>
                  {STATUS_LABEL[detail.status] ?? detail.status}
                </Badge>
              </DrawerSection>

              <DrawerSection label="Contact">
                <p className="text-sm text-dash-ink">{detail.fullName}</p>
                <p className="text-sm text-dash-muted">{detail.email}</p>
                <p className="text-sm text-dash-muted">{detail.phone}</p>
                <p className="text-sm text-dash-muted whitespace-pre-wrap">{detail.address}</p>
              </DrawerSection>

              <DrawerSection label="Documents declared">
                <ul className="list-inside list-disc text-sm text-dash-ink">
                  <li>DBS check: {detail.hasDbs ? "Yes" : "No"}</li>
                  <li>Product & Public Liability insurance: {detail.hasLiabilityInsurance ? "Yes" : "No"}</li>
                  <li>ISO certificate: {detail.hasIso ? "Yes" : "No"}</li>
                </ul>
                {detail.otherEvidenceNotes && <p className="mt-1 text-sm text-dash-muted">Other: {detail.otherEvidenceNotes}</p>}
              </DrawerSection>

              <DrawerSection label="Experience">
                <p className="text-sm text-dash-ink">{detail.yearsExperience} years operating in the industry</p>
                <p className="mt-1 text-sm text-dash-muted">
                  {detail.areasOfExperience.map((a) => AREA_OF_EXPERIENCE_LABEL[a] ?? a).join(", ") || "—"}
                  {detail.otherAreaOfExperience ? ` · ${detail.otherAreaOfExperience}` : ""}
                </p>
              </DrawerSection>

              <DrawerSection label="Business structure">
                <p className="text-sm text-dash-ink">
                  {detail.businessStructure === "company" ? "Company" : "Sole trader"}
                  {detail.businessStructure === "company" && detail.companyEmployeeCount !== null
                    ? ` · ${detail.companyEmployeeCount} employee${detail.companyEmployeeCount === 1 ? "" : "s"}`
                    : ""}
                </p>
              </DrawerSection>

              <DrawerSection label="Availability">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[360px] border-collapse text-center text-xs">
                    <thead>
                      <tr>
                        <th className="w-20" />
                        {RECRUITMENT_DAYS.map((day) => (
                          <th key={day} className="pb-1 font-bold text-dash-muted">
                            {RECRUITMENT_DAY_LABEL[day]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RECRUITMENT_PERIODS.map((period) => (
                        <tr key={period.key}>
                          <td className="py-1 pr-1 text-left">
                            <span className="block font-semibold text-dash-muted">{period.label}</span>
                            <span className="block text-[10px] text-dash-muted">{period.time}</span>
                          </td>
                          {RECRUITMENT_DAYS.map((day) => {
                            const on = detail.availability.some((a) => a.dayOfWeek === day && a.periodKey === period.key);
                            return (
                              <td key={day} className="p-0.5">
                                <span
                                  className="inline-block h-6 w-6 rounded border border-dash-border-soft"
                                  style={on ? { backgroundColor: "var(--color-brand, #1e6b45)" } : undefined}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DrawerSection>

              {detail.notes && (
                <DrawerSection label="Additional notes">
                  <p className="text-sm whitespace-pre-wrap text-dash-ink">{detail.notes}</p>
                </DrawerSection>
              )}

              {detail.evidenceRequestedAt && (
                <DrawerSection label="Evidence requested">
                  <p className="text-sm whitespace-pre-wrap text-dash-ink">{detail.evidenceNotes}</p>
                  <p className="mt-1 text-xs text-dash-muted">
                    {detail.evidenceSubmittedAt ? "Submitted by applicant" : "Waiting on applicant"}
                  </p>
                </DrawerSection>
              )}

              {detail.documents.length > 0 && (
                <DrawerSection label="Uploaded documents">
                  <ul className="flex flex-col gap-1.5">
                    {detail.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2 text-sm">
                        <FileText size={14} className="shrink-0 text-dash-muted" aria-hidden="true" />
                        {doc.signedUrl ? (
                          <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="text-dash-brand-700 underline">
                            {doc.originalFilename}
                          </a>
                        ) : (
                          <span className="text-dash-muted">{doc.originalFilename}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </DrawerSection>
              )}

              {mode === "request-evidence" && (
                <DrawerSection label="Request evidence">
                  <Textarea
                    autoFocus
                    rows={4}
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    placeholder="e.g. Please provide your Public Liability certificate and DBS if you have one."
                  />
                </DrawerSection>
              )}

              {mode === "approve" && (
                <DrawerSection label="Approve this application">
                  <p className="text-sm text-dash-ink">
                    This creates a cleaner account for {detail.fullName} and emails them that their application was
                    approved. You&apos;ll still need to hand them their login details separately via Staff.
                  </p>
                </DrawerSection>
              )}

              {mode === "reject" && (
                <DrawerSection label="Reject this application">
                  <Textarea
                    autoFocus
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Internal note -- not shown to the applicant"
                  />
                </DrawerSection>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}

          {!loading && !detail && <p className="text-sm text-dash-muted">Application not found.</p>}
        </div>

        {!loading && detail && !decided && (
          <DrawerFooter>
            {mode === "view" && (
              <div className="flex w-full flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("approve")}
                  className="h-11 rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setMode("request-evidence")}
                  className="h-11 rounded-[10px] border border-dash-input-border bg-white text-sm font-semibold text-dash-ink"
                >
                  Request evidence
                </button>
                <button
                  type="button"
                  onClick={() => setMode("reject")}
                  className="h-11 rounded-[10px] border border-dash-danger text-sm font-semibold text-dash-danger"
                >
                  Reject
                </button>
              </div>
            )}
            {mode === "request-evidence" && (
              <div className="flex w-full gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="h-11 flex-1 rounded-[10px] border border-dash-input-border text-sm font-semibold text-dash-ink"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleRequestEvidence}
                  disabled={pending}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white disabled:opacity-60"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Send
                </button>
              </div>
            )}
            {mode === "approve" && (
              <div className="flex w-full gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="h-11 flex-1 rounded-[10px] border border-dash-input-border text-sm font-semibold text-dash-ink"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={pending}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white disabled:opacity-60"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Confirm approve
                </button>
              </div>
            )}
            {mode === "reject" && (
              <div className="flex w-full gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="h-11 flex-1 rounded-[10px] border border-dash-input-border text-sm font-semibold text-dash-ink"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={pending}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-dash-danger text-sm font-bold text-white disabled:opacity-60"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Confirm reject
                </button>
              </div>
            )}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
