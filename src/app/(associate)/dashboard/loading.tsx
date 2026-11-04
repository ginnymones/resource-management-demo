export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Greeting skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>

      {/* Time Entry Form skeleton */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
        <div className="h-10 w-24 bg-muted rounded" />
      </div>

      {/* Today's Entries skeleton */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="h-6 w-40 bg-muted rounded" />
        <div className="space-y-3">
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </div>

      {/* History skeleton */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="h-6 w-44 bg-muted rounded" />
        <div className="space-y-3">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
