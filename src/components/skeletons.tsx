export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function SkeletonPageHeader() {
  return (
    <div className="mb-6">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="mt-3 h-8 w-64 max-w-full" />
      <SkeletonBlock className="mt-2 h-4 w-96 max-w-full" />
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 sm:p-5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="mt-2 h-3 w-1/3" />
          <SkeletonBlock className="mt-3 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden p-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBlock key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({
  stats = 0,
  cards = 4,
}: {
  stats?: number;
  cards?: number;
}) {
  return (
    <div className="container-app py-8">
      <SkeletonPageHeader />
      {stats > 0 ? <SkeletonStatCards count={stats} /> : null}
      <SkeletonCardList count={cards} />
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="container-app py-8">
      <SkeletonPageHeader />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="card space-y-3 p-5 sm:p-6">
          <SkeletonBlock className="h-16 w-16 rounded-3xl" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-2/3" />
        </div>
        <div className="space-y-4">
          <div className="card space-y-2 p-5">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-5 w-32" />
          </div>
          <div className="card space-y-2 p-5">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TablePageSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="container-app py-8">
      <SkeletonPageHeader />
      <SkeletonTable rows={rows} cols={cols} />
    </div>
  );
}
