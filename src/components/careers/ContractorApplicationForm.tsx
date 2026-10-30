"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";
import { submitContractorApplication, type ContractorAvailabilityEntry } from "@/actions/recruitment";
import { nameSchema, emailSchema, phoneSchema, schemaFieldError } from "@/lib/validation";
import {
  RECRUITMENT_PERIODS,
  RECRUITMENT_DAYS,
  RECRUITMENT_DAY_LABEL,
  AREA_OF_EXPERIENCE_LABEL,
  AREA_OF_EXPERIENCE_KEYS,
  type BusinessStructure,
  type RecruitmentPeriodKey,
} from "@/lib/recruitment-config";
import { cn } from "@/lib/utils";

function slotKey(day: number, period: string) {
  return `${day}-${period}`;
}

const sectionHeading = "text-lg font-semibold text-gray-900";
const sectionBody = "mt-1 text-sm text-gray-600";

/**
 * The full /careers/apply form -- one long page, clearly sectioned, not
 * a multi-step wizard (unlike /quote/*, there's no branching-by-service
 * or live price to justify that here, it's one submission). Mirrors
 * ContactForm.tsx's controlled-fields + field-by-field validation shape
 * for the two fields that matter most (name/phone), and falls back to
 * server-returned error text for the rest -- this form is long enough
 * that live-validating every field would be its own project.
 */
export function ContractorApplicationForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState({ fullName: false, email: false, phone: false });

  const [hasDbs, setHasDbs] = useState(false);
  const [hasLiabilityInsurance, setHasLiabilityInsurance] = useState(false);
  const [hasIso, setHasIso] = useState(false);
  const [otherEvidenceNotes, setOtherEvidenceNotes] = useState("");

  const [yearsExperience, setYearsExperience] = useState("");
  const [areas, setAreas] = useState<Set<string>>(new Set());
  const [otherArea, setOtherArea] = useState("");

  const [businessStructure, setBusinessStructure] = useState<BusinessStructure | "">("");
  const [companyEmployeeCount, setCompanyEmployeeCount] = useState("");

  const [availability, setAvailability] = useState<Set<string>>(new Set());

  const [notes, setNotes] = useState("");

  const nameError = schemaFieldError(nameSchema, fullName);
  const emailError = schemaFieldError(emailSchema, email);
  const phoneError = schemaFieldError(phoneSchema, phone);

  function toggleArea(key: string) {
    setAreas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSlot(day: number, period: string) {
    const key = slotKey(day, period);
    setAvailability((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ fullName: true, email: true, phone: true });
    setError(null);

    if (nameError || emailError || phoneError) return;
    if (!address.trim()) {
      setError("Enter your address");
      return;
    }
    if (!hasLiabilityInsurance) {
      setError("Product & Public Liability insurance is required to apply");
      return;
    }
    const years = Number(yearsExperience);
    if (!Number.isInteger(years) || years < 0) {
      setError("Enter a valid number of years' experience");
      return;
    }
    if (areas.size === 0 && !otherArea.trim()) {
      setError("Select at least one area of experience, or describe it under “Other”");
      return;
    }
    if (!businessStructure) {
      setError("Choose whether you're a sole trader or a company");
      return;
    }
    const employeeCount = businessStructure === "company" ? Number(companyEmployeeCount) : null;
    if (businessStructure === "company" && (!Number.isInteger(employeeCount) || (employeeCount as number) < 0)) {
      setError("Enter how many employees the company has");
      return;
    }

    const availabilityEntries: ContractorAvailabilityEntry[] = Array.from(availability).map((key) => {
      const [day, period] = key.split("-");
      return { dayOfWeek: Number(day), periodKey: period as RecruitmentPeriodKey };
    });

    startTransition(async () => {
      const result = await submitContractorApplication({
        fullName,
        email,
        phone,
        address,
        hasDbs,
        hasLiabilityInsurance,
        hasIso,
        otherEvidenceNotes,
        yearsExperience: years,
        areasOfExperience: Array.from(areas),
        otherAreaOfExperience: otherArea,
        businessStructure: businessStructure as BusinessStructure,
        companyEmployeeCount: employeeCount,
        notes,
        availability: availabilityEntries,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReference(result.reference);
    });
  }

  if (reference) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-10 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-3 size-10" style={{ color: "var(--color-brand)" }} />
        <p className="text-lg font-semibold text-gray-900">Application received</p>
        <p className="mt-2 text-sm text-gray-600">
          Reference <strong>{reference}</strong>. We&apos;ll review your application and be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-2xl space-y-10 rounded-2xl bg-white p-8 shadow-sm">
      <section className="space-y-5">
        <div>
          <h3 className={sectionHeading}>Your details</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ca-name">Full Name *</Label>
            <Input
              id="ca-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
              className={cn(touched.fullName && nameError && "border-red-400 focus-visible:ring-red-300")}
              aria-invalid={touched.fullName && !!nameError}
            />
            <FieldError message={touched.fullName ? nameError : null} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ca-email">Email *</Label>
            <Input
              id="ca-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={cn(touched.email && emailError && "border-red-400 focus-visible:ring-red-300")}
              aria-invalid={touched.email && !!emailError}
            />
            <FieldError message={touched.email ? emailError : null} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ca-phone">Phone Number *</Label>
            <Input
              id="ca-phone"
              type="tel"
              placeholder="07123 456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              className={cn(touched.phone && phoneError && "border-red-400 focus-visible:ring-red-300")}
              aria-invalid={touched.phone && !!phoneError}
            />
            <FieldError message={touched.phone ? phoneError : null} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ca-address">Address *</Label>
          <Textarea id="ca-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="resize-none" />
        </div>
      </section>

      <section className="space-y-4 border-t border-gray-100 pt-8">
        <div>
          <h3 className={sectionHeading}>Supporting documents</h3>
          <p className={sectionBody}>
            You don&apos;t need to attach anything now -- you&apos;ll be asked to provide supporting evidence
            during onboarding. For now, just let us know what you currently hold.
          </p>
        </div>
        <div className="space-y-3">
          <label className="flex items-start gap-2.5 text-sm text-gray-700">
            <Checkbox checked={hasDbs} onCheckedChange={(v) => setHasDbs(v === true)} className="mt-0.5" />
            DBS check (optional)
          </label>
          <label className="flex items-start gap-2.5 text-sm text-gray-700">
            <Checkbox checked={hasLiabilityInsurance} onCheckedChange={(v) => setHasLiabilityInsurance(v === true)} className="mt-0.5" />
            Product &amp; Public Liability insurance (required to apply)
          </label>
          <label className="flex items-start gap-2.5 text-sm text-gray-700">
            <Checkbox checked={hasIso} onCheckedChange={(v) => setHasIso(v === true)} className="mt-0.5" />
            ISO certificate (optional)
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ca-other-evidence">Other evidence (optional)</Label>
          <Textarea
            id="ca-other-evidence"
            rows={2}
            placeholder="Any other accreditations or evidence you can provide"
            value={otherEvidenceNotes}
            onChange={(e) => setOtherEvidenceNotes(e.target.value)}
            className="resize-none"
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-gray-100 pt-8">
        <h3 className={sectionHeading}>Experience</h3>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="ca-years">Years operating in the industry *</Label>
          <Input
            id="ca-years"
            type="number"
            min={0}
            step={1}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Areas of experience *</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AREA_OF_EXPERIENCE_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2.5 text-sm text-gray-700">
                <Checkbox checked={areas.has(key)} onCheckedChange={() => toggleArea(key)} />
                {AREA_OF_EXPERIENCE_LABEL[key]}
              </label>
            ))}
          </div>
          <Input
            placeholder="Other, please specify"
            value={otherArea}
            onChange={(e) => setOtherArea(e.target.value)}
            className="mt-2"
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-gray-100 pt-8">
        <h3 className={sectionHeading}>Business structure</h3>
        <div className="flex gap-3">
          {(["sole_trader", "company"] as BusinessStructure[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={businessStructure === option}
              onClick={() => setBusinessStructure(option)}
              className={cn(
                "h-11 flex-1 rounded-xl border text-sm font-semibold transition-colors",
                businessStructure === option
                  ? "border-transparent text-white"
                  : "border-gray-200 bg-white text-gray-700"
              )}
              style={businessStructure === option ? { backgroundColor: "var(--color-brand)" } : undefined}
            >
              {option === "sole_trader" ? "Sole trader" : "Company"}
            </button>
          ))}
        </div>
        {businessStructure === "company" && (
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="ca-employees">How many employees does the company have? *</Label>
            <Input
              id="ca-employees"
              type="number"
              min={0}
              step={1}
              value={companyEmployeeCount}
              onChange={(e) => setCompanyEmployeeCount(e.target.value)}
            />
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-gray-100 pt-8">
        <div>
          <h3 className={sectionHeading}>Availability</h3>
          <p className={sectionBody}>Which days and times could you generally work?</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-center text-sm">
            <thead>
              <tr>
                <th className="w-28" />
                {RECRUITMENT_DAYS.map((day) => (
                  <th key={day} className="pb-2 text-xs font-bold text-gray-500">
                    {RECRUITMENT_DAY_LABEL[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECRUITMENT_PERIODS.map((period) => (
                <tr key={period.key}>
                  <td className="py-1 pr-2 text-left">
                    <span className="block text-xs font-semibold text-gray-500">{period.label}</span>
                    <span className="block text-[11px] text-gray-400">{period.time}</span>
                  </td>
                  {RECRUITMENT_DAYS.map((day) => {
                    const on = availability.has(slotKey(day, period.key));
                    return (
                      <td key={day} className="p-1">
                        <button
                          type="button"
                          onClick={() => toggleSlot(day, period.key)}
                          aria-pressed={on}
                          aria-label={`${period.label} on ${RECRUITMENT_DAY_LABEL[day]}`}
                          className={cn(
                            "h-9 w-9 rounded-lg border transition-colors",
                            on ? "border-transparent" : "border-gray-200 bg-white"
                          )}
                          style={on ? { backgroundColor: "var(--color-brand)" } : undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-1.5 border-t border-gray-100 pt-8">
        <Label htmlFor="ca-notes">Additional notes</Label>
        <Textarea id="ca-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
      </section>

      {error && (
        <div className="flex items-start gap-1.5" role="alert">
          <AlertCircle size={14} className="mt-px shrink-0 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full rounded-full" size="lg">
        {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Submit application
      </Button>
    </form>
  );
}
