import type { CashFlowDay } from "@/lib/banking-data";
import { formatAmount } from "@/lib/utils";

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const axisFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });

export default function WeeklyCashFlow({ days }: { days: CashFlowDay[] }) {
  const dates = days.map(({ day }) => new Date(`${day}T00:00:00Z`));
  const peak = Math.max(0, ...days.flatMap(({ moneyIn, moneyOut }) => [moneyIn, moneyOut]));
  const magnitude = peak > 0 ? 10 ** Math.floor(Math.log10(peak / 2)) : 1;
  const step = Math.ceil(peak / (2 * magnitude)) * magnitude;
  const totals = days.reduce((sum, day) => ({
    incoming: sum.incoming + Math.round(day.moneyIn * 100),
    outgoing: sum.outgoing + Math.round(day.moneyOut * 100),
  }), { incoming: 0, outgoing: 0 });

  return (
    <section aria-labelledby="cash-flow-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 id="cash-flow-title" className="text-sm font-semibold text-gray-900">Money in and out</h2>
      <p className="mt-1 text-xs text-gray-600">{dates.length > 0 ? dateFormat.formatRange(dates[0], dates[dates.length - 1]) : "Last seven days"} · All accounts</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 px-3 py-2.5 tabular-nums">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-gray-600"><span className="size-2 rounded-sm bg-blue-600" />Total money in</dt>
          <dd className="mt-1 text-base font-semibold text-gray-900">{formatAmount(totals.incoming / 100)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-gray-600"><span className="size-2 rounded-sm bg-slate-400" />Total money out</dt>
          <dd className="mt-1 text-base font-semibold text-gray-900">{formatAmount(totals.outgoing / 100)}</dd>
        </div>
      </dl>
      {peak === 0 ? (
        <p className="grid min-h-28 place-items-center text-sm text-gray-500">No activity in the last seven days.</p>
      ) : (
        <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
          <div aria-hidden="true" className="relative h-24 min-w-11 text-right text-[11px] tabular-nums text-gray-600">
            {[step * 2, step, 0].map((tick, index) => (
              <span key={index} className="absolute right-0 -translate-y-1/2" style={{ top: `${index * 50}%` }}>{axisFormat.format(tick)}</span>
            ))}
          </div>
          <div className="relative grid grid-cols-7 gap-1 sm:gap-2" aria-label="Daily amounts">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-24 flex-col justify-between">
              <span className="border-t border-gray-200" /><span className="border-t border-gray-200" /><span className="border-t border-gray-200" />
            </div>
            {days.map(({ day, moneyIn, moneyOut }, index) => (
              <div key={day} className="group relative min-w-0 text-center">
                <button type="button" className="w-full rounded-md px-0.5 text-xs text-gray-600 focus-visible:outline-2 focus-visible:outline-blue-600" aria-label={`${dateFormat.format(dates[index])}: ${formatAmount(moneyIn)} in, ${formatAmount(moneyOut)} out`}>
                  <span aria-hidden="true" className="flex h-24 items-end justify-center gap-0.5 sm:gap-1">
                    <span className="cash-flow-bar w-full max-w-4 rounded-t-sm bg-blue-600" style={{ height: `${moneyIn / (step * 2) * 100}%` }} />
                    <span className="cash-flow-bar w-full max-w-4 rounded-t-sm bg-slate-400" style={{ height: `${moneyOut / (step * 2) * 100}%` }} />
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
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-gray-600">Includes demo opening balances. Transfers between your accounts appear in both totals.</p>
      {peak > 0 && (
        <details className="mt-2 text-sm text-gray-700">
          <summary className="cursor-pointer rounded-sm font-medium text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">View daily amounts</summary>
          <table className="mt-2 w-full text-xs tabular-nums">
            <caption className="sr-only">Daily money in and out across all accounts</caption>
            <thead><tr><th scope="col" className="text-left">Date</th><th scope="col" className="text-right">Money in</th><th scope="col" className="text-right">Money out</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {days.map(({ day, moneyIn, moneyOut }, index) => (
                <tr key={day}><th scope="row" className="py-2 text-left font-normal">{dateFormat.format(dates[index])}</th><td className="text-right">{formatAmount(moneyIn)}</td><td className="text-right">{formatAmount(moneyOut)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
