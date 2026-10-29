import { Loader2 } from "lucide-react";

/**
 * Content-area fallback for a role's loading.tsx, shown in place of
 * {children} while the destination route's data is still being
 * fetched. Only safe to use for a role whose nav chrome lives in its
 * own layout.tsx (admin, sales) -- there, this Suspense boundary wraps
 * just the content area, so the sidebar/header stays mounted and only
 * the page itself appears to "load". A role whose pages each render
 * their own shell (supervisor, cleaner, client) would have that shell
 * flash away too, so those rely on NavLinkStatus's per-link spinner
 * instead rather than this component.
 */
export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-dash-brand-700" aria-hidden="true" />
    </div>
  );
}
