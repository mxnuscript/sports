# Deploy on Render

1. Save these project changes to the GitHub repository, including `render.yaml`. The cloud environment snapshot alone does not push files to GitHub.
2. Sign in at https://dashboard.render.com/ and choose **New → Blueprint**. Connect `mxnuscript/sports` and select the branch containing this version. Render reads `render.yaml`.
3. Review Render's service plan and pricing before creating the service. Enter `ODDS_API_KEY`, `EDGE_USER`, and a strong unique `EDGE_PASSWORD` in Render's secure environment settings. The API key saved in Codex does not automatically transfer to Render.
4. Deploy. Render supplies an HTTPS service URL. Open it and sign in with your configured username/password. Never send these credentials in chat. `/health` is a public process-health check, not an odds-feed readiness check.
5. Choose a sport on the odds board, select All books, and refresh. Check that the provider timestamps and sportsbook names appear. Open Arbitrage lab to see matching candidates, if any. No opportunities is a valid result.

The native Node service uses Node 24.14, runs `npm test` during build, and `npm start` at runtime. No database or paid third-party build service is required. Sportsbook coverage varies by provider and region; a missing book is not substituted. Live player props remain unconnected. Odds API usage may incur subscription charges; requests are manual with a 60-second cache per sport. Basic sign-in protects access to the hosted feed; use the Render HTTPS URL. No automated wagers are placed.
