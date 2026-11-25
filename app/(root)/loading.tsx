export default function BankingLoading() {
  return (
    <section aria-busy="true" aria-label="Loading banking page" className="w-full min-w-0 px-5 py-6 sm:px-8 lg:py-9">
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="space-y-3">
          <div className="h-8 w-40 rounded bg-gray-200" />
          <div className="h-4 w-64 max-w-full rounded bg-gray-100" />
        </div>
        <div className="space-y-3 rounded-2xl border border-gray-200 p-6">
          <div className="h-4 w-24 rounded bg-gray-100" />
          <div className="h-9 w-36 rounded bg-gray-200" />
        </div>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="flex justify-between gap-4 p-4">
              <div className="h-4 w-1/3 rounded bg-gray-100" />
              <div className="h-4 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
