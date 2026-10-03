const gamesPath = 'src/assets/games-2026.json'
const encoder = new TextEncoder()
const requestTimeout = 6000

function hexToBytes (hex) {
  return Uint8Array.from(hex.match(/.{2}/g), byte => Number.parseInt(byte, 16))
}

export async function verifyDiscordRequest (body, signature, timestamp, publicKeyHex, now = Date.now()) {
  if (!/^[\da-f]{128}$/i.test(signature ?? '') || !/^[\da-f]{64}$/i.test(publicKeyHex ?? '')) {
    return false
  }
  if (!/^\d{1,12}$/.test(timestamp ?? '')) {
    return false
  }

  const timestampMs = Number(timestamp) * 1000
  if (!Number.isSafeInteger(timestampMs) || Math.abs(now - timestampMs) > 5 * 60 * 1000) {
    return false
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKeyHex),
      { name: 'Ed25519' },
      false,
      ['verify'],
    )
    return await crypto.subtle.verify(
      'Ed25519',
      key,
      hexToBytes(signature),
      encoder.encode(`${timestamp}${body}`),
    )
  } catch (error) {
    console.error('Discord signature verification failed unexpectedly.', error)
    throw error
  }
}

function jsonResponse (status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function discordPrivateResponse (content) {
  return jsonResponse(200, {
    type: 4,
    data: { content, flags: 64 },
  })
}

async function steamApp (appId) {
  const response = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}`,
    { signal: AbortSignal.timeout(requestTimeout) },
  )
  if (!response.ok) {
    throw new Error(`Steam lookup failed with HTTP ${response.status}.`)
  }

  const result = await response.json()
  const app = result[appId]
  if (!app?.success || !app.data?.name) {
    throw new Error(`Steam app ${appId} was not found.`)
  }

  return app.data
}

async function steamGridRequest (path, apiKey) {
  const response = await fetch(`https://www.steamgriddb.com/api/v2${path}`, {
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'user-agent': 'spooky-season-discord-worker',
    },
    signal: AbortSignal.timeout(requestTimeout),
  })
  if (!response.ok) {
    throw new Error(`SteamGridDB request ${path} failed with HTTP ${response.status}.`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(`SteamGridDB request ${path} returned an unsuccessful response.`)
  }
  return result.data
}

async function optionalSteamGridRequest (path, apiKey, fallback) {
  try {
    return await steamGridRequest(path, apiKey)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unexpected SteamGridDB error.'
    console.error(detail)
    return fallback
  }
}

export async function getGameMetadata (appId, env) {
  const apiKey = env.STEAMGRIDDB_API_KEY
  const [gridGameResult, heroesResult, logosResult] = apiKey
    ? await Promise.all([
        optionalSteamGridRequest(`/games/steam/${appId}`, apiKey, undefined),
        optionalSteamGridRequest(`/heroes/steam/${appId}`, apiKey, []),
        optionalSteamGridRequest(`/logos/steam/${appId}`, apiKey, []),
      ])
    : [undefined, [], []]
  const gridGame = gridGameResult && typeof gridGameResult === 'object' ? gridGameResult : undefined
  const heroes = Array.isArray(heroesResult) ? heroesResult : []
  const logos = Array.isArray(logosResult) ? logosResult : []

  if (!apiKey) {
    console.error('SteamGridDB API key is not configured; using Steam fallback data.')
  }

  let steamData
  if (!gridGame || !heroes[0]) {
    try {
      steamData = await steamApp(appId)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unexpected Steam API error.'
      console.error(`Steam fallback lookup failed for app ${appId}: ${detail}`)
    }
  }

  const releaseDate = steamData?.release_date?.date
  const parsedReleaseDate = releaseDate ? Date.parse(releaseDate) : Number.NaN
  return {
    info: gridGame ?? {
      id: Number(appId),
      name: steamData?.name ?? `Steam App ${appId}`,
      release_date: Number.isNaN(parsedReleaseDate) ? 0 : Math.floor(parsedReleaseDate / 1000),
      types: ['steam'],
      verified: false,
    },
    logo: logos[0],
    hero: heroes[0] ?? {
      url: steamData?.screenshots?.[0]?.path_full
        ?? `https://store.akamai.steamstatic.com/images/storepagebackground/app/${appId}`,
    },
  }
}

export function upsertGame (games, appId, metadata, addedBy) {
  const index = games.findIndex(game => String(game.id) === appId)
  if (index === -1) {
    games.push({
      id: appId,
      completed: false,
      ...(addedBy && { addedBy }),
      info: metadata.info,
      ...(metadata.logo && { logo: metadata.logo }),
      hero: metadata.hero,
    })
    return { games, changed: true }
  }

  const current = games[index]
  const attribution = current.addedBy ?? addedBy
  const replacement = {
    ...current,
    id: appId,
    completed: current.completed ?? false,
    ...(attribution && { addedBy: attribution }),
    info: metadata.info,
    logo: metadata.logo ?? current.logo,
    hero: metadata.hero ?? current.hero,
  }
  const changed = JSON.stringify(current) !== JSON.stringify(replacement)
  if (changed) {
    games[index] = replacement
  }
  return { games, changed }
}

function discordUser (interaction) {
  const member = interaction.member
  const user = member?.user ?? interaction.user
  if (!user || typeof user.id !== 'string' || !/^\d{1,20}$/.test(user.id)) {
    return undefined
  }

  const name = member?.nick || user.global_name || user.username
  if (typeof name !== 'string' || !name.trim()) {
    return undefined
  }

  const avatarUrl = typeof user.avatar === 'string' && user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`

  return {
    id: user.id,
    name: name.trim(),
    avatarUrl,
  }
}

export function removeGame (games, appId) {
  const index = games.findIndex(game => String(game.id) === appId)
  if (index === -1) {
    return { games, changed: false, removed: undefined }
  }
  const [removed] = games.splice(index, 1)
  return { games, changed: true, removed }
}

function responseSalutation (user, env) {
  if (user?.id && user.id === env.MASTER_USER_ID) {
    return 'Master'
  }
  const name = (user?.name || 'there').replace(/[\r\n\t]+/g, ' ').slice(0, 80)
  return `Mr. ${name}`
}

function resultMessage (command, appId, result, user, env) {
  const salutation = responseSalutation(user, env)
  const title = commitTitle(result.title ?? 'game')
  if (result.status === 'added') {
    return `${salutation}, I've handled adding ${title} (${appId}) to the live site without issue.`
  }
  if (result.status === 'updated') {
    return `${salutation}, I've handled updating ${title} (${appId}) on the live site without issue.`
  }
  if (result.status === 'unchanged') {
    return `${salutation}, ${title} (${appId}) is already up to date on the live site; no changes were needed.`
  }
  if (result.status === 'removed') {
    return `${salutation}, I've handled removing ${title} (${appId}) from the live site without issue.`
  }
  if (result.status === 'notFound') {
    return `${salutation}, I couldn't remove game (${appId}) because it wasn't on the live site.`
  }
  throw new TypeError(`Unsupported game operation result: ${result.status}`)
}

function failureMessage (command, appId, user, env) {
  const salutation = responseSalutation(user, env)
  const operation = command === 'remove' ? 'removing' : 'adding or updating'
  return `${salutation}, I couldn't finish ${operation} game (${appId}) because of a snag with the live site. Please check the Worker logs and try again.`
}

function commitTitle (title) {
  return String(title ?? 'Unknown game').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
    || 'Unknown game'
}

function encodeBase64 (value) {
  const bytes = encoder.encode(value)
  let binary = ''
  const chunkSize = 0x80_00
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCodePoint(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function decodeBase64 (value) {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, character => character.codePointAt(0))
  return new TextDecoder().decode(bytes)
}

function githubHeaders (token) {
  return {
    'accept': 'application/vnd.github+json',
    'authorization': `Bearer ${token}`,
    'content-type': 'application/json',
    'user-agent': 'spooky-season-discord-worker',
    'x-github-api-version': '2022-11-28',
  }
}

async function githubRequest (url, token, operation, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...githubHeaders(token), ...options.headers },
    signal: AbortSignal.timeout(requestTimeout),
  })
  if (!response.ok) {
    const responseBody = await response.text()
    let detail = 'GitHub returned a non-JSON error response'
    try {
      const errorData = JSON.parse(responseBody)
      if (typeof errorData.message === 'string') {
        detail = errorData.message
      }
    } catch {
      detail = `${detail}: ${responseBody.slice(0, 200)}`
    }
    throw new Error(`GitHub ${operation} request failed with HTTP ${response.status}: ${detail.slice(0, 300)}.`)
  }
  return response.json()
}

async function readGamesFile (env) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY_OWNER: owner, GITHUB_REPOSITORY_NAME: repository } = env
  const branch = env.GITHUB_BRANCH || 'main'
  if (!token || !owner || !repository) {
    throw new Error('GitHub Worker configuration is incomplete.')
  }

  const encodedPath = gamesPath.split('/').map(segment => encodeURIComponent(segment)).join('/')
  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${encodedPath}`
  const file = await githubRequest(`${baseUrl}?ref=${encodeURIComponent(branch)}`, token, 'read')
  if (file.encoding !== 'base64' || typeof file.content !== 'string' || typeof file.sha !== 'string') {
    throw new Error('GitHub returned an unsupported game data file.')
  }

  const games = JSON.parse(decodeBase64(file.content))
  if (!Array.isArray(games)) {
    throw new TypeError('Game data file must contain a JSON array.')
  }
  return { games, token, branch, baseUrl, sha: file.sha }
}

async function writeGamesFile (state, games, message) {
  const { token, branch, baseUrl, sha } = state
  await githubRequest(baseUrl, token, 'write', {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encodeBase64(`${JSON.stringify(games, null, 4)}\n`),
      sha,
      branch,
    }),
  })
}

async function updateGame (appId, env, addedBy) {
  const metadata = await getGameMetadata(appId, env)
  const state = await readGamesFile(env)
  const alreadyListed = state.games.some(game => String(game.id) === appId)
  const update = upsertGame(state.games, appId, metadata, addedBy)
  if (!update.changed) {
    return { status: 'unchanged', title: metadata.info.name }
  }

  await writeGamesFile(state, update.games, `Add/update ${commitTitle(metadata.info.name)} (${appId}) in 2026 list`)
  return { status: alreadyListed ? 'updated' : 'added', title: metadata.info.name }
}

async function removeGameFromList (appId, env) {
  const state = await readGamesFile(env)
  const update = removeGame(state.games, appId)
  if (!update.changed) {
    return { status: 'notFound' }
  }

  await writeGamesFile(
    state,
    update.games,
    `Remove ${commitTitle(update.removed.info?.name)} (${appId}) from 2026 list`,
  )
  return { status: 'removed', title: update.removed.info?.name }
}

async function sendFollowUp (applicationId, token, content) {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${encodeURIComponent(applicationId)}/${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content, flags: 64, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(requestTimeout),
    },
  )
  if (!response.ok) {
    throw new Error(`Discord follow-up failed with HTTP ${response.status}.`)
  }
}

async function processGameCommand (interaction, command, appId, env, user, addedBy) {
  const processGame = command === 'add'
    ? (id, bindings) => updateGame(id, bindings, addedBy)
    : removeGameFromList
  let result
  try {
    result = await processGame(appId, env)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unexpected worker error.'
    console.error(`Failed to ${command} Steam app ${appId}: ${detail}`)
    try {
      await sendFollowUp(
        interaction.application_id,
        interaction.token,
        failureMessage(command, appId, user, env),
      )
    } catch (followUpError) {
      const followUpDetail = followUpError instanceof Error ? followUpError.message : 'Unexpected Discord error.'
      console.error(`Could not send /${command} failure response: ${followUpDetail}`)
    }
    return
  }

  try {
    await sendFollowUp(
      interaction.application_id,
      interaction.token,
      resultMessage(command, appId, result, user, env),
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unexpected Discord error.'
    console.error(`Game ${appId} was processed by /${command}, but its Discord response could not be sent: ${detail}`)
  }
}

export async function handleRequest (request, env, ctx) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }
  if (request.headers.get('content-length') && Number(request.headers.get('content-length')) > 100_000) {
    return jsonResponse(413, { error: 'Request body is too large.' })
  }

  const body = await request.text()
  if (body.length > 100_000) {
    return jsonResponse(413, { error: 'Request body is too large.' })
  }

  const validSignature = await verifyDiscordRequest(
    body,
    request.headers.get('x-signature-ed25519'),
    request.headers.get('x-signature-timestamp'),
    env.DISCORD_PUBLIC_KEY,
  )
  if (!validSignature) {
    return jsonResponse(401, { error: 'Invalid Discord request signature.' })
  }

  let interaction
  try {
    interaction = JSON.parse(body)
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON request body.' })
  }

  if (interaction.type === 1) {
    return jsonResponse(200, { type: 1 })
  }
  const command = interaction.type === 2 ? interaction.data?.name : undefined
  if (!['add', 'remove'].includes(command)) {
    return discordPrivateResponse('Unsupported command.')
  }

  if (!env.ALLOWED_CHANNEL_ID || String(interaction.channel_id) !== env.ALLOWED_CHANNEL_ID) {
    return discordPrivateResponse(`Use /${command} in the configured game suggestions channel.`)
  }

  const appId = interaction.data.options?.find(option => option.name === 'game_id')?.value
  if (typeof appId !== 'string' || !/^\d{1,12}$/.test(appId) || Number(appId) <= 0) {
    return discordPrivateResponse('Enter a valid numeric Steam game ID.')
  }
  const user = discordUser(interaction)
  const addedBy = command === 'add' ? user : undefined
  if (command === 'add' && !addedBy) {
    return discordPrivateResponse('Could not identify the Discord user who ran this command.')
  }
  if (!interaction.token || !interaction.application_id) {
    return jsonResponse(400, { error: 'Discord interaction is missing follow-up details.' })
  }

  ctx.waitUntil(processGameCommand(interaction, command, appId, env, user, addedBy))
  return jsonResponse(200, { type: 5, data: { flags: 64 } })
}

export default {
  fetch (request, env, ctx) {
    return handleRequest(request, env, ctx)
  },
}
