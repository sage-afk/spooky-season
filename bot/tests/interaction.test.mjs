import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import test from 'node:test'
import {
  getGameAutocompleteChoices,
  handleRequest,
  verifyDiscordRequest,
} from '../functions/worker.mjs'

function signatureFor (body, privateKey, timestamp) {
  return sign(null, Buffer.from(`${timestamp}${body}`), privateKey).toString('hex')
}

async function runGameCommand (command, options, games, resolved) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({
    type: 2,
    channel_id: 'allowed-channel',
    application_id: 'application-id',
    token: 'interaction-token',
    member: {
      user: { id: '187258416102768640', username: 'master-user', avatar: null },
    },
    data: { name: command, options, ...(resolved && { resolved }) },
  })
  const request = new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signatureFor(body, privateKey, timestamp),
      'x-signature-timestamp': timestamp,
    },
    body,
  })
  const originalFetch = globalThis.fetch
  const requests = []
  let backgroundTask
  globalThis.fetch = async (url, requestOptions = {}) => {
    requests.push({ url: String(url), options: requestOptions })
    if (requestOptions.method === 'PUT') {
      return Response.json({ commit: { sha: 'new-sha' } })
    }
    if (String(url).startsWith('https://api.github.com/')) {
      return Response.json({
        encoding: 'base64',
        content: Buffer.from(JSON.stringify(games)).toString('base64'),
        sha: 'old-sha',
      })
    }
    return Response.json({})
  }

  try {
    const response = await handleRequest(request, {
      DISCORD_PUBLIC_KEY: publicKeyHex,
      ALLOWED_CHANNEL_ID: 'allowed-channel',
      GITHUB_TOKEN: 'test-token',
      GITHUB_REPOSITORY_OWNER: 'owner',
      GITHUB_REPOSITORY_NAME: 'repo',
      GITHUB_BRANCH: 'main',
      MASTER_USER_ID: '187258416102768640',
    }, {
      waitUntil (promise) {
        backgroundTask = promise
      },
    })
    await backgroundTask
    const write = requests.find(({ options: fetchOptions }) => fetchOptions.method === 'PUT')
    const writtenGames = write
      ? JSON.parse(Buffer.from(JSON.parse(write.options.body).content, 'base64').toString())
      : undefined
    const followUp = requests.find(({ url }) => url.startsWith('https://discord.com/api/v10/webhooks/'))

    return { response, writtenGames, followUp, requests }
  } finally {
    globalThis.fetch = originalFetch
  }
}

async function runAutocomplete (command, query, games, channelId = 'allowed-channel') {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({
    type: 4,
    channel_id: channelId,
    data: {
      name: command,
      options: [{ name: 'game', type: 3, value: query, focused: true }],
    },
  })
  const request = new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signatureFor(body, privateKey, timestamp),
      'x-signature-timestamp': timestamp,
    },
    body,
  })
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options })
    return Response.json({
      encoding: 'base64',
      content: Buffer.from(JSON.stringify(games)).toString('base64'),
      sha: 'game-list-sha',
    })
  }

  try {
    const response = await handleRequest(request, {
      DISCORD_PUBLIC_KEY: publicKeyHex,
      ALLOWED_CHANNEL_ID: 'allowed-channel',
      GITHUB_TOKEN: 'test-token',
      GITHUB_REPOSITORY_OWNER: 'owner',
      GITHUB_REPOSITORY_NAME: 'repo',
      GITHUB_BRANCH: 'main',
    }, { waitUntil () {
      assert.fail('Autocomplete must respond directly without scheduling work.')
    } })

    return { response, requests }
  } finally {
    globalThis.fetch = originalFetch
  }
}

test('verifies a valid Discord Ed25519 signature', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({ type: 1 })
  const signature = signatureFor(body, privateKey, timestamp)

  assert.equal(await verifyDiscordRequest(body, signature, timestamp, publicKeyHex), true)
  assert.equal(await verifyDiscordRequest(`${body} `, signature, timestamp, publicKeyHex), false)
})

test('rejects malformed and stale Discord signatures', async () => {
  const now = Date.now()
  const timestamp = String(Math.floor(now / 1000) - 600)

  assert.equal(await verifyDiscordRequest('{}', 'invalid', timestamp, '00'.repeat(32), now), false)
})

test('answers Discord PING requests with PONG', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({ type: 1 })
  const request = new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signatureFor(body, privateKey, timestamp),
      'x-signature-timestamp': timestamp,
    },
    body,
  })

  const response = await handleRequest(request, { DISCORD_PUBLIC_KEY: publicKeyHex }, { waitUntil () {} })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { type: 1 })
})

test('suggests matching game titles with Steam IDs for autocomplete', async () => {
  const { response, requests } = await runAutocomplete('rate', 'we are so d', [
    { id: '4796830', info: { name: 'WE ARE SO DEAD' } },
    { id: '42', info: { name: 'Completely Different Game' } },
  ])

  assert.deepEqual(await response.json(), {
    type: 8,
    data: { choices: [{ name: 'WE ARE SO DEAD', value: '4796830' }] },
  })
  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /games-2026\.json/)
  assert.deepEqual(requests[0].options.cf, { cacheTtl: 15, cacheEverything: true })
})

test('does not fetch games for autocomplete outside the configured channel', async () => {
  const { response, requests } = await runAutocomplete(
    'remove',
    'game',
    [{ id: '42', info: { name: 'Test Game' } }],
    'wrong-channel',
  )

  assert.deepEqual(await response.json(), { type: 8, data: { choices: [] } })
  assert.equal(requests.length, 0)
})

test('limits game autocomplete results to Discord 25-choice maximum', () => {
  const games = Array.from({ length: 30 }, (_, index) => ({
    id: String(index + 1),
    info: { name: `Game ${String(index + 1).padStart(2, '0')}` },
  }))

  const choices = getGameAutocompleteChoices(games, 'game')

  assert.equal(choices.length, 25)
  assert.equal(choices[0].value, '1')
})

test('rejects /add commands from outside the configured channel', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({
    type: 2,
    channel_id: 'wrong-channel',
    data: { name: 'add', options: [{ name: 'game_id', value: '42' }] },
  })
  const request = new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signatureFor(body, privateKey, timestamp),
      'x-signature-timestamp': timestamp,
    },
    body,
  })

  const response = await handleRequest(request, {
    DISCORD_PUBLIC_KEY: publicKeyHex,
    ALLOWED_CHANNEL_ID: 'allowed-channel',
  }, { waitUntil () {
    assert.fail('Rejected command must not schedule work.')
  } })

  assert.equal(response.status, 200)
  assert.match((await response.json()).data.content, /configured game suggestions channel/)
})

test('removes a game through /remove without looking up metadata', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({
    type: 2,
    channel_id: 'allowed-channel',
    application_id: 'application-id',
    token: 'interaction-token',
    member: {
      user: {
        id: '187258416102768640',
        username: 'master-user',
        avatar: null,
      },
    },
    data: { name: 'remove', options: [{ name: 'game', value: '42' }] },
  })
  const request = new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signatureFor(body, privateKey, timestamp),
      'x-signature-timestamp': timestamp,
    },
    body,
  })
  const originalFetch = globalThis.fetch
  const requests = []
  let backgroundTask
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options })
    if (options.method === 'PUT') {
      return Response.json({ commit: { sha: 'new-sha' } })
    }
    if (String(url).startsWith('https://api.github.com/')) {
      return Response.json({
        encoding: 'base64',
        content: Buffer.from(JSON.stringify([
          { id: '1', completed: true },
          { id: '42', completed: false, info: { name: 'Test Remove Game' } },
          { id: '43', completed: true },
        ])).toString('base64'),
        sha: 'old-sha',
      })
    }
    return Response.json({})
  }

  try {
    const response = await handleRequest(request, {
      DISCORD_PUBLIC_KEY: publicKeyHex,
      ALLOWED_CHANNEL_ID: 'allowed-channel',
      GITHUB_TOKEN: 'test-token',
      GITHUB_REPOSITORY_OWNER: 'owner',
      GITHUB_REPOSITORY_NAME: 'repo',
      GITHUB_BRANCH: 'main',
      MASTER_USER_ID: '187258416102768640',
    }, {
      waitUntil (promise) {
        backgroundTask = promise
      },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { type: 5, data: { flags: 64 } })
    await backgroundTask

    const writeRequest = requests.find(({ options }) => options.method === 'PUT')
    assert.ok(writeRequest)
    const writtenGames = JSON.parse(Buffer.from(JSON.parse(writeRequest.options.body).content, 'base64').toString())
    assert.deepEqual(writtenGames, [
      { id: '1', completed: true },
      { id: '43', completed: true },
    ])
    assert.match(JSON.parse(writeRequest.options.body).message, /Remove Test Remove Game \(42\) from 2026 list/)
    assert.ok(!requests.some(({ url }) => url.startsWith('https://www.steamgriddb.com/')))
    const followUp = requests.find(({ url }) => url.startsWith('https://discord.com/api/v10/webhooks/'))
    assert.ok(followUp)
    assert.match(JSON.parse(followUp.options.body).content, /^Master, I've handled removing Test Remove Game \(42\) from the live site without issue\.$/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('addresses the configured Master in a private operation failure reply', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({
    type: 2,
    channel_id: 'allowed-channel',
    application_id: 'application-id',
    token: 'interaction-token',
    member: {
      user: {
        id: '187258416102768640',
        username: 'master-user',
        avatar: null,
      },
    },
    data: { name: 'remove', options: [{ name: 'game', value: '42' }] },
  })
  const request = new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signatureFor(body, privateKey, timestamp),
      'x-signature-timestamp': timestamp,
    },
    body,
  })
  const originalFetch = globalThis.fetch
  let followUpBody
  let backgroundTask
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).startsWith('https://api.github.com/')) {
      return Response.json({ message: 'Forbidden' }, { status: 403 })
    }
    if (String(url).startsWith('https://discord.com/api/v10/webhooks/')) {
      followUpBody = JSON.parse(options.body)
    }
    return Response.json({})
  }

  try {
    const response = await handleRequest(request, {
      DISCORD_PUBLIC_KEY: publicKeyHex,
      ALLOWED_CHANNEL_ID: 'allowed-channel',
      GITHUB_TOKEN: 'test-token',
      GITHUB_REPOSITORY_OWNER: 'owner',
      GITHUB_REPOSITORY_NAME: 'repo',
      MASTER_USER_ID: '187258416102768640',
    }, {
      waitUntil (promise) {
        backgroundTask = promise
      },
    })

    assert.deepEqual(await response.json(), { type: 5, data: { flags: 64 } })
    await backgroundTask
    assert.match(followUpBody.content, /^Master, I couldn't finish removing game \(42\) because of a snag with the live site\./)
    assert.deepEqual(followUpBody.allowed_mentions, { parse: [] })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('records a user rating and reports the new average', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({
    type: 2,
    channel_id: 'allowed-channel',
    application_id: 'application-id',
    token: 'interaction-token',
    member: {
      user: { id: '187258416102768640', username: 'master-user', avatar: null },
    },
    data: {
      name: 'rate',
      options: [{ name: 'game', value: '42' }, { name: 'rating', value: 4.5 }],
    },
  })
  const request = new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signatureFor(body, privateKey, timestamp),
      'x-signature-timestamp': timestamp,
    },
    body,
  })
  const originalFetch = globalThis.fetch
  const requests = []
  let backgroundTask
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options })
    if (options.method === 'PUT') {
      return Response.json({ commit: { sha: 'new-sha' } })
    }
    if (String(url).startsWith('https://api.github.com/')) {
      return Response.json({
        encoding: 'base64',
        content: Buffer.from(JSON.stringify([{
          id: '42',
          info: { name: 'Test Game' },
          userRatings: { 'another-user': 3 },
          rating: 3,
        }])).toString('base64'),
        sha: 'old-sha',
      })
    }
    return Response.json({})
  }

  try {
    const response = await handleRequest(request, {
      DISCORD_PUBLIC_KEY: publicKeyHex,
      ALLOWED_CHANNEL_ID: 'allowed-channel',
      GITHUB_TOKEN: 'test-token',
      GITHUB_REPOSITORY_OWNER: 'owner',
      GITHUB_REPOSITORY_NAME: 'repo',
      GITHUB_BRANCH: 'main',
      MASTER_USER_ID: '187258416102768640',
    }, {
      waitUntil (promise) {
        backgroundTask = promise
      },
    })

    assert.deepEqual(await response.json(), { type: 5, data: { flags: 64 } })
    await backgroundTask
    const writeRequest = requests.find(({ options }) => options.method === 'PUT')
    const updatedGames = JSON.parse(Buffer.from(JSON.parse(writeRequest.options.body).content, 'base64').toString())
    assert.deepEqual(updatedGames[0].userRatings, {
      'another-user': 3,
      '187258416102768640': 4.5,
    })
    assert.equal(updatedGames[0].rating, 3.75)
    const followUp = requests.find(({ url }) => url.startsWith('https://discord.com/api/v10/webhooks/'))
    assert.match(followUp.options.body, /recorded your 4\.5-star rating.*average is now 3\.75 stars/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('sets an image override and clears only the requesting user rating', async () => {
  const image = await runGameCommand('set-hero', [
    { name: 'game', value: '42' },
    { name: 'image_url', value: 'https://example.com/custom-hero.jpg' },
  ], [{ id: '42', info: { name: 'Test Game' } }])

  assert.deepEqual(image.writtenGames[0].heroOverride, { url: 'https://example.com/custom-hero.jpg' })
  assert.deepEqual(image.writtenGames[0].hero, { url: 'https://example.com/custom-hero.jpg' })
  assert.match(image.followUp.options.body, /overriding the hero image/)
  assert.equal(image.requests[0].options.cf, undefined)

  const cleared = await runGameCommand('clear-rating', [
    { name: 'game', value: '42' },
  ], [{
    id: '42',
    info: { name: 'Test Game' },
    userRatings: { '187258416102768640': 4, 'another-user': 3 },
    rating: 3.5,
  }])

  assert.deepEqual(cleared.writtenGames[0].userRatings, { 'another-user': 3 })
  assert.equal(cleared.writtenGames[0].rating, 3)
  assert.match(cleared.followUp.options.body, /cleared your rating.*average is now 3\.00 stars/)
})

test('changes the credited adder using a selected Discord user', async () => {
  const result = await runGameCommand('set-adder', [
    { name: 'game', value: '42' },
    { name: 'user', value: '987654321098765432' },
  ], [{
    id: '42',
    info: { name: 'Test Game' },
    addedBy: {
      id: '123456789012345678',
      name: 'Old Adder',
      avatarUrl: 'https://example.com/old-avatar.png',
    },
  }], {
    users: {
      '987654321098765432': {
        id: '987654321098765432',
        username: 'new-adder',
        global_name: 'New Adder',
        avatar: 'new-avatar-hash',
      },
    },
    members: {
      '987654321098765432': { nick: 'New Adder Nickname' },
    },
  })

  assert.deepEqual(result.writtenGames[0].addedBy, {
    id: '987654321098765432',
    name: 'New Adder Nickname',
    avatarUrl: 'https://cdn.discordapp.com/avatars/987654321098765432/new-avatar-hash.png?size=64',
  })
  assert.match(result.followUp.options.body, /updated the added-by credit.*to New Adder Nickname/)
})

test('uses the Ghost profile for the configured Master without a Discord username or avatar', async () => {
  const masterId = '187258416102768640'
  const result = await runGameCommand('set-adder', [
    { name: 'game', value: '42' },
    { name: 'user', value: masterId },
  ], [{ id: '42', info: { name: 'Test Game' } }], {
    users: {
      [masterId]: { id: masterId, username: '', avatar: null },
    },
    members: {
      [masterId]: {},
    },
  })

  assert.deepEqual(result.writtenGames[0].addedBy, {
    id: masterId,
    name: 'Ghost',
    avatarUrl: 'https://sage-afk.github.io/spooky-season/ghost-avatar.png',
  })
})

test('rejects a rating that is not in half-star increments without committing', async () => {
  const result = await runGameCommand('rate', [
    { name: 'game', value: '42' },
    { name: 'rating', value: 4.25 },
  ], [{ id: '42', info: { name: 'Test Game' } }])

  assert.match((await result.response.json()).data.content, /half-star increments/)
  assert.equal(result.writtenGames, undefined)
})

test('rejects a non-HTTPS image override without scheduling GitHub work', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({
    type: 2,
    channel_id: 'allowed-channel',
    data: {
      name: 'set-hero',
      options: [
        { name: 'game', value: '42' },
        { name: 'image_url', value: 'javascript:alert(1)' },
      ],
    },
  })
  const request = new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signatureFor(body, privateKey, timestamp),
      'x-signature-timestamp': timestamp,
    },
    body,
  })
  const response = await handleRequest(request, {
    DISCORD_PUBLIC_KEY: publicKeyHex,
    ALLOWED_CHANNEL_ID: 'allowed-channel',
  }, { waitUntil () {
    assert.fail('Invalid image URL must not schedule work.')
  } })

  assert.match((await response.json()).data.content, /valid HTTPS image URL/)
})

test('defers an allowed /add and commits the updated JSON to GitHub', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyHex = publicDer.subarray(-32).toString('hex')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const body = JSON.stringify({
    type: 2,
    channel_id: 'allowed-channel',
    application_id: 'application-id',
    token: 'interaction-token',
    member: {
      nick: 'Test Adder',
      user: {
        id: '123456789012345678',
        username: 'test-adder',
        global_name: 'Test Adder Global',
        avatar: 'test-avatar-hash',
      },
    },
    data: { name: 'add', options: [{ name: 'game_id', value: '42' }] },
  })
  const request = new Request('https://worker.example/', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': signatureFor(body, privateKey, timestamp),
      'x-signature-timestamp': timestamp,
    },
    body,
  })
  const originalFetch = globalThis.fetch
  const requests = []
  let backgroundTask
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options })
    if (String(url).startsWith('https://www.steamgriddb.com/')) {
      const data = String(url).includes('/games/')
        ? { id: 420, name: 'Test Game', release_date: 42, types: ['steam'], verified: true }
        : (String(url).includes('/logos/')
            ? [{ url: 'https://example.com/logo.png' }]
            : [{ url: 'https://example.com/hero.png' }])
      return Response.json({ success: true, data })
    }
    if (String(url).startsWith('https://store.steampowered.com/')) {
      return Response.json({
        42: { success: true, data: { name: 'Test Game', release_date: { date: 'Jan 1, 2020' } } },
      })
    }
    if (options.method === 'PUT') {
      return Response.json({ commit: { sha: 'new-sha' } })
    }
    if (String(url).startsWith('https://api.github.com/')) {
      return Response.json({
        encoding: 'base64',
        content: Buffer.from(JSON.stringify([{ id: '1', completed: true }])).toString('base64'),
        sha: 'old-sha',
      })
    }
    return Response.json({})
  }

  try {
    const response = await handleRequest(request, {
      DISCORD_PUBLIC_KEY: publicKeyHex,
      ALLOWED_CHANNEL_ID: 'allowed-channel',
      GITHUB_TOKEN: 'test-token',
      STEAMGRIDDB_API_KEY: 'test-sgdb-key',
      GITHUB_REPOSITORY_OWNER: 'owner',
      GITHUB_REPOSITORY_NAME: 'repo',
      GITHUB_BRANCH: 'main',
      MASTER_USER_ID: '187258416102768640',
    }, {
      waitUntil (promise) {
        backgroundTask = promise
      },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { type: 5, data: { flags: 64 } })
    await backgroundTask

    const writeRequest = requests.find(({ options }) => options.method === 'PUT')
    assert.ok(writeRequest)
    assert.equal(writeRequest.options.headers['user-agent'], 'spooky-season-discord-worker')
    assert.equal(JSON.parse(writeRequest.options.body).message, 'Add/update Test Game (42) in 2026 list')
    const writtenFile = JSON.parse(Buffer.from(JSON.parse(writeRequest.options.body).content, 'base64').toString())
    assert.deepEqual(writtenFile[0], { id: '1', completed: true })
    assert.equal(writtenFile[1].id, '42')
    assert.equal(writtenFile[1].info.name, 'Test Game')
    assert.equal(writtenFile[1].info.verified, true)
    assert.deepEqual(writtenFile[1].addedBy, {
      id: '123456789012345678',
      name: 'Test Adder',
      avatarUrl: 'https://cdn.discordapp.com/avatars/123456789012345678/test-avatar-hash.png?size=64',
    })
    assert.deepEqual(writtenFile[1].logo, { url: 'https://example.com/logo.png' })
    assert.deepEqual(writtenFile[1].hero, { url: 'https://example.com/hero.png' })
    assert.equal(writtenFile[1].completed, false)
    const followUp = requests.find(({ url }) => url.startsWith('https://discord.com/api/v10/webhooks/'))
    assert.ok(followUp)
    assert.match(JSON.parse(followUp.options.body).content, /^Mr\. Test Adder, I've handled adding Test Game \(42\) to the live site without issue\.$/)
    const announcements = requests.filter(({ url, options }) => (
      url.startsWith('https://discord.com/api/v10/webhooks/')
      && !JSON.parse(options.body).flags
    ))
    assert.equal(announcements.length, 1)
    const announcement = JSON.parse(announcements[0].options.body)
    assert.match(announcement.content, /^At Mr\. Test Adder's behest, I've added Test Game \(42\) to the \[Spooky Season game list\]\(https:\/\/sage-afk\.github\.io\/spooky-season\/\)\./)
    assert.match(announcement.content, /https:\/\/store\.steampowered\.com\/app\/42\//)
    assert.deepEqual(announcement.allowed_mentions, { parse: [] })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('does not announce an /add refresh of an existing game', async () => {
  const result = await runGameCommand('add', [
    { name: 'game_id', value: '42' },
  ], [{
    id: '42',
    info: { name: 'Existing Test Game' },
    addedBy: { id: 'another-user', name: 'Original Adder', avatarUrl: 'https://example.com/avatar.png' },
  }])

  const webhookRequests = result.requests.filter(({ url }) => (
    url.startsWith('https://discord.com/api/v10/webhooks/')
  ))
  assert.equal(webhookRequests.length, 1)
  assert.equal(JSON.parse(webhookRequests[0].options.body).flags, 64)
})
