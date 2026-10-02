<template>
  <v-app>
    <v-app-bar class="haunted-app-bar" density="comfortable" flat theme="dark">
      <v-app-bar-nav-icon
        aria-label="Open year navigation"
        :aria-expanded="drawerOpen"
        icon="mdi-menu"
        @click="drawerOpen = !drawerOpen"
      />
      <v-icon class="header-pumpkin" icon="mdi-pumpkin" size="30" />
      <v-app-bar-title class="header-brand">
        <span class="header-kicker">{{ selectedYear === '2025' ? 'ARCHIVE' : 'THE 2026 HAUNT' }}</span>
        <span class="header-name">Spooky Season</span>
      </v-app-bar-title>
      <v-chip class="mr-4 header-year" color="amber-lighten-2" variant="outlined">
        {{ selectedYear }}
      </v-chip>
    </v-app-bar>
    <v-navigation-drawer
      v-model="drawerOpen"
      temporary
      width="220"
    >
      <v-list nav>
        <v-list-subheader>YEAR FILES</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-calendar"
          title="2026"
          to="/"
          :active="route.query.year !== '2025'"
          @click="drawerOpen = false"
        />
        <v-list-item
          prepend-icon="mdi-archive-outline"
          title="2025"
          :to="{ path: '/', query: { year: '2025' } }"
          :active="route.query.year === '2025'"
          @click="drawerOpen = false"
        />
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import { useRoute } from 'vue-router'

  const route = useRoute()
  const drawerOpen = ref(false)
  const selectedYear = computed(() => route.query.year === '2025' ? '2025' : '2026')
</script>

<style scoped>
  .haunted-app-bar {
    background: linear-gradient(105deg, #17130f 0%, #302018 58%, #19140f 100%);
    border-bottom: 2px solid #df713e;
  }

  .header-pumpkin {
    color: #ff8954;
    filter: drop-shadow(0 0 8px rgb(255 111 56 / 35%));
  }

  .header-brand {
    min-width: 0;
  }

  .header-kicker,
  .header-name {
    display: block;
    font-family: 'Courier New', Courier, monospace;
  }

  .header-kicker {
    color: #c5d38c;
    font-size: 0.65rem;
    line-height: 1.1;
  }

  .header-name {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .header-year {
    font-family: 'Courier New', Courier, monospace;
  }
</style>
