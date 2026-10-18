"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setContactFormEnabled } from "@/app/(dashboard)/dashboard/admin/settings/actions";

export function ContactFormToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !enabled;
    setError(null);
    startTransition(async () => {
      try {
        await setContactFormEnabled(next);
        setEnabled(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant={enabled ? "default" : "outline"} disabled={isPending} onClick={toggle} className="gap-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {enabled ? "Contact form is ON" : "Contact form is OFF"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
