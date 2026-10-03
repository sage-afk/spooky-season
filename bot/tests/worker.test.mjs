import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearUserRating,
  getGameMetadata,
  repositionGameByRating,
  removeGame,
  setUserRating,
  upsertGame,
} from '../functions/worker.mjs'

const metadata = {
  info: {
    id: 42,
    name: 'Test Game',
    release_date: 0,
    types: ['steam'],
    verified: false,
  },
  logo: { url: 'https://example.com/logo.png' },
  hero: { url: 'https://example.com/hero.jpg' },
}
const addedBy = {
  id: '123456789012345678',
  name: 'Test User',
  avatarUrl: 'https://cdn.discordapp.com/avatars/123456789012345678/avatar.png?size=64',
}

test('appends a new game ID without modifying existing games', () => {
  const games = [{ id: '1', completed: false, info: { name: 'Existing' } }]
  const result = upsertGame(games, '42', metadata, addedBy)

  assert.equal(result.changed, true)
  assert.deepEqual(result.games[0], games[0])
  assert.equal(result.games[1].id, '42')
  assert.equal(result.games[1].completed, false)
  assert.deepEqual(result.games[1].addedBy, addedBy)
})

test('updates only the matching ID and preserves completion and rating', () => {
  const games = [
    { id: '1', completed: false, info: { name: 'Untouched' } },
    {
      id: '42',
      completed: true,
      rating: 4.5,
      info: { name: 'Old name' },
      logo: { url: 'logo.png' },
      hero: { url: 'existing-hero.png' },
    },
  ]
  const originalAdder = { id: 'old-user', name: 'Original Adder', avatarUrl: 'old-avatar.png' }
  games[1].addedBy = originalAdder
  const result = upsertGame(games, '42', metadata, addedBy)

  assert.equal(result.changed, true)
  assert.deepEqual(result.games[0], games[0])
  assert.equal(result.games[1].completed, true)
  assert.equal(result.games[1].rating, 4.5)
  assert.deepEqual(result.games[1].addedBy, originalAdder)
  assert.deepEqual(result.games[1].logo, metadata.logo)
  assert.deepEqual(result.games[1].hero, metadata.hero)
  assert.deepEqual(result.games[1].info, metadata.info)
})

test('preserves existing logo when SteamGridDB has none', () => {
  const currentLogo = { url: 'existing-logo.png' }
  const games = [{
    id: '42',
    completed: true,
    logo: currentLogo,
    info: { name: 'Old name' },
  }]
  const result = upsertGame(games, '42', { ...metadata, logo: undefined })

  assert.deepEqual(result.games[0].logo, currentLogo)
})

test('adds attribution to an existing game with no prior attribution', () => {
  const games = [{ id: '42', completed: true, info: { name: 'Existing game' } }]
  const result = upsertGame(games, '42', metadata, addedBy)

  assert.deepEqual(result.games[0].addedBy, addedBy)
})

test('stores one rating per user and updates the average on repeat rating', () => {
  const game = { userRatings: { first: 4, second: 3 }, rating: 3.5 }

  assert.equal(setUserRating(game, 'first', 5), true)
  assert.deepEqual(game.userRatings, { first: 5, second: 3 })
  assert.equal(game.rating, 4)
  assert.equal(setUserRating(game, 'first', 5), false)
  assert.equal(game.rating, 4)
})

test('clears only the requesting user rating and recalculates the average', () => {
  const game = { userRatings: { first: 5, second: 3 }, rating: 4 }

  assert.equal(clearUserRating(game, 'first'), true)
  assert.deepEqual(game.userRatings, { second: 3 })
  assert.equal(game.rating, 3)
  assert.equal(clearUserRating(game, 'first'), false)
})

test('removes average when the last user rating is cleared', () => {
  const game = { userRatings: { first: 4.5 }, rating: 4.5 }

  assert.equal(clearUserRating(game, 'first'), true)
  assert.equal('userRatings' in game, false)
  assert.equal('rating' in game, false)
})

test('repositions only the updated game in descending average-rating order', () => {
  const games = [
    { id: '1', rating: 5 },
    { id: '2', rating: 4 },
    { id: '3', rating: 3 },
    { id: '4' },
  ]

  games[2].rating = 4.5
  assert.equal(repositionGameByRating(games, '3'), true)
  assert.deepEqual(games.map(game => game.id), ['1', '3', '2', '4'])

  delete games[0].rating
  assert.equal(repositionGameByRating(games, '1'), true)
  assert.deepEqual(games.map(game => game.id), ['3', '2', '4', '1'])
})

test('preserves manual image overrides when refreshing metadata', () => {
  const games = [{
    id: '42',
    completed: false,
    info: metadata.info,
    logoOverride: { url: 'https://example.com/manual-logo.png' },
    logo: { url: 'https://example.com/manual-logo.png' },
    heroOverride: { url: 'https://example.com/manual-hero.png' },
    hero: { url: 'https://example.com/manual-hero.png' },
  }]

  const result = upsertGame(games, '42', {
    ...metadata,
    logo: { url: 'https://example.com/sgdb-logo.png' },
    hero: { url: 'https://example.com/sgdb-hero.png' },
  })

  assert.deepEqual(result.games[0].logo, { url: 'https://example.com/manual-logo.png' })
  assert.deepEqual(result.games[0].hero, { url: 'https://example.com/manual-hero.png' })
})

test('removes only the requested game ID', () => {
  const untouched = { id: '1', completed: true }
  const gameToRemove = { id: '42', completed: false }
  const games = [untouched, gameToRemove, { id: '43', completed: true }]
  const result = removeGame(games, '42')

  assert.equal(result.changed, true)
  assert.equal(result.removed, gameToRemove)
  assert.deepEqual(result.games, [untouched, { id: '43', completed: true }])
})

test('does not change the list when the requested game ID is missing', () => {
  const games = [{ id: '1', completed: true }]
  const result = removeGame(games, '42')

  assert.equal(result.changed, false)
  assert.equal(result.games, games)
})

test('does not rewrite an entry when its fetched data is already current', () => {
  const games = [{
    id: '42',
    completed: false,
    info: metadata.info,
    logo: metadata.logo,
    hero: metadata.hero,
  }]
  const result = upsertGame(games, '42', metadata)

  assert.equal(result.changed, false)
  assert.equal(result.games, games)
})

test('uses SteamGridDB game info, logo, and hero when available', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  const gridGame = {
    id: 420,
    name: 'Test Game from SGDB',
    release_date: 42,
    types: ['steam'],
    verified: true,
  }
  const logo = { url: 'https://example.com/sgdb-logo.png' }
  const hero = { url: 'https://example.com/sgdb-hero.png' }
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options })
    const data = String(url).includes('/games/')
      ? gridGame
      : (String(url).includes('/logos/')
          ? [logo]
          : [hero])
    return Response.json({ success: true, data })
  }

  try {
    const result = await getGameMetadata('42', { STEAMGRIDDB_API_KEY: 'test-key' })

    assert.deepEqual(result, { info: gridGame, logo, hero })
    assert.equal(requests.length, 3)
    assert.ok(requests.every(({ options }) => options.headers.authorization === 'Bearer test-key'))
    assert.ok(requests.some(({ url }) => url.endsWith('/games/steam/42')))
    assert.ok(requests.some(({ url }) => url.endsWith('/logos/steam/42')))
    assert.ok(requests.some(({ url }) => url.endsWith('/heroes/steam/42')))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('falls back to Steam name and screenshot when SteamGridDB has no game or hero', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async url => {
    if (String(url).startsWith('https://www.steamgriddb.com/')) {
      return Response.json({ success: true, data: String(url).includes('/logos/') ? [] : null })
    }
    return Response.json({
      42: {
        success: true,
        data: {
          name: 'Steam Fallback',
          release_date: { date: 'Jan 1, 2020' },
          screenshots: [{ path_full: 'https://example.com/steam-shot.jpg' }],
        },
      },
    })
  }

  try {
    const result = await getGameMetadata('42', { STEAMGRIDDB_API_KEY: 'test-key' })

    assert.equal(result.info.name, 'Steam Fallback')
    assert.equal(result.info.release_date, 1_577_836_800)
    assert.deepEqual(result.logo, undefined)
    assert.deepEqual(result.hero, { url: 'https://example.com/steam-shot.jpg' })
  } finally {
    globalThis.fetch = originalFetch
  }
})
