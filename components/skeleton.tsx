import { LoadingStatus } from "./loading-status";

/** Placeholder blocks shown while a page loads. Screen readers hear "Loading…" once. */
export function PageSkeleton({ rows = 4, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className="grid gap-4" aria-busy="true" data-testid="page-skeleton">
      <LoadingStatus />
      {title && <div className="skeleton h-8 w-2/3 max-w-md" />}
      <div className="skeleton h-4 w-1/2 max-w-sm" />
      <div className="grid gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="spinner inline-block shrink-0 rounded-full border-2 border-current border-r-transparent"
      style={{ width: size, height: size }}
    />
  );
}
