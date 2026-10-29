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

## Oregon and the compact board

The board combines each team's moneyline and spread on one row per event and sportsbook. Alternate spread lines are retained; totals and props stay separate. Oregon mode is the default and currently enables only DraftKings, confirmed on the Oregon Lottery sports page on October 29, 2026: https://www.oregonlottery.org/sports/. This is coverage verification, not an exhaustive legal review. Other supplied sportsbook prices remain visible in explicit reference mode and are not represented as executable from Oregon.

The Oregon platforms tab tracks Underdog, Betr and PrizePicks as unverified product-specific eligibility, not connected live feeds. Their help pages could not be verified during this change. A manual pick’em watchlist records user-confirmed eligible selections in browser localStorage (maximum 100). It does not calculate arbitrage from pick’em selections, store account credentials, or invent prices. Check exact product, state eligibility, payouts, void rules and entry terms directly in your account. This directory is a starting point; it does not claim to enumerate every Oregon retail, tribal or fantasy offering.

### Windows quick start / update

Download the latest ZIP for `edge/live-odds-workspace` and extract it to a new folder. Stop the old app with Ctrl+C. Double-click `start-windows.cmd` in the folder containing package.json, enter your Odds API key when prompted, and open http://localhost:3000. Requires Node 24.5 or newer. The launcher keeps the key only in the process environment and avoids PowerShell's npm.ps1 execution-policy issue. It does not change execution policy or install dependencies. Existing browser watchlist notes remain on the same localhost port/browser. To update, download/extract the new ZIP; changes pushed to GitHub do not update an existing ZIP extraction automatically.

## Comparison tools

Switch between the compact team view and Compare books. Comparison columns group identical event, selection, market and line; different spreads/totals are never treated as the same price. Best shown excludes quotes older than five minutes or with unknown timestamps in provider mode, and means only best among displayed prices. It does not imply positive EV or Oregon access. Click any quote to inspect its timestamp and transfer odds into a calculator.

Pregame filtering is on by default, with start-time/name sorting and CSV export of filtered quotes. CSV formula-leading fields are escaped. Odds movement indicators compare the last loaded provider snapshot; there is no historical price database. Auto-refresh is off by default, configurable at 60/120/300 seconds, pauses in hidden tabs, and consumes provider credits after cache expiry. Quotes still use the server's 60-second cache; this is not a real-time streaming feed.

The arbitrage reference table supports total stake, minimum return and market filters. Stakes are rounded to cents and the lower of the two modeled settlement profits is reported. Actual minimum stakes, limits, fees, voids and settlement still need verification. Oregon mode continues to suppress cross-book actionable candidates because only DraftKings coverage is confirmed.

Design references: AVO's public odds-screen page (https://www.avo.bet/product/odds) informed side-by-side comparisons, search and market navigation. OddsJam's supplied arbitrage page could not be inspected because it returned HTTP 403. No proprietary assets, pricing feed or real-time claims are copied from these products.
