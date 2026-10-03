import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import test from 'node:test'
import { handleRequest, verifyDiscordRequest } from '../functions/worker.mjs'

function signatureFor (body, privateKey, timestamp) {
  return sign(null, Buffer.from(`${timestamp}${body}`), privateKey).toString('hex')
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
    data: { name: 'remove', options: [{ name: 'game_id', value: '42' }] },
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
    data: { name: 'remove', options: [{ name: 'game_id', value: '42' }] },
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
  } finally {
    globalThis.fetch = originalFetch
  }
})
