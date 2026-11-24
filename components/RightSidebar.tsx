import { countTransactionCategories, formatAmount } from "@/lib/utils";
import Category from "./Category";
import AddDemoBank from "./AddDemoBank";
import type { BankingAccount } from "@/lib/banking";

type RightSidebarUser = { email: string; firstName: string; lastName: string; name: string };
type SidebarActivity = { name: string; amount: number; date: string; category: string };

const RightSidebar = ({ user, transactions, banks }: {
  user: RightSidebarUser;
  transactions: SidebarActivity[];
  banks: BankingAccount[];
}) => {
  const categories: CategoryCount[] = countTransactionCategories(transactions);
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` || "U";

  return (
    <aside className="right-sidebar" aria-label="Account summary">
      <section className="profile-summary">
        <div className="profile-avatar" aria-hidden="true">{initials}</div>
        <div className="profile-details">
          <h2 className="profile-name">{user.firstName} {user.lastName}</h2>
          <p className="profile-email">{user.email}</p>
        </div>
      </section>

      <section className="sidebar-section" aria-labelledby="accounts-heading">
        <div className="sidebar-section-heading">
          <h2 id="accounts-heading">Accounts</h2>
          <AddDemoBank variant="ghost" />
        </div>
        {banks.length ? (
          <ul className="account-summary-list">
            {banks.map((account) => (
              <li className="account-summary-row" key={account.id}>
                <span className="account-summary-icon" aria-hidden="true">{account.name.slice(0, 1)}</span>
                <span className="account-summary-copy">
                  <span className="account-summary-name">{account.name}</span>
                  <span className="account-summary-mask">{account.subtype} ···· {account.mask}</span>
                </span>
                <span className="account-summary-balance">{formatAmount(account.currentBalance)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sidebar-empty">Add a demo account to see it here.</p>
        )}
      </section>

      <section className="sidebar-section" aria-labelledby="categories-heading">
        <div className="sidebar-section-heading">
          <h2 id="categories-heading">Top categories</h2>
        </div>
        {categories.length ? (
          <ul className="category-list">
            {categories.map((category) => <li key={category.name}><Category category={category} /></li>)}
          </ul>
        ) : (
          <p className="sidebar-empty">Categories appear as you use your accounts.</p>
        )}
      </section>
    </aside>
  );
};

export default RightSidebar;
