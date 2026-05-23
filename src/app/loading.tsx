export default function Loading() {
  return (
    <div className="app-grid-bg min-h-dvh text-slate-900">
      <div className="flex min-h-dvh">
        <aside className="hidden min-h-screen w-64 shrink-0 bg-[#11152e] p-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="size-11 animate-pulse rounded-2xl bg-white/15" />
            <div className="grid flex-1 gap-2">
              <div className="h-4 w-32 animate-pulse rounded-full bg-white/15" />
              <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
          <div className="grid gap-5">
            {[0, 1, 2, 3].map((group) => (
              <div key={group} className="grid gap-2">
                <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-10 animate-pulse rounded-2xl bg-white/10" />
                ))}
              </div>
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col pt-20">
          <header className="fixed inset-x-0 top-0 z-[80] px-3 py-3 backdrop-blur sm:px-4 sm:py-4 lg:left-64">
            <div className="flex items-center justify-between gap-3">
              <div className="h-13 w-56 animate-pulse rounded-[1.25rem] bg-white/85 shadow-sm" />
              <div className="h-13 w-44 animate-pulse rounded-[1.5rem] bg-white/85 shadow-sm" />
            </div>
          </header>
          <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 pb-36 lg:px-6 lg:pb-6">
            <div className="grid gap-2">
              <div className="h-7 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
              ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
              <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
