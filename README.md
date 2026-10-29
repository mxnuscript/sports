# Edge

A dependency-free sports betting research workspace. Requires Node.js 24.5 or newer (uses Node’s environment-proxy support).

Run `npm start` from `/workspace/sports` (default port 3000; override with `PORT`). Run `npm test` for payout math tests.

Includes a filterable, explicitly illustrative odds board, two-outcome arbitrage allocation, and bonus-bet conversion with cash hedge modeling. Multi-book moneylines, spreads, and totals use The Odds API for NBA, NFL, and MLB. Player props remain demo-only. No automated wagers, accounts, or persisted bankroll data are connected. Calculators assume exhaustive outcomes and matching settlement rules; fees, voids, pushes, stake rounding, and promo restrictions require independent verification.

## Live odds setup

Create an account at https://the-odds-api.com/ and obtain a key with the required sports/markets entitlement. Enter it securely as `ODDS_API_KEY` in environment settings, with destination `api.the-odds-api.com`. Do not place keys in browser code, Git, or chat. Save the settings and restart `npm start` after the binding is available. In cloud environments preserve the provided proxy and CA trust.

The board starts in live mode; choose one sport and refresh manually. Each sport request includes moneylines, spreads, and totals; provider quota costs depend on your plan. Server responses are cached for 60 seconds and concurrent requests are combined. No background polling occurs. Provider market timestamps are shown and prices older than five minutes are marked stale. The fetched timestamp is not a guarantee of price freshness or availability at the sportsbook. Demo mode must be selected explicitly; live failures never substitute demo data.

`GET /api/odds?sport=NBA` (also NFL and MLB) returns normalized sportsbook rows or a sanitized error. No key returns 503. Missing seasonal coverage may return an empty array. Player props require a separate event-level endpoint and are not integrated yet. API tests use synthetic provider fixtures; authenticated provider access must be verified after the key and network settings are applied.

True value estimates require a calibrated probability model or justified market reference; implied probability alone is not an edge.

## Hosting and comparisons

See [DEPLOY.md](DEPLOY.md) for the Render Blueprint, private sign-in, and deployment verification. The board defaults to DraftKings and can filter other available books. The arbitrage lab automatically scans loaded live data for candidates involving DraftKings. It excludes started events, stale or unsynchronized quotes, three-way markets, and integer spread/total lines. Candidates still require verification of sportsbook settlement rules, limits, rounding, and executable prices.
