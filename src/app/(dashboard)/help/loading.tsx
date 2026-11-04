export default function HelpLoading() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-pulse">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-8 w-full bg-muted rounded" />
          <div className="border-t border-border" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-full bg-muted rounded" />
          ))}
        </div>
      </aside>

      {/* Content skeleton */}
      <main className="flex-1 min-w-0">
        <div className="rounded-lg border border-border bg-card p-6 md:p-8 space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-5/6 bg-muted rounded" />
          <div className="h-4 w-4/6 bg-muted rounded" />
          <div className="h-6 w-48 bg-muted rounded mt-6" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-4 w-5/6 bg-muted rounded" />
        </div>
      </main>
    </div>
  );
}
