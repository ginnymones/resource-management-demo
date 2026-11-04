export default function RosterLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="h-10 w-44 bg-muted animate-pulse rounded" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="grid grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-muted animate-pulse rounded" />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="h-5 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
