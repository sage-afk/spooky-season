# Discord Bot Plan for Spooky Season Game Additions

This document outlines the simplest free-tier setup for a Discord bot that lets users type a command such as `!add 1144200` to suggest a game for the 2026 list. It will hook into the existing GitHub repo and update the game JSON data so the site can rebuild and deploy.

## Goals

- Keep the site running as a static GitHub Pages app
- Allow Discord users to suggest game IDs from chat
- Avoid running anything locally 24/7
- Stay on the lowest-cost / free-friendly setup
- Keep the flow safe and reviewable

## Recommended architecture

### High-level flow

1. Someone in Discord types `!add 1144200`
2. A hosted Discord bot receives the message
3. The bot validates that the ID looks valid and fetches Steam metadata
4. The bot updates the source data file in the repo, likely `src/assets/games-2026.json`
5. The bot creates a branch and opens a pull request to the repo
6. A GitHub Action builds/deploys the site after merge

This is the safest and easiest approach for a free-tier implementation.

---

## Why this architecture

A direct “bot writes to main and deploys immediately” flow is tempting, but it is riskier and less reviewable. A small PR-based workflow is easier to protect and much easier to trust.

For a static site like this one, you do not need a full backend. The bot is just a thin automation layer on top of the repo.

---

## Best free-friendly hosting choice

### Option 1: Render free tier
Recommended first choice.

Pros:
- easy deployment
- simple Node app setup
- easy env vars
- easy deployment from GitHub

Cons:
- free tier may not always be ideal for always-on bot uptime
- may sleep depending on plan details

### Option 2: Railway free tier
Also good.

Pros:
- simple setup
- good UX for Node apps
- easy environment management

Cons:
- still not guaranteed for always-online chat bot usage

### Option 3: GitHub Actions + polling
This is the absolute cheapest approach, but not as responsive.

This would not be a live Discord bot in the normal sense. It would be more like:
- Discord requests get collected elsewhere
- a workflow periodically checks for pending suggestions
- then it updates the repo and deploys

This is less “real-time” and more manual, but very cheap.

For the simple MVP, use Render or Railway.

---

## Bot responsibilities

The bot should do only a few things:

- listen for messages starting with `!add`
- validate the command syntax
- ensure the app ID is numeric
- fetch metadata from Steam or an app API
- check whether the game is already in the list
- append or update the entry in `src/assets/games-2026.json`
- create a branch and commit
- open a PR to GitHub

The bot should not do arbitrary file writes outside the expected data file.

---

## Repo changes needed

The site already stores the yearly game data in JSON files, especially:

- `src/assets/games-2026.json`
- `src/assets/games.json`

The bot should write to the correct JSON file for the active year, likely `games-2026.json` for the current list.

The app itself already reads the saved data and hydrates the list from `savedDataByYear[year.value]`, so the main requirement is to keep the JSON structure consistent.

### Required JSON shape

Each entry in the array should look like this:

```json
{
  "id": "1144200",
  "completed": false,
  "info": {
    "id": 5255524,
    "name": "Ready or Not",
    "release_date": 1639784846,
    "types": ["steam"],
    "verified": true
  },
  "logo": {
    "url": "https://cdn2.steamgriddb.com/logo/...png"
  },
  "hero": {
    "id": 134602,
    "url": "https://cdn2.steamgriddb.com/hero/...png"
  }
}
```

Important:
- `id` is a string
- `completed` should be `false` by default
- `info.name` should be the actual game title
- if you want to keep the structure light, you can omit `logo` and `hero` if the app can fetch them later

---

## Minimal bot flow

### Command syntax

```bash
!add 1144200
```

### Bot behavior

1. Parse the argument
2. Confirm it matches a Steam app ID pattern
3. Query Steam or a Steam API endpoint for a game name
4. Verify it isn’t already present in the JSON array
5. Insert the new item in the correct place or at the end
6. Save the file
7. Commit to a branch
8. Open a PR

The bot should respond with something like:

```text
Added Ready or Not (1144200) to the 2026 list.
PR created: #123
```

---

## Discord setup

### Create the bot

1. Go to the Discord Developer Portal
2. Create a new application
3. Add a bot to the application
4. Copy the bot token
5. Invite the bot to your Discord server using the OAuth2 URL generator
6. Give it permissions such as:
   - Send Messages
   - Read Message History
   - View Channel

For a simple MVP, only a few permissions are needed.

### Store secrets safely

Store the following in environment variables on the host:

- `DISCORD_TOKEN`
- `GITHUB_TOKEN`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- optionally `STEAM_WEB_API_KEY` if using Steam APIs

Do not hardcode secrets in the bot source code.

---

## GitHub setup

### Create a GitHub token

Use a GitHub personal access token or a GitHub App token with permission to:

- read repository contents
- write repository contents
- open pull requests

If you want a safer bot flow, use a dedicated GitHub App or a token with restricted permissions.

### Repo configuration

The bot should target the repo that hosts this site, likely the current repo in GitHub.

The repo should allow:
- GitHub Actions to run
- PRs to be opened from the bot account or token owner

---

## Deployment / site update flow

The site is static and likely built with Vite. GitHub Pages can deploy automatically from GitHub Actions.

### What happens after a PR is merged

1. GitHub Action runs
2. `npm install` runs
3. `npm run build` runs
4. output is published to GitHub Pages

This means the site updates automatically when the repo data is changed.

No custom backend is required for the final website.

---

## Simple Node bot example

This is the bare-minimum structure:

```bash
bot/
  package.json
  .env.example
  index.js
```

Example package dependencies:

```json
{
  "dependencies": {
    "discord.js": "^14.x",
    "node-fetch": "^3.x"
  }
}
```

Example command handler:

```js
import { Client, GatewayIntentBits } from 'discord.js'
import fetch from 'node-fetch'

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
})

client.on('messageCreate', async (message) => {
  if (message.author.bot) return

  if (!message.content.startsWith('!add')) return

  const args = message.content.trim().split(/\s+/)
  const appId = args[1]

  if (!/^\d+$/.test(String(appId || ''))) {
    message.reply('Usage: `!add 1144200`')
    return
  }

  try {
    const steamInfo = await fetchSteamInfo(appId)
    const result = await createGamePr(appId, steamInfo.name)
    message.reply(`Submitted ${steamInfo.name} (${appId})\n${result}`)
  } catch (error) {
    message.reply(`Failed to add game: ${error.message}`)
  }
})

client.login(process.env.DISCORD_TOKEN)
```

This is intentionally basic and meant to be easy to maintain.

---

## Site-side data update helper

You may want to add a small script in the project to keep the JSON manipulation logic consistent.

For example:

- `scripts/add-game.mjs`

This script would:

- read `src/assets/games-2026.json`
- check for duplicate IDs
- append a new object if missing
- write the JSON back in a clean format

This keeps the bot logic and site logic separated cleanly.

Example concept:

```js
import fs from 'node:fs'

const filePath = 'src/assets/games-2026.json'
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

const exists = data.some((game) => String(game.id) === String(appId))
if (exists) throw new Error('Game already exists')

data.push({
  id: String(appId),
  completed: false,
  info: {
    id: Number(appId),
    name: gameName,
    types: ['steam'],
    verified: true,
  },
})

fs.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}\n`)
```

This script can be called by the bot or by a GitHub Actions workflow.

---

## Recommended bot safety rules

The bot should reject or ignore:

- non-numeric IDs
- duplicate IDs
- unsupported commands
- non-Steam or invalid app IDs
- suspicious messages with huge payloads

Also, keep the command limited to a specific Discord channel or role if needed.

---

## Recommended rollout plan

### Phase 1: proof of concept
- bot listens on one Discord server
- `!add 1144200` adds a game to the JSON file
- bot opens PR to the repo
- no direct deployment from the bot

### Phase 2: validation
- check duplicates
- check app ID validity
- ensure the info object is clean
- provide a confirmation message

### Phase 3: polish
- allow `!add` only in a specific channel
- add admin-only commands
- show preview text before PR creation
- optional `!list` or `!help`

---

## Final recommendation

For your project, the simplest workable free setup is:

- Render or Railway for the bot
- Discord bot token + GitHub token in env vars
- one command: `!add {game_id}`
- bot appends a game entry to `src/assets/games-2026.json`
- bot creates a PR to the repo
- GitHub Pages redeploys after merge

This is simple, safe, free-friendly, and matches your project well.

---

## Next steps

1. Create the Discord application and bot
2. Deploy a tiny Node bot on Render or Railway
3. Add the GitHub token and Discord token
4. Implement `!add {game_id}`
5. Confirm the bot can update the JSON file in a PR branch
6. Merge once verified
7. Let the site rebuild and deploy

This is the easiest practical path for an always-on Discord integration without hosting it on your own machine.
