# Discord `/add` Cloudflare Worker

The Worker implementation is in [`functions/worker.mjs`](./functions/worker.mjs), with deployment configuration in [`wrangler.toml`](./wrangler.toml). It verifies Discord interactions, accepts `/add` and `/remove game_id:<Steam app ID>` only from the configured channel, updates `src/assets/games-2026.json` through GitHub's Contents API, and replies privately.

See the repository's [Discord bot plan](../DISCORD_BOT_PLAN.md) for setup, token permissions, deployment, and testing instructions.
