# XMRMine Pro — PRD

## Original problem statement
User uploaded a `src/`-only React + TypeScript + Tailwind + shadcn project (XMRMine Pro — a Monero cloud-mining marketing/dashboard site) and asked: "make this run for me", then later: "wire backend for the contact form, keep mining simulated, allow user to connect wallet and pay us using crypto, and make the frontend extremely engaging and attractive to make users avail our plans."

## Architecture
- **Frontend**: React 19 + CRA + craco + Tailwind 3 + shadcn UI (.jsx components) + TypeScript (`.tsx` user files with `// @ts-nocheck` since shadcn types aren't authored). Routing via simple `activeView` state in `App.tsx` (no React Router for views — chosen by upstream).
- **Web3**: `viem` v2 connected directly to MetaMask via `window.ethereum` (no WalletConnect projectId needed). Supports Ethereum (chain 1), Polygon (137), BSC (56). Sends native or USDT (ERC-20) to a configurable recipient (`REACT_APP_RECIPIENT_ADDRESS`).
- **Backend**: FastAPI + Motor (async MongoDB). Routes prefixed `/api`. Collections: `status_checks`, `contact_messages`, `purchases`.
- **Theme**: Dark slate-950 base + orange/amber/yellow accents. Custom CSS animations in `App.css` (float, shimmer, ticker, pulse-glow, fade-in-up).

## User personas
- **Visitor / prospective miner**: Browses plans, reads about, FAQ; needs trust signals, transparent earnings, clear CTAs.
- **Buyer**: Connects MetaMask, picks chain + token, pays for a plan, sees tx hash + explorer link.
- **Existing miner**: Opens Dashboard to track simulated hashrate / uptime / blocks / projected earnings.
- **Lead**: Submits Contact form → record stored in `contact_messages`.

## Core requirements (static)
1. Marketing site renders cleanly (Hero, Plans, Stats, Footer, About, FAQ, Privacy, Terms, Contact).
2. Contact form persists to backend.
3. Mining Dashboard runs as a simulated experience (start/stop, animated counters).
4. Connect Wallet (MetaMask) globally via WalletProvider context.
5. Plan purchase via crypto: choose chain + USDT/Native, send transaction, record on backend.
6. Engaging visual polish (gradients, glow rings, ticker, shimmer badges, animated bg).

## What's been implemented (2026-04-30)
- ✅ Wired uploaded `src/*` (TSX) into `/app/frontend`; installed TypeScript + viem; created `tsconfig.json`; removed conflicting `jsconfig.json`.
- ✅ Backend: `POST /api/contact`, `GET /api/contact` with `EmailStr` validation.
- ✅ Backend: `POST /api/purchases`, `GET /api/purchases?buyer_address=…` with strict validation: address + tx_hash regex, `Literal[1,56,137]` chains, `Literal["USDT","NATIVE"]` token types.
- ✅ Backend: `GET /api/xmr/chart?days={1|7|30|90}` — proxies CoinGecko market_chart with 60s in-memory cache; falls back to a deterministic-realistic synthetic series when CoinGecko returns 429 (preview env is rate-limited).
- ✅ Frontend: `WalletContext`, `ConnectWalletButton`, `BuyPlanModal` with two-stage UX (payment → **Activation Pending** view), `LiveTicker` (animated payout marquee).
- ✅ Activation Pending experience: confirmation hero, ETA countdown per chain, tx hash with copy + explorer link, **referral code** derived from buyer wallet, share to **X** and **Telegram** with prefilled text + ref link, Open Dashboard CTA.
- ✅ **XmrPriceChart** (recharts AreaChart) with 24H/7D/30D/90D toggles, current price + change %, high/low/last-updated, auto-refresh every 60s on 24H view.
- ✅ **WorkerPool** simulation: 7 workers with addresses, regions (US/EU/Asia/LATAM), live-updating hashrates (every 2s), pool-share progress bars, accepted-shares counter, uptime %, last-share timestamp; ~92% online with occasional flips to offline; total pool hashrate aggregated in header.
- ✅ Visual polish: ambient gradient mesh, glow rings around Hero stats card, shimmer "MOST POPULAR" badge, hover-lift on Plan cards, gradient icon cards, custom orange scrollbar, custom selection color, fine grid overlay.
- ✅ Footer legal/company links wired to actual page navigation.
- ✅ Rebrand: app renamed from XMRMine Pro → **MONERO RIG** across all pages, share text, emails (support@monerorig.com), browser title.
- ✅ Backend tested: 14/14 pytest cases pass (health, contact success/validation, purchases across chains/tokens, validation, listing, address filter).

## What's been implemented (2026-05-01)
- ✅ **4-tier pricing model**: Pool Plan ($250 / 1 worker shared 10 users / 30d / 10% ROI), Solo Miner ($2,500 / 1 worker / 30d / 10% ROI), Dual Miner ($5,000 / 2 workers / 60d / 12% ROI — Most Popular), Multi Rig ($10,000 / 5 workers / 90d / 15% ROI).
- ✅ **Annual billing toggle** (Standard / Annual): Annual = 10× upfront price, 365-day contract, +25% bonus daily earnings & ROI; "save ~17%" badge displayed; bonus row shown in feature list.
- ✅ **Compare Plans table**: Collapsible side-by-side comparison with 17 rows (Workers, Hashrate, Price, Daily, ROI, Contract, Pool Access, Support, Payouts + 8 binary capabilities — Dashboard, Mobile App, Referral, Priority Withdrawals, Account Manager, API Access, Custom Reporting, VIP Bonus). Each column has a "Choose" CTA.
- ✅ Backend `purchases` model accepts `billing_mode: Literal["standard","annual"]` and persists it (verified via curl).
- ✅ `BuyPlanModal` receives `billingMode` prop and multiplies price 10× for annual.

## What's been implemented (2026-02-04 — current session)
- ✅ **Admin Panel wired**: `AdminPanel.tsx` mounted in `App.tsx` and gated by `REACT_APP_ADMIN_WALLETS` env. Header shows "Admin" nav link only when connected wallet matches an allowed admin address. Component uses `X-Admin-Wallet` header to call `GET /api/admin/withdrawals` and `PATCH /api/admin/withdrawals/{id}` with status filters (pending/processing/completed/rejected) and inline mark-processing/mark-paid/reject actions.
- ✅ **Backend admin hardening**: 
  - `?status=` query is validated against the Literal set (returns 422 on bad value).
  - `PATCH /api/admin/withdrawals/{id}` now requires `payout_tx_hash` when transitioning to `completed` (returns 400 otherwise).
- ✅ **User-side withdrawal status notifications**: `MiningDashboard` polls `/api/wallet/{addr}/withdrawals` every 30s, diffs against last-seen statuses, and fires Sonner toasts when an admin flips a request to `processing` (info), `completed` (success), or `rejected` (error). Initial snapshot is seeded so users don't get spurious toasts on first load.
- ✅ Backend regression: 18/18 pytest cases pass in `/app/backend/tests/test_admin_withdrawals.py` (auth enforcement, full state machine, regression on xmr/price, referrals, purchases).
- ⚠️ **NOT IMPLEMENTED — Email notifications on status change**: Toast in dashboard is live, but actual email send requires a Resend / SendGrid integration which the user hasn't provided yet. A `notification_subscriptions` collection exists with subscriber emails — wiring an email transport is a future task (Resend recommended).

## Prioritized backlog (P0/P1/P2) — updated
- **P1**: Replace placeholder receiving address in `/app/frontend/.env` (`REACT_APP_RECIPIENT_ADDRESS`) with real business wallet.
- **P1**: Transaction-confirmation polling: flip `status` `pending → confirmed/failed` via Etherscan/PolygonScan/BscScan.
- **P1**: Email transport for withdrawal completion (Resend or SendGrid). When an admin marks a withdrawal `completed`, look up subscribers in `notification_subscriptions` and email them the payout tx hash.
- **P2**: State-machine enforcement on PATCH /api/admin/withdrawals (currently any → any allowed; consider pending→processing→completed only).
- **P2**: Add unique index on `purchases.tx_hash` to prevent duplicate inserts.
- **P2**: Pipe terminal mining logs into "Recent Activity" UI cards.
- **P2**: SIWE (Sign-In With Ethereum) for cryptographic wallet auth.
- **P2**: Real referrer/affiliate codes (currently derived from wallet address).
- **P2**: Replace simulated MiningDashboard with real-data feed (pool API).
- **P2**: Refactor `App.tsx` conditional `activeView` routing into React Router as nav surface grows.
- **P2**: Refactor `server.py` (911 lines) — split admin + withdrawals into separate router modules.
- **P3**: WalletConnect / Coinbase Wallet support fully wired.
- **P3**: i18n (multi-language).

## Next tasks
- Confirm real receiving wallet in `.env`.
- Decide on email provider (Resend recommended) and wire status-change emails.
- User to verify Admin Panel flow end-to-end on the preview URL with a connected admin MetaMask.

## Prioritized backlog (P0/P1/P2)
- **P1**: Replace placeholder receiving address (`0x000...dEaD`) in `/app/frontend/.env` (`REACT_APP_RECIPIENT_ADDRESS`) with real business wallet.
- **P1**: Transaction-confirmation polling: flip `status` `pending → confirmed/failed` via Etherscan/PolygonScan/BscScan.
- **P1**: Migrate from deprecated `@app.on_event("shutdown")` to FastAPI lifespan.
- **P2**: Add unique index on `purchases.tx_hash` to prevent duplicate inserts.
- **P2**: Pipe terminal mining logs into "Recent Activity" UI cards (SHARE/BLOCK/PAYOUT summaries).
- **P2**: SIWE (Sign-In With Ethereum) for cryptographic wallet auth.
- **P2**: Real referrer/affiliate codes (currently derived statically from wallet address).
- **P2**: Replace simulated MiningDashboard with real-data feed (pool API).
- **P3**: WalletConnect / Coinbase Wallet support fully wired (currently scaffolded via `@walletconnect/ethereum-provider`).
- **P3**: Refactor: remove dead `/api/xmr/chart` & `/api/xmr/ohlc` endpoints superseded by TradingView widget; clean up shadcn `// @ts-nocheck` shims.
- **P3**: i18n (multi-language).

## Next tasks
- Confirm real receiving wallet in `.env`.
- User to verify Plans / Annual toggle / Compare table on their preview URL and approve.
