const applicationId = process.env.DISCORD_APPLICATION_ID
const botToken = process.env.DISCORD_BOT_TOKEN
const guildId = process.env.DISCORD_TEST_GUILD_ID

function gameOption () {
  return {
    name: 'game',
    description: 'Search for a game in the 2026 list.',
    type: 3,
    required: true,
    autocomplete: true,
  }
}

if (!applicationId || !botToken || !guildId) {
  throw new Error('Set DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, and DISCORD_TEST_GUILD_ID.')
}

const response = await fetch(
  `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
  {
    method: 'PUT',
    headers: {
      'authorization': `Bot ${botToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify([
      {
        name: 'help',
        description: 'Show what I can do.',
      },
      {
        name: 'add',
        description: 'Add or refresh a game in the 2026 list.',
        options: [{
          name: 'game_id',
          description: 'Steam game ID',
          type: 3,
          required: true,
        }],
      },
      {
        name: 'remove',
        description: 'Remove a game from the 2026 list.',
        options: [gameOption()],
      },
      {
        name: 'set-hero',
        description: 'Set a custom hero image for a game.',
        options: [
          gameOption(),
          {
            name: 'image_url',
            description: 'HTTPS URL of the hero image',
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: 'set-logo',
        description: 'Set a custom logo for a game.',
        options: [
          gameOption(),
          {
            name: 'image_url',
            description: 'HTTPS URL of the logo image',
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: 'set-adder',
        description: 'Change who is credited with adding a game.',
        options: [
          gameOption(),
          {
            name: 'user',
            description: 'Discord user to credit as the adder',
            type: 6,
            required: true,
          },
        ],
      },
      {
        name: 'clear-hero',
        description: 'Clear the custom hero image for a game.',
        options: [gameOption()],
      },
      {
        name: 'clear-logo',
        description: 'Clear the custom logo for a game.',
        options: [gameOption()],
      },
      {
        name: 'rate',
        description: 'Rate a game from 0.5 to 5 stars.',
        options: [
          gameOption(),
          {
            name: 'rating',
            description: 'Your rating in half-star increments',
            type: 10,
            required: true,
            min_value: 0.5,
            max_value: 5,
          },
        ],
      },
      {
        name: 'clear-rating',
        description: 'Clear your rating for a game.',
        options: [gameOption()],
      },
    ]),
  },
)

if (!response.ok) {
  throw new Error(`Discord command registration failed with HTTP ${response.status}: ${await response.text()}`)
}

console.log('Registered the Discord game management commands in the test server.')
