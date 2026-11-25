# TD Banking

- Treat the app as a simulated banking portfolio. Label demo money and use the PostgreSQL ledger for balances, activity, and charts. Derive figures from signed cents and keep chart periods and account scope visible.
- Keep the Horizon mark, blue accent, responsive sidebar, and shadcn controls. Give each screen one primary action. Show account names with their last four digits wherever users choose an account.
- Give each route a skeleton that matches its content and an empty state with a clear next action. Keep page changes immediate and preserve keyboard focus, accessible labels, and reduced motion. Use short motion for selection, opening a drawer, or confirming a result.
- Scope private reads to the signed-in account owner. Keep recipient suggestions limited to previous recipients. Keep transfer validation, ownership, and ledger updates on the server.
- Use small, focused commits. When verifying UI changes, check a phone and a desktop viewport, keyboard interaction, and the difference between local changes and the deployment on Vercel.
- When `graphify-out/` exists, read `GRAPH_REPORT.md` there and the wiki index if present before architecture work. Prefer Graphify queries for cross-module questions and run `python -m graphify update .` after code changes. Skip Graphify commands when the directory is absent.
- For library-specific guidance, resolve the library in Context7 and query its relevant documentation before changing framework or component APIs.
