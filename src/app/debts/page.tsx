import { formatCurrency } from "@/lib/utils";

const debtRows = [
  { counterparty: "John", status: "Open", balance: 120 },
  { counterparty: "Mike", status: "Partial", balance: 300 },
  { counterparty: "Client ACME", status: "Overdue", balance: 850 }
];

export default function DebtsPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">Debt Tracker</p>
        <h1 className="mt-2 text-4xl font-semibold">Money lent, borrowed, and pending</h1>

        <div className="card-surface mt-8 overflow-hidden rounded-3xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Counterparty</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {debtRows.map((row) => (
                <tr className="border-b border-white/10 last:border-0" key={row.counterparty}>
                  <td className="px-4 py-4">{row.counterparty}</td>
                  <td className="px-4 py-4">{row.status}</td>
                  <td className="px-4 py-4">{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
