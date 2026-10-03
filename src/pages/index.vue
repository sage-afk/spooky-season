<template>
  <v-sheet class="h-100 align-center">
    <v-container fluid>
      <v-row class="justify-center" dense>
        <draggable
          v-model="games"
          class="d-flex flex-wrap w-100 mt-5 dragArea list-group"
          :disabled="!isDevMode"
          group="people"
          item-key="id"
          @change="console.log(JSON.parse(JSON.stringify(games)))"
          @end="drag=false"
          @start="drag=true"
        >
          <template #item="{element}">
            <v-col
              class="pa-1 position-relative"
              cols="12"
              :lg="3"
              :md="4"
              :sm="6"
              :xs="12"
            >
              <v-hover v-slot="{ isHovering, props }">
                <v-rating
                  v-bind="props"
                  active-color="orange-lighten-1"
                  class="filter position-absolute px-3 py-2 z-1 top-0 left-0"
                  :class="element.rating || isHovering ? 'opacity-100' : 'opacity-20'"
                  color="brown"
                  density="compact"
                  empty-icon="mdi-skull"
                  full-icon="mdi-skull"
                  half-increments
                  readonly
                  size="x-small"
                  :model-value="element.rating"
                />
              </v-hover>
              <v-tooltip v-if="element.addedBy" :text="`Added by ${element.addedBy.name}`">
                <template #activator="{ props }">
                  <v-avatar
                    v-bind="props"
                    :aria-label="`Added by ${element.addedBy.name}`"
                    class="ma-2 position-absolute z-1 top-0 right-0"
                    size="28"
                  >
                    <v-img :src="element.addedBy.avatarUrl" />
                  </v-avatar>
                </template>
              </v-tooltip>
              <v-card
                v-if="!tall"
                class="darken d-flex justify-center align-center text-center"
                height="100"
                :href="!toggle ? steam_url + element?.id : undefined"
                :image="element?.hero?.url || `https://store.akamai.steamstatic.com/images/storepagebackground/app/${element?.id}`"
                target="_blank"
                :title="element?.logo ? undefined : element?.info?.name"
              >
                <v-img
                  v-if="element?.logo"
                  class="justify-center filter-class"
                  :class="threedee ? 'filter3d' : ''"
                  :max-height="75"
                  :max-width="256"
                  :src="element?.logo?.url"
                />
              </v-card>
              <v-card
                v-else
                class="d-flex justify-center align-center text-center"
                height="600"
                :href="!toggle ? steam_url + element?.id : undefined"
                :style="{
                  backgroundImage: `url(https://steamcdn-a.akamaihd.net/steam/apps/${element?.id}/library_600x900_2x.jpg), url(https://store.akamai.steamstatic.com/images/storepagebackground/app/${element?.id})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                }"
                target="_blank"
                :title="element?.logo ? undefined : element?.info?.name"
              />
            </v-col>
          </template>
        </draggable>
      </v-row>
      <v-row class="justify-center ga-4">
        <v-switch v-model="tall" label="tall?" />
        <v-switch v-model="threedee" label="3D?" />
        <v-switch v-if="isDevMode" v-model="toggle" label="toggle?" />
        <v-text-field
          v-if="isDevMode"
          v-model="gameId"
          density="compact"
          hide-details
          label="Steam app ID"
        />
        <v-btn v-if="isDevMode" :disabled="!gameId.trim()" text="Get Game Data" @click="getData(gameId.trim())" />
        <v-btn v-if="isDevMode" text="Get Ratings" @click="getRatings" />
        <v-btn v-if="isDevMode" text="Get Completed" @click="getCompletedGames" />
        <v-btn v-if="isDevMode" text="Get Order" @click="getGamesOrder" />
      </v-row>
      <v-row v-if="isDevMode && getDataError" class="justify-center">
        <v-alert type="error">{{ getDataError }}</v-alert>
      </v-row>
    </v-container>
  </v-sheet>
</template>

<script lang="ts" setup>
  import SGDB, { type SGDBGame, type SGDBImage } from 'steamgriddb'
  import { computed, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import savedData2025 from '@/assets/games.json'
  import savedData2026 from '@/assets/games-2026.json'

  type Year = 2025 | 2026
  type GameEntry = {
    id: string
    completed: boolean
    rating?: number
    userRatings?: Record<string, number>
    addedBy?: {
      id: string
      name: string
      avatarUrl: string
    }
    info: SGDBGame
    logo?: SGDBImage | { url: string }
    hero?: SGDBImage | { url: string }
  }

  const route = useRoute()
  const year = computed<Year>(() => route.query.year === '2025' ? 2025 : 2026)

  const isDevMode = process.env.NODE_ENV === 'development'
  const tall = ref(false)
  const threedee = ref(false)
  const drag = ref(false)
  const toggle = ref(false)
  const gameId = ref('')
  const getDataError = ref('')

  const steam_url = 'https://store.steampowered.com/app/'

  const client = new SGDB({
    key: 'a3bcf1c34029d5477bbfafd523131997',
    baseURL: '/steamgriddb',
  })

  const completedGamesByYear: Record<Year, Record<number, number>> = {
    2025: {
    381_210: 5,
    594_650: 3,
    1_304_930: 2,
    1_392_860: 0.5,
    1_577_120: 4.5,
    1_962_663: 4,
    2_444_750: 5,
    2_835_570: 4.5,
    3_228_590: 4.5,
    3_241_660: 4,
    },
    2026: {},
  }

  function getGamesOrder () {
    const results = []
    for (const game of games.value) {
      results.push(game.id)
    }
    console.log(results)
  }

  function getCompletedGames () {
    const results = []
    for (const game of games.value) {
      if (game.completed) results.push(game.id)
    }
    console.log(results)
  }

  function getRatings () {
    const results: { [key: number]: number } = {}
    for (const game of games.value) {
      if ('rating' in game && game.rating) results[Number(game.id)] = game.rating
    }
    console.log(results)
  }

  const overrides: Record<string, { name?: string; logo?: { url: string }; hero?: { url: string }; hideLogo?: boolean }> = {
    371_970: {
      logo: { url: 'https://cdn2.steamgriddb.com/logo_thumb/8b9845fa0b5ce34fb2de2050a0bb1353.png' },
    },
    108_600: {
      logo: { url: 'https://cdn2.steamgriddb.com/logo_thumb/074ab924540667aad42a8ea3beccd19b.png' },
    },
    4_450_620: {
      hero: { url: 'https://shared.steamstatic.com/store_item_assets/steam/apps/4450620/6655fbc076713998995bc53007de40c0f02aa224/library_hero_2x.jpg?t=1786114486' },
    },
    3314580: {
      name: 'Trash Day',
    },
    3948160: {
      name: 'Waste The Fallen',
    },
    2121510: {
      name: 'Tenebris Somnia',
    },
    3892270: {
      logo: { url: 'https://cdn2.steamgriddb.com/logo/e6c07d1b091b2f6cb26b9967ce733690.png' },
    },
    1144200: {
      logo: { url: 'https://cdn2.steamgriddb.com/logo/b4ac75fb0770998bda4910782f116fc5-fakepng.png' },
    },
    550: {
      logo: { url: 'https://cdn2.steamgriddb.com/logo/99b3613c6a997dc4195f957f89282e0c.png' },
    },
    408900: {
      hideLogo: true,
    },
  }

  const savedDataByYear = {
    2025: savedData2025,
    2026: savedData2026,
  }
  const games = ref<GameEntry[]>(structuredClone(savedDataByYear[year.value]) as GameEntry[])

  watch(year, (selectedYear) => {
    games.value = structuredClone(savedDataByYear[selectedYear]) as GameEntry[]
  })

  async function getData (id: string) {
    getDataError.value = ''
    if (!/^\d+$/.test(id)) {
      getDataError.value = 'Enter a numeric Steam app ID.'
      return
    }

    const existingIndex = games.value.findIndex(game => game.id === id)
    const existing = existingIndex === -1 ? undefined : games.value[existingIndex]
    const gameRequest = overrides[id]?.name
      ? Promise.resolve(undefined)
      : client.getGameBySteamAppId(Number(id)).catch(() => undefined)
    const [gameResult, heroes, logos] = await Promise.all([
      gameRequest,
      client.getHeroesBySteamAppId(Number(id)).catch(() => []),
      client.getLogosBySteamAppId(Number(id)).catch(() => []),
    ])
    const steamApp = !gameResult || (!overrides[id]?.hero && !heroes[0])
      ? await getSteamStoreApp(id)
      : undefined
    const game: SGDBGame = gameResult ?? {
      id: Number(id),
      name: overrides[id]?.name ?? steamApp?.name ?? `Steam App ${id}`,
      types: ['steam'],
      verified: false,
      release_date: 0,
    }
    const completed = existing?.completed ?? Object.keys(completedGamesByYear[year.value]).includes(id)
    const item: GameEntry = {
      id,
      completed,
      rating: existing?.rating ?? (completed ? completedGamesByYear[year.value][Number(id)] : undefined),
      info: game,
      logo: overrides[id]?.hideLogo ? undefined : overrides[id]?.logo ?? logos[0],
      hero: overrides[id]?.hero ?? heroes[0] ?? {
        url: steamApp?.screenshots?.[0]?.path_full
          ?? `https://store.akamai.steamstatic.com/images/storepagebackground/app/${id}`,
      },
    }

    if (existingIndex === -1) {
      games.value.push(item)
    } else {
      games.value.splice(existingIndex, 1, item)
    }
  }

  async function getSteamStoreApp (id: string) {
    try {
      const response = await fetch(`/steamstore/appdetails?appids=${id}`)
      if (!response.ok) return undefined

      const result = await response.json()
      const app = result[id]
      if (!app?.success) return undefined

      return app.data as {
        name?: string
        screenshots?: Array<{ path_full: string }>
      }
    } catch {
      return undefined
    }
  }

</script>

<style scoped>

  * {
    font-family: 'Courier New', Courier, monospace;
  }
  :deep(.v-card-item){
    width:100%
  }
  :deep(.v-card-item .v-card-title){
    font-size: 2rem;
    filter: drop-shadow(0px 0px 6px black) drop-shadow(0px 0px 4px black);
    text-wrap-mode: wrap;
    line-height: normal;
  }
  :deep(.darken .v-img img) {
    filter: brightness(50%);
  }
  .filter-class {
    filter:brightness(0) invert(1)
  }

  .filter3d {
    filter:brightness(0) invert(1) drop-shadow(4px 4px 0 red) drop-shadow(-4px -4px 0 blue)
  }

  .filter {
    filter: drop-shadow(0px 0px 10px black) drop-shadow(0px 0px 10px black) drop-shadow(0px 0px 10px black)
  }

  .z-1{
    z-index: 1
  }

  :deep(.v-rating button){
    margin-right: 2px;
  }
</style>
