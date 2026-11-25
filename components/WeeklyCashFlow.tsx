import type { CashFlowDay } from "@/lib/banking-data";
import { formatAmount } from "@/lib/utils";

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default function WeeklyCashFlow({ days }: { days: CashFlowDay[] }) {
  const dates = days.map(({ day }) => new Date(`${day}T00:00:00Z`));
  const peak = Math.max(0, ...days.flatMap(({ moneyIn, moneyOut }) => [moneyIn, moneyOut]));

  return (
    <section aria-labelledby="cash-flow-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 id="cash-flow-title" className="text-sm font-semibold text-gray-900">Money in and out</h2>
      <p className="mt-1 text-xs text-gray-600">{dates.length > 0 ? dateFormat.formatRange(dates[0], dates[dates.length - 1]) : "Last seven days"} · All accounts</p>
      {peak === 0 ? (
        <p className="grid min-h-28 place-items-center text-sm text-gray-500">No activity in the last seven days.</p>
      ) : (
        <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2" aria-label="Daily amounts">
          {days.map(({ day, moneyIn, moneyOut }, index) => (
            <div key={day} className="group relative min-w-0 text-center">
              <button type="button" className="w-full rounded-md px-0.5 text-xs text-gray-600 focus-visible:outline-2 focus-visible:outline-blue-600" aria-label={`${dateFormat.format(dates[index])}: ${formatAmount(moneyIn)} in, ${formatAmount(moneyOut)} out`}>
                <span aria-hidden="true" className="flex h-20 items-end justify-center gap-0.5 border-b border-gray-200 sm:gap-1">
                  <span className="cash-flow-bar w-full max-w-4 rounded-t-sm bg-blue-600" style={{ height: `${moneyIn / peak * 100}%` }} />
                  <span className="cash-flow-bar w-full max-w-4 rounded-t-sm bg-slate-400" style={{ height: `${moneyOut / peak * 100}%` }} />
                </span>
                <span aria-hidden="true" className="mt-1.5 block">{dayFormat.format(dates[index])}</span>
              </button>
              <span aria-hidden="true" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max max-w-36 -translate-x-1/2 rounded-md bg-gray-900 px-2.5 py-1.5 text-left text-xs text-white shadow-md group-first:left-0 group-first:translate-x-0 group-last:right-0 group-last:left-auto group-last:translate-x-0 group-hover:block group-focus-within:block">
                <span className="block">{formatAmount(moneyIn)} in</span>
                <span className="block">{formatAmount(moneyOut)} out</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-blue-600" />Money in</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-slate-400" />Money out</span>
      </div>
    </section>
  );
}
