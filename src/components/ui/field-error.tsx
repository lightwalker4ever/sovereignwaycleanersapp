import { AlertCircle } from "lucide-react";

export function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mt-1.5 flex items-start gap-1.5" role="alert" aria-live="polite">
      <AlertCircle size={13} className="mt-px shrink-0 text-red-500" />
      <p className="text-xs leading-tight text-red-600">{message}</p>
    </div>
  );
}
