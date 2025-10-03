<template>
  <v-sheet class="h-100 align-center">
    <v-container fluid>
      <v-row class="justify-center" dense>
        <v-col
          v-for="game in games"
          :key="game.info.id"
          :lg="3"
          :md="4"
          :sm="6"
          :xs="12"
        >
          <v-card
            class="align-content-end text-center"
            height="100"
            :href="steam_url + game.id"
            :image="game.hero?.url || 'https://i.pinimg.com/1200x/39/88/12/398812c0d73f2e5bebcf2007faad058b.jpg'"
            target="_blank"
            :title="game.info.name"
          />
        </v-col>
      </v-row>
      <v-row class="justify-center">
        <v-btn text="Get Data" @click="getData" />
      </v-row>
    </v-container>
  </v-sheet>
</template>

<script lang="ts" setup>
  import SGDB, { type SGDBGame, type SGDBImage } from 'steamgriddb'
  import { ref } from 'vue'

  const steam_url = 'https://store.steampowered.com/app/'

  const client = new SGDB({
    key: 'a3bcf1c34029d5477bbfafd523131997',
    baseURL: '/steamgriddb',
  })

  const ids: Array<string> = [
    '594650',
    '1929610',
    '2208570',
    '1274570',
    '2947440',
    '1304930',
    '3241660',
    '1966720',
    '2016590',
    '1577120',
    '108600',
    '214490',
    '3008130',
    '493520',
    '872670',
    '594330',
    '1002300',
    '1392860',
    '1179080',
    '1943950',
    '2475490',
    '381210',
  ]
  const games = ref([
    {
      id: '594650',
      info: {
        id: 16_833,
        name: 'Hunt: Showdown',
        release_date: 1_566_909_000,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 19_653,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/79643b609b5bd4b9bdaa3a527707ec39.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/79643b609b5bd4b9bdaa3a527707ec39.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'Skizzeh',
          steam64: '76561198177570226',
          avatar: 'https://avatars.steamstatic.com/daee305972779cc6bbd0530eb88993e5b2bccffd_medium.jpg',
        },
      },
    },
    {
      id: '1929610',
      info: {
        id: 5_363_656,
        name: 'Demonologist',
        release_date: 1_677_628_800,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 145_175,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/57a12017a3074fdfec8ec0e0428c7fc0.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/57a12017a3074fdfec8ec0e0428c7fc0.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: '✩ | Addams | ✩',
          steam64: '76561198369486824',
          avatar: 'https://avatars.steamstatic.com/367ee965129fd5d0f9339b142521c8af97a3e025_medium.jpg',
        },
      },
    },
    {
      id: '2208570',
      info: {
        id: 5_401_947,
        name: 'Dark Hours',
        release_date: 1_725_148_800,
        types: [
          'steam',
        ],
        verified: true,
      },
    },
    {
      id: '1274570',
      info: {
        id: 5_257_954,
        name: 'DEVOUR',
        release_date: 1_577_836_800,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 61_854,
        score: 0,
        style: 'alternate',
        width: 3840,
        height: 1240,
        nsfw: false,
        humor: false,
        notes: 'art from supporter edition',
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/de04b69dc1dd87f188c8f52b7a57a628.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/de04b69dc1dd87f188c8f52b7a57a628.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'jkcrmptn',
          steam64: '76561199035417743',
          avatar: 'https://avatars.steamstatic.com/0e331eaa738fc5422f7429c58beabf17e51817e1_medium.jpg',
        },
      },
    },
    {
      id: '2947440',
      info: {
        id: 5_436_386,
        name: 'Silent Hill f',
        release_date: 1_758_672_000,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 138_407,
        score: 0,
        style: 'alternate',
        width: 3840,
        height: 1240,
        nsfw: false,
        humor: false,
        notes: '**MS [hero](https://store-images.s-microsoft.com/image/apps.9825.14442789290930947.de2fee27-cdb8-46b7-ab7f-167185f990ef.46018927-542c-4d5d-bb84-ac336e0859c1)**',
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/9fa12826259e9181f9e4f023d7c20096.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/9fa12826259e9181f9e4f023d7c20096.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'nativecoruscant',
          steam64: '76561198317914084',
          avatar: 'https://avatars.steamstatic.com/f078e1f5133f97e44e67f56a779fe551166e4fc0_medium.jpg',
        },
      },
    },
    {
      id: '1304930',
      info: {
        id: 5_262_204,
        name: 'The Outlast Trials',
        release_date: 1_609_459_200,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 124_233,
        score: 0,
        style: 'alternate',
        width: 3840,
        height: 1240,
        nsfw: false,
        humor: false,
        notes: '[Image Source](https://i.imgur.com/uVnrD4z.jpeg)',
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/84274981a66afd92acb42e3e578d4030.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/84274981a66afd92acb42e3e578d4030.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'Akela',
          steam64: '76561197981066031',
          avatar: 'https://avatars.steamstatic.com/a519d3e56578de7455f2e52f4828c1e872804dbb_medium.jpg',
        },
      },
    },
    {
      id: '3241660',
      info: {
        id: 5_478_421,
        name: 'R.E.P.O.',
        release_date: 1_740_528_000,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 131_265,
        score: 0,
        style: 'alternate',
        width: 3840,
        height: 1240,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/3941127612b515ae4ce61cab30fc0dff.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/3941127612b515ae4ce61cab30fc0dff.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'FlamingDragon96',
          steam64: '76561198038653539',
          avatar: 'https://avatars.steamstatic.com/63f1401534600d2fb5db94b83d8b128887d23168_medium.jpg',
        },
      },
    },
    {
      id: '1966720',
      info: {
        id: 5_339_777,
        name: 'Lethal Company',
        release_date: 1_698_019_200,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 100_391,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: 'by Carlos Ruiz \n\nsource: https://twitter.com/Kairuiz_/status/1741917063176761347',
        mime: 'image/jpeg',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/82e3a96ae559ff4cfc27aaef54856319.jpg',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/82e3a96ae559ff4cfc27aaef54856319.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'The Demon Seated',
          steam64: '76561198096385391',
          avatar: 'https://avatars.steamstatic.com/f23a000a3cfbb207c70c60e16bea1d97239fdb64_medium.jpg',
        },
      },
    },
    {
      id: '2016590',
      info: {
        id: 5_335_281,
        name: 'Dark and Darker',
        release_date: 1_717_718_400,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 76_965,
        score: 0,
        style: 'alternate',
        width: 3840,
        height: 1240,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/a56ee11d03e067e9b5d626098bb82572.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/a56ee11d03e067e9b5d626098bb82572.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'Neochaotics',
          steam64: '76561198359405988',
          avatar: 'https://avatars.steamstatic.com/213f673473f6be7b8a44363a68afcaaf52748028_medium.jpg',
        },
      },
    },
    {
      id: '1577120',
      info: {
        id: 5_322_183,
        name: 'The Quarry',
        release_date: 1_654_819_200,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 65_042,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/4c3bbeac327140f9de54e86ad98e1af6.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/4c3bbeac327140f9de54e86ad98e1af6.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'ABH20',
          steam64: '76561198058544946',
          avatar: 'https://avatars.steamstatic.com/378a48fc2172839e4ca7589e1d6bb235691714fa_medium.jpg',
        },
      },
    },
    {
      id: '108600',
      info: {
        id: 1255,
        name: 'Project Zomboid',
        release_date: 1_383_897_600,
        types: [
          'steam',
          'gog',
        ],
        verified: true,
      },
      hero: {
        id: 118_976,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/c9afbbba3267b6ac7218283ecdda546c.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/c9afbbba3267b6ac7218283ecdda546c.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'ABH20',
          steam64: '76561198058544946',
          avatar: 'https://avatars.steamstatic.com/378a48fc2172839e4ca7589e1d6bb235691714fa_medium.jpg',
        },
      },
    },
    {
      id: '214490',
      info: {
        id: 2108,
        name: 'Alien: Isolation',
        release_date: 1_412_607_600,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 26_412,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/jpeg',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/26fdf7a66ca64f8a53765bf80d84a4ed.jpg',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/26fdf7a66ca64f8a53765bf80d84a4ed.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'BETAFIX',
          steam64: '76561198038132921',
          avatar: 'https://avatars.steamstatic.com/9e9cede3ca6b787273294b0b469b38f4e5360a80_medium.jpg',
        },
      },
    },
    {
      id: '3008130',
      info: {
        id: 5_462_362,
        name: 'Dying Light: The Beast',
        release_date: 1_755_734_400,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 116_226,
        score: 0,
        style: 'alternate',
        width: 3840,
        height: 1240,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/8d5e076c8efbe9ce4ff98f3090e09035.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/8d5e076c8efbe9ce4ff98f3090e09035.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: '13',
          steam64: '76561199134735036',
          avatar: 'https://avatars.steamstatic.com/ffe162f1ac1b1c0c067b2aaf8b8a4da813910f0e_medium.jpg',
        },
      },
    },
    {
      id: '493520',
      info: {
        id: 12_552,
        name: 'GTFO',
        release_date: 1_575_921_761,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 42_198,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/7c40611ab3917aa747d7f7fb249b9620.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/7c40611ab3917aa747d7f7fb249b9620.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'VietCommie',
          steam64: '76561198117965742',
          avatar: 'https://avatars.steamstatic.com/3079c4f48f760a797fe42ade099f321ed1233f65_medium.jpg',
        },
      },
    },
    {
      id: '872670',
      info: {
        id: 5_433_328,
        name: 'SCP: 5K',
        release_date: 1_645_488_000,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 107_841,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/3926135ef2e1e174965034cf6d2ba32c.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/3926135ef2e1e174965034cf6d2ba32c.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'JoJoJoker',
          steam64: '76561198072935217',
          avatar: 'https://avatars.steamstatic.com/f17b253ee3b47cb7f18c8b1ed7276d3c023f215d_medium.jpg',
        },
      },
    },
    {
      id: '594330',
      info: {
        id: 16_822,
        name: 'Visage',
        release_date: 1_538_463_628,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 48_781,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/jpeg',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/4e7dd9fa7156b49c2db167bdc47f95d2.jpg',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/4e7dd9fa7156b49c2db167bdc47f95d2.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'RESENTMENT',
          steam64: '76561198322976564',
          avatar: 'https://avatars.steamstatic.com/2cd7396a56c27113c3cda1002b070c0573a6da14_medium.jpg',
        },
      },
    },
    {
      id: '1002300',
      info: {
        id: 195,
        name: 'Fear & Hunger',
        release_date: 1_544_515_200,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 91_468,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/jpeg',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/0444f4b8fc9f7ea0af52eafc4b751b01.jpg',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/0444f4b8fc9f7ea0af52eafc4b751b01.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'DEFKLUKER',
          steam64: '76561198330781856',
          avatar: 'https://avatars.steamstatic.com/0e185e23712dc5f7b9569dcfc4a22c24a07187ea_medium.jpg',
        },
      },
    },
    {
      id: '1392860',
      info: {
        id: 5_423_718,
        name: 'Little Nightmares III',
        release_date: 1_704_067_200,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 123_559,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/c535b620d6f5f30eb7feedf70cefa2d9.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/c535b620d6f5f30eb7feedf70cefa2d9.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'Snakerov',
          steam64: '76561198870831326',
          avatar: 'https://avatars.steamstatic.com/1ef4ad99cb12a11e31129f3e9e333cb2def2ca6d_medium.jpg',
        },
      },
    },
    {
      id: '1179080',
      info: {
        id: 5_250_035,
        name: 'FAITH: The Unholy Trinity',
        release_date: 1_666_353_600,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 17_661,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: 'Cropped wallpaper from deluxe edition',
        mime: 'image/jpeg',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/b4bf5de15063cd27595dfd36bc9db335.jpg',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/b4bf5de15063cd27595dfd36bc9db335.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'nickgames8',
          steam64: '76561198142078770',
          avatar: 'https://avatars.steamstatic.com/31c5fe40563918d325ef877640ae99f314b473c3_medium.jpg',
        },
      },
    },
    {
      id: '1943950',
      info: {
        id: 5_323_165,
        name: 'Escape the Backrooms',
        release_date: 1_640_995_200,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 70_673,
        score: 0,
        style: 'alternate',
        width: 3840,
        height: 1240,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/a23f4ecc97aae620242779f62f22bed5.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/a23f4ecc97aae620242779f62f22bed5.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'ZeeSG',
          steam64: '76561199087753210',
          avatar: 'https://avatars.steamstatic.com/47fa460c60e51c6ab4178fc9b2b3661734699ebe_medium.jpg',
        },
      },
    },
    {
      id: '2475490',
      info: {
        id: 5_426_126,
        name: 'Mouthwashing',
        release_date: 1_727_308_800,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 123_185,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/png',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/a09c01b96ecd8b9f6ea4a4d7fd8cd92c.png',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/a09c01b96ecd8b9f6ea4a4d7fd8cd92c.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'ABH20',
          steam64: '76561198058544946',
          avatar: 'https://avatars.steamstatic.com/378a48fc2172839e4ca7589e1d6bb235691714fa_medium.jpg',
        },
      },
    },
    {
      id: '381210',
      info: {
        id: 8168,
        name: 'Dead by Daylight',
        release_date: 1_465_887_600,
        types: [
          'steam',
        ],
        verified: true,
      },
      hero: {
        id: 1989,
        score: 0,
        style: 'alternate',
        width: 1920,
        height: 620,
        nsfw: false,
        humor: false,
        notes: null,
        mime: 'image/jpeg',
        language: 'en',
        url: 'https://cdn2.steamgriddb.com/hero/4a3e00961a08879c34f91ca0070ea2f5.jpg',
        thumb: 'https://cdn2.steamgriddb.com/hero_thumb/4a3e00961a08879c34f91ca0070ea2f5.jpg',
        lock: false,
        epilepsy: false,
        upvotes: 0,
        downvotes: 0,
        author: {
          name: 'Rixer97',
          steam64: '76561198113691613',
          avatar: 'https://avatars.steamstatic.com/8fd8ddfcbeef305cffe974e230bda6126d1da1fc_medium.jpg',
        },
      },
    },
  ])

  async function getData () {
    const items = []
    for (const id of ids) {
      const game = await client.getGameBySteamAppId(Number(id))
      const heros = await client.getHeroesBySteamAppId(Number(id))

      items.push ({
        id: id,
        info: game,
        hero: heros[0]!,
      })
    }
    console.log(items)

    // @ts-ignore
    games.value = items
    // return items
  }
</script>

<style scoped>
  :deep(.v-img img) {
    filter: brightness(50%);
  }
</style>
