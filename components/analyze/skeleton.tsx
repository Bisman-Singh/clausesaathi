/** Placeholder shapes standing in for the result while the model works. */
export function ResultSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="skeleton h-8 w-2/3" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-28" />
        <div className="skeleton h-6 w-36" />
        <div className="skeleton h-6 w-24" />
      </div>
      <div className="skeleton h-24 w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
    </div>
  );
}
