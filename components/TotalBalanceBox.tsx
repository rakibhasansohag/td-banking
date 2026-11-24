import AnimatedCounter from "./AnimatedCounter";

const TotalBalanceBox = ({
  totalBanks,
  totalCurrentBalance,
}: {
  totalBanks: number;
  totalCurrentBalance: number;
}) => (
  <section className="total-balance" aria-label="Total account balance">
    <div className="total-balance-copy">
      <p className="total-balance-label">Total balance</p>
      <div className="total-balance-amount">
        <AnimatedCounter amount={totalCurrentBalance} />
      </div>
      <p className="total-balance-caption">
        Across {totalBanks} {totalBanks === 1 ? "account" : "accounts"}
      </p>
    </div>
    <div className="total-balance-mark" aria-hidden="true">
      <span>$</span>
    </div>
  </section>
);

export default TotalBalanceBox;
