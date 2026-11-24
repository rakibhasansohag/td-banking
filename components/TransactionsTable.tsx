import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAmount, formatDateTime, removeSpecialCharacters } from "@/lib/utils";

type TableTransaction = {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: string;
  pending: boolean;
  paymentChannel: string;
  category: string;
};

const TransactionsTable = ({ transactions }: { transactions: TableTransaction[] }) => (
  <div className="transactions-table-wrap">
    <Table className="transactions-table">
      <TableHeader className="transactions-table-header">
        <TableRow>
          <TableHead>Transaction</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="max-lg:hidden">Status</TableHead>
          <TableHead className="max-lg:hidden">Date</TableHead>
          <TableHead className="table-wide-column">Channel</TableHead>
          <TableHead className="table-wide-column">Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => {
          const isDebit = transaction.type === "debit";
          const signedAmount = `${isDebit ? "−" : "+"}${formatAmount(Math.abs(transaction.amount))}`;
          const date = formatDateTime(new Date(transaction.date)).dateTime;

          return (
            <TableRow key={transaction.id} className="transactions-table-row">
              <TableCell className="transaction-name-cell">
                <span className="transaction-name">{removeSpecialCharacters(transaction.name)}</span>
                <span className="transaction-mobile-detail lg:hidden">
                  {date} · {transaction.category} · {transaction.pending ? "Processing" : "Complete"}
                </span>
              </TableCell>
              <TableCell className={`transaction-amount ${isDebit ? "is-debit" : "is-credit"}`}>
                {signedAmount}
              </TableCell>
              <TableCell className="max-lg:hidden">
                <span className="transaction-status">
                  <span className={`transaction-status-dot ${transaction.pending ? "is-pending" : ""}`} />
                  {transaction.pending ? "Processing" : "Complete"}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-gray-600 max-lg:hidden">{date}</TableCell>
              <TableCell className="table-wide-column capitalize text-gray-600">{transaction.paymentChannel}</TableCell>
              <TableCell className="table-wide-column text-gray-600">{transaction.category}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

export default TransactionsTable;
