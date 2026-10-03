# Discord `/add` on Cloudflare Workers

This setup lets people add, refresh, remove, set/clear image overrides, and rate Steam games using Discord slash commands in one configured channel. A Cloudflare Worker verifies Discord's signed interaction and updates only `src/assets/games-2026.json` through GitHub's Contents API. Commits to `main` start the existing GitHub Pages workflow.

## Flow

1. A Discord user runs `/add`, `/remove`, `/set-hero`, `/set-logo`, `/set-adder`, `/clear-hero`, `/clear-logo`, `/rate`, or `/clear-rating`. Every command except `/add` autocompletes game titles from the current 2026 list.
2. Discord sends the signed interaction to the Worker.
3. The Worker verifies the Ed25519 signature and checks the configured channel.
4. For autocomplete, the Worker immediately returns matching game titles. For a selected command, it defers the private Discord response, looks up game info, heroes, and logos on SteamGridDB where needed, and uses Steam Store data as fallback.
5. The Worker reads the current JSON from GitHub, performs the requested operation on the matching entry, and commits the JSON change directly to the configured branch.
6. The Worker posts a private result to Discord. When `/add` creates a new entry, it also posts a public channel announcement attributing it to “Master” or the other user's display name, linking to the Spooky Season game list and the Steam store page (which Discord can preview). Refreshing an existing game does not post another announcement. A commit to `main` triggers the existing Pages deployment workflow.

The Worker writes only `src/assets/games-2026.json`. It uses the SteamGridDB game record and first returned logo and hero, matching the website's **Get Game Data** behavior. If SteamGridDB has no game record, Steam's name and release date are used; if it has no hero, a Steam screenshot or store background is used. Existing entries retain user-managed `completed` and `rating` fields; a missing SteamGridDB logo does not erase an existing logo. New entries have `completed: false` and record the Discord user who first added them. That attribution (display name and avatar URL) is stored in the public game-data JSON; refreshing an entry does not replace the original attribution. For the configured `MASTER_USER_ID`, attribution is displayed as “Ghost” with the custom avatar in `public/ghost-avatar.png`, regardless of the Discord profile's display name or avatar. `/add` keeps a numeric string `game_id`; the other commands show game titles using autocomplete and pass the selected Steam ID to the Worker.

For `/remove`, `/set-hero`, `/set-logo`, `/set-adder`, `/clear-hero`, `/clear-logo`, `/rate`, and `/clear-rating`, type part of a title into the required `game` option and select a suggestion. Suggestions match title text, are limited to 25 results per Discord request, and use the game ID internally. The list is read from GitHub and briefly cached at Cloudflare's edge, so very recent list changes may take up to 15 seconds to appear in autocomplete. `/add` remains ID-based because the game being added is not necessarily in the existing list.

`/remove` deletes the matching game ID from the 2026 list without making Steam or SteamGridDB requests. If the ID is not present, the command reports that and does not create a commit. This command removes the list entry, including its saved completion/rating/artwork and attribution fields; it cannot be undone by the bot.

`/set-hero` and `/set-logo` take an autocomplete-selected game and an HTTPS image URL. They store a persistent manual override that subsequent `/add` refreshes preserve. `/clear-hero` and `/clear-logo` remove the corresponding override and clear the current image so the site's normal fallback is used.

`/set-adder` takes an autocomplete-selected game and a Discord user. It uses Discord's native user picker to select a server member, then updates the saved added-by name, user ID, and avatar for that game. The user picker searches server members; Discord does not expose a separate member list scoped to a text channel.

`/rate` accepts 0.5 through 5 in half-star increments. Each Discord user has one rating per game; rating again replaces that user's previous rating. The visible `rating` is the arithmetic mean of current user ratings. `/clear-rating` removes only the invoking user's rating and recalculates the average; if no ratings remain, the `rating` and `userRatings` fields are removed. Older aggregate-only `rating` values cannot be attributed to a user and are replaced when the first Discord vote is recorded.

## Requirements and permissions

- A Cloudflare account with Workers enabled; check current plan limits and pricing before deployment.
- A GitHub fine-grained personal access token restricted to this repository with **Contents: read and write** permission. Do not use `GITHUB_TOKEN` from a GitHub Actions run: commits made with that token do not trigger another Actions workflow.
- A Cloudflare API token and account ID stored as GitHub Actions secrets to deploy Worker code automatically.
- The Discord application ID, bot token, and test guild ID stored as GitHub Actions secrets so CI can register slash commands automatically.
- A Discord application with the registered game-management slash commands and an interactions endpoint.
- Direct pushes to the selected branch must be allowed. A ruleset requiring pull requests will reject the commit.

The GitHub token is stored as a Cloudflare Worker secret and never goes into source control. The Worker uses GitHub's REST API; it does not need an SSH deploy key, AWS, or a running Discord Gateway bot.

## Configure and deploy

1. Install the Worker tooling and run the local tests:

   ```sh
   npm install --prefix bot/functions
   npm --prefix bot/functions test
   ```

2. In GitHub, open **sage-afk/spooky-season → Settings → Secrets and variables → Actions**. Add these repository secrets:

   - `CLOUDFLARE_API_TOKEN`: create an Account API token using Cloudflare's **Edit Cloudflare Workers** template, scoped to the account that owns the Worker.
   - `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID for that account.
   - `DISCORD_APPLICATION_ID`: the Discord application ID.
   - `DISCORD_BOT_TOKEN`: the bot token for that application. Treat this as a secret and never commit it.
   - `DISCORD_TEST_GUILD_ID`: the Discord server ID where guild commands should be registered.

   The Cloudflare credentials are used by CI to deploy the Worker, and the Discord credentials are used to register guild commands. Keep the GitHub PAT, SteamGridDB key, and Discord interaction public key as Cloudflare Worker secrets; they are not needed by this workflow.

3. Edit `bot/wrangler.toml` and set `ALLOWED_CHANNEL_ID` to the Discord channel where the game-management commands are permitted. Check the repository owner, repository name, branch, and `MASTER_USER_ID` values there too.
4. Log in to Cloudflare from the repository root:

   ```sh
   cd bot/functions
   npx wrangler login --device --config ../wrangler.toml
   ```

   Device authorization is intended for remote environments: Wrangler prints a URL and code to open in your local browser, so it does not need a localhost callback to reach the web IDE.

5. Store the Discord application's public key, a fine-grained GitHub token, and a SteamGridDB API key as Worker secrets:

   ```sh
   npx wrangler secret put DISCORD_PUBLIC_KEY --config ../wrangler.toml
   npx wrangler secret put GITHUB_TOKEN --config ../wrangler.toml
   npx wrangler secret put STEAMGRIDDB_API_KEY --config ../wrangler.toml
   ```

   The Discord public key is available in the Developer Portal. The GitHub token needs read/write Contents permission for `sage-afk/spooky-season` only. Use a SteamGridDB API key for the final prompt and keep it out of source files. The website's existing development helper has a SteamGridDB key in client-side code, so generate a fresh key for the Worker rather than reusing that exposed key.

6. Deploy the Worker once and copy the resulting `workers.dev` URL:

   ```sh
   npx wrangler deploy --config ../wrangler.toml
   ```

7. In the Discord Developer Portal, set that URL as the application's **Interactions Endpoint URL**. Discord sends a signed PING to validate it; the Worker responds with PONG.
8. Register the slash commands in a test server once manually. Afterward, the deployment workflow registers them automatically after each successful Worker deployment:

   ```sh
   cd ../..
   export DISCORD_APPLICATION_ID='your-application-id'
   export DISCORD_TEST_GUILD_ID='your-test-server-id'
   read -rsp 'Discord bot token: ' DISCORD_BOT_TOKEN
   export DISCORD_BOT_TOKEN
   printf '\n'
   node bot/scripts/register-command.mjs
   unset DISCORD_BOT_TOKEN
   ```

9. Test `/add`, `/remove`, the image override/clear commands, `/rate`, and `/clear-rating` in the configured channel. Confirm private Discord responses, the commits on the selected branch, and the GitHub Pages Actions runs.

After this one-time setup, `.github/workflows/deploy-worker.yml` deploys the Worker automatically when files under `bot/functions/`, `bot/scripts/register-command.mjs`, `bot/wrangler.toml`, or the deployment workflow itself change on `main`, then registers the guild slash commands. It can also be run manually from GitHub's **Actions → Deploy Discord Worker → Run workflow**. The workflow does not run for game-data-only commits, and Worker deployment does not push a commit, so it does not cause a deployment loop. The Pages workflow remains responsible for the site.

## Runtime and failure handling

The Worker sends Discord's deferred response before making upstream requests. It uses `waitUntil` to perform SteamGridDB and Steam lookups, GitHub read/write, and the Discord follow-up after that response. Replies address the configured `MASTER_USER_ID` as “Master” and other users as “Mr. {display name}”, with distinct wording for adding, updating, removing, and errors. If SteamGridDB is unavailable, it logs the lookup failure and falls back to Steam data where possible. If the GitHub commit fails, the user receives a private failure response and the Worker logs a diagnostic without logging interaction tokens or credentials. If Discord cannot receive the follow-up after a successful commit, the Worker logs that separately and does not claim the commit failed.

The GitHub Contents API uses the current file SHA for optimistic concurrency. If another update changes the file at the same time, GitHub rejects the stale write instead of overwriting that concurrent change; rerun `/add` after the conflict. Worker background execution is subject to Cloudflare's current runtime limits.
