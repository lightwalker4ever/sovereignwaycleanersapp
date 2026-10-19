import { Camera } from "lucide-react";

/**
 * A photo thumbnail tile: the real photo when signedUrl exists,
 * otherwise a placeholder with a camera icon and an optional label
 * (design-handoff DESIGN_HANDOFF.md's "Shared components" -> PhotoTile).
 */
export function PhotoTile({
  signedUrl,
  label,
  square = false,
}: {
  signedUrl?: string | null;
  label?: string;
  square?: boolean;
}) {
  if (signedUrl) {
    return (
      // Signed URLs are private, short-lived and per-request -- not a fit
      // for next/image's optimizer/domain allowlist.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={signedUrl}
        alt={label ?? ""}
        className={`h-full w-full rounded-xl object-cover ${square ? "aspect-square" : "aspect-4/3"}`}
      />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl bg-dash-photo text-dash-muted ${square ? "aspect-square" : "aspect-4/3"}`}
    >
      <Camera size={24} strokeWidth={1.6} aria-hidden="true" />
      {label && <span className="px-1 text-center text-[11px] font-semibold">{label}</span>}
    </div>
  );
}
