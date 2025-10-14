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
                  v-model="element.rating"
                  class="filter position-absolute px-3 py-1 z-1 top-0 left-0"
                  :class="element.rating || isHovering ? 'opacity-100' : 'opacity-20'"
                  density="compact"
                  half-increments
                  hover
                  size="x-small"
                />
              </v-hover>
              <v-hover v-slot="{ isHovering, props }">
                <v-icon
                  v-bind="props"
                  class="ma-2 rounded-circle bg-black position-absolute z-1 top-0 right-0"
                  :class="element.completed || isHovering ? 'opacity-100' : 'opacity-20'"
                  color="green"
                  icon="mdi-check-circle-outline"
                  @click="element.completed = !element.completed"
                />
              </v-hover>
              <v-card
                v-if="!tall"
                class="darken d-flex justify-center align-center text-center"
                height="100"
                :href="steam_url + element?.id"
                :image="element?.hero?.url || `https://shared.steamstatic.com/store_item_assets/steam/apps/${element?.id}/library_hero.jpg`"
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
                :href="steam_url + element?.id"
                :image="`https://steamcdn-a.akamaihd.net/steam/apps/${element?.id}/library_600x900_2x.jpg`"
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
        <v-btn v-if="isDevMode" text="Get Data" @click="getData" />
        <v-btn v-if="isDevMode" text="Get Ratings" @click="getRatings" />
        <v-btn v-if="isDevMode" text="Get Completed" @click="getCompletedGames" />
        <v-btn v-if="isDevMode" text="Get Order" @click="getGamesOrder" />
      </v-row>
    </v-container>
  </v-sheet>
</template>

<script lang="ts" setup>
  import SGDB, { type SGDBGame, type SGDBImage } from 'steamgriddb'
  import { ref } from 'vue'
  import savedData from '@/assets/games.json'

  const isDevMode = process.env.NODE_ENV === 'development'
  const tall = ref(false)
  const threedee = ref(false)
  const drag = ref(false)

  const steam_url = 'https://store.steampowered.com/app/'

  const client = new SGDB({
    key: 'a3bcf1c34029d5477bbfafd523131997',
    baseURL: '/steamgriddb',
  })

  const completed_games: { [key: number]: number } = {
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
      if (game.rating) results[Number(game.id)] = game.rating
    }
    console.log(results)
  }

  const overrides: {
    [key: string]: {
      [logo: string]: string
    }
  } = {
    371_970: {
      url: 'https://cdn2.steamgriddb.com/logo_thumb/8b9845fa0b5ce34fb2de2050a0bb1353.png',
    },
    108_600: {
      url: 'https://cdn2.steamgriddb.com/logo_thumb/074ab924540667aad42a8ea3beccd19b.png',
    },
  }

  const ids: Array<string> = [
    '3228590',
    '2835570',
    '2444750',
    '1962663',
    '381210',
    '1392860',
    '1577120',
    '3241660',
    '1304930',
    '594650',
    '2208570',
    '2881650',
    '1929610',
    '1361000',
    '1274570',
    '2947440',
    '1966720',
    '594330',
    '3008130',
    '493520',
    '872670',
    '214490',
    '1179080',
    '1943950',
    '2475490',
    '1904480',
    '1096570',
    '2016590',
    '371970',
    '108600',
    '221100',
    '945360',
    '774861',
    '1002300',
    '408900',
  ]

  const games = ref(savedData)

  async function getData () {
    const items = []
    for (const id of ids) {
      const game = await client.getGameBySteamAppId(Number(id))
      const heros = await client.getHeroesBySteamAppId(Number(id))
      const logos = await client.getLogosBySteamAppId(Number(id))
      const completed = Object.keys(completed_games).includes(id)

      completed
        ? items.unshift({
          id: id,
          completed: completed,
          rating: completed_games[Number(id)],
          info: game,
          logo: overrides[id] ?? logos[0]! ?? { url: `https://shared.steamstatic.com/store_item_assets/steam/apps/${id}/logo_2x.png` },
          hero: heros[0]!,
        })
        : items.push ({
          id: id,
          completed: completed,
          info: game,
          logo: overrides[id] ?? logos[0]!,
          hero: heros[0]!,
        })
    }

    items.sort((a, b) => {
      return (b.rating || 0) - (a.rating || 0)
    })

    console.log(items)

    // @ts-ignore
    games.value = items
    // return items
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

</style>
