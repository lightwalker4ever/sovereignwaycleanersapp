"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  getContractorApplicationByToken,
  uploadContractorEvidenceDocument,
  removeContractorEvidenceDocument,
  markContractorEvidenceSubmitted,
  type ContractorEvidenceDetail,
} from "@/actions/recruitment";

type Step = "verify" | "upload" | "done";

export function ContractorEvidenceUpload() {
  return (
    <Suspense fallback={null}>
      <ContractorEvidenceUploadInner />
    </Suspense>
  );
}

function ContractorEvidenceUploadInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [phone, setPhone] = useState("");
  const [detail, setDetail] = useState<ContractorEvidenceDetail | null>(null);
  const [step, setStep] = useState<Step>("verify");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  function handleVerify() {
    if (!token) {
      setError("That link looks incomplete. Please use the link from your email.");
      return;
    }
    if (!phone.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await getContractorApplicationByToken(token, phone);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDetail(result.detail);
      setStep("upload");
    });
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || !detail) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadContractorEvidenceDocument(token, phone, formData);
      if (!result.success) {
        setError(result.error);
        continue;
      }
      setDetail((prev) => (prev ? { ...prev, documents: [...prev.documents, result.document] } : prev));
    }
    setUploading(false);
  }

  function handleRemove(documentId: string) {
    if (!detail) return;
    const previous = detail;
    setDetail({ ...detail, documents: detail.documents.filter((d) => d.id !== documentId) });
    startTransition(async () => {
      const result = await removeContractorEvidenceDocument(token, phone, documentId);
      if (!result.success) {
        setDetail(previous);
        setError(result.error);
      }
    });
  }

  function handleDone() {
    setError(null);
    startTransition(async () => {
      const result = await markContractorEvidenceSubmitted(token, phone);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStep("done");
    });
  }

  if (step === "verify") {
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-5 p-4 py-10 sm:p-8">
        <div>
          <h1 className="m-0 text-[24px] font-extrabold tracking-tight sm:text-[28px]">Upload your documents</h1>
          <p className="mt-1.5 text-[15px] text-gray-600">
            Enter the phone number from your application so we can confirm it&apos;s you.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <Label htmlFor="ce-phone">Phone Number</Label>
          <Input
            id="ce-phone"
            type="tel"
            placeholder="07123 456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          />
          {error && (
            <p className="flex items-start gap-1.5 text-sm text-red-600">
              <AlertCircle size={14} className="mt-px shrink-0" /> {error}
            </p>
          )}
          <Button type="button" onClick={handleVerify} disabled={pending || !phone.trim()} className="w-full rounded-full">
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Continue
          </Button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center gap-4 p-4 py-10 text-center sm:p-8">
        <CheckCircle2 size={44} style={{ color: "var(--color-brand)" }} aria-hidden="true" />
        <h1 className="m-0 text-[24px] font-extrabold tracking-tight">Thanks!</h1>
        <p className="text-[15px] text-gray-600">We&apos;ve let the team know your documents are ready for review.</p>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5 p-4 py-10 sm:p-8">
      <div>
        <h1 className="m-0 text-[24px] font-extrabold tracking-tight sm:text-[28px]">{detail.reference}</h1>
        {detail.evidenceNotes && <p className="mt-1.5 text-[15px] text-gray-600">{detail.evidenceNotes}</p>}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {detail.documents.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1.5">
            {detail.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
                  {doc.originalFilename}
                </span>
                <button type="button" onClick={() => handleRemove(doc.id)} aria-label={`Remove ${doc.originalFilename}`}>
                  <X size={14} className="text-gray-400 hover:text-gray-700" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Label htmlFor="ce-files">Add documents</Label>
        <input
          id="ce-files"
          type="file"
          multiple
          onChange={(e) => handleFilesSelected(e.target.files)}
          disabled={uploading}
          className="mt-1.5 block w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold"
        />
        {uploading && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" /> Uploading…
          </p>
        )}
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-sm text-red-600">
          <AlertCircle size={14} className="mt-px shrink-0" /> {error}
        </p>
      )}

      <Button
        type="button"
        onClick={handleDone}
        disabled={pending || uploading || detail.documents.length === 0}
        className="w-full rounded-full"
        size="lg"
      >
        {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
        I&apos;m done, notify Sovereign Way Cleaners
      </Button>
    </div>
  );
}
