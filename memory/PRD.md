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
- ✅ Frontend: `WalletContext` (connect/disconnect/chain switch/event listeners), `ConnectWalletButton` (wallet pill with live indicator), `BuyPlanModal` (network selector, USDT/native toggle, summary, pay flow with explorer link), `LiveTicker` (animated payout marquee).
- ✅ Visual polish: ambient gradient mesh, glow rings around Hero stats card, shimmer "MOST POPULAR" badge, hover-lift on Plan cards, gradient icon cards, custom orange scrollbar, custom selection color, fine grid overlay.
- ✅ Footer legal/company links wired to actual page navigation.
- ✅ Backend tested: 14/14 pytest cases pass (health, contact success/validation, purchases across chains/tokens, validation, listing, address filter).

## Prioritized backlog (P0/P1/P2)
- **P1**: Replace placeholder receiving address (`0x000...dEaD`) in `/app/frontend/.env` (`REACT_APP_RECIPIENT_ADDRESS`) with real business wallet.
- **P1**: Migrate from deprecated `@app.on_event("shutdown")` to FastAPI lifespan.
- **P2**: Add unique index on `purchases.tx_hash` to prevent duplicate inserts.
- **P2**: Cron / background worker to verify on-chain confirmation status (poll Etherscan/PolygonScan/BscScan API), flip `status` from `pending` → `confirmed` / `failed`.
- **P2**: Auth (Emergent Google or email link) so users can view their own purchase history page.
- **P2**: Real referrer/affiliate codes in Plans page (currently static "Personal referral link" feature).
- **P2**: Replace simulated MiningDashboard with real-data feed (pool API).
- **P3**: WalletConnect / Coinbase Wallet support (requires Reown projectId).
- **P3**: i18n (multi-language) for global audience.

## Next tasks
- Confirm with user: set the real receiving wallet in `.env`, decide which chains stay enabled, and whether to enable WalletConnect for non-MetaMask wallets.
