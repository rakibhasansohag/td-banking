import { formatAmount } from "@/lib/utils";
import type { BankingAccount } from "@/lib/banking";

const BankInfo = ({ account }: {
  account: BankingAccount;
  selectedAccountId?: string;
  type: "full" | "card";
}) => (
  <div className="selected-account-summary">
    <div className="selected-account-copy">
      <p className="selected-account-label">Selected account</p>
      <h3>{account.name}</h3>
      <p>{account.subtype} ···· {account.mask}</p>
    </div>
    <div className="selected-account-value">
      <span>Available balance</span>
      <strong>{formatAmount(account.availableBalance)}</strong>
    </div>
  </div>
);

export default BankInfo;
