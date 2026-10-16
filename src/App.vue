<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import MenuDrawer from './components/MenuDrawer.vue'
import DataIssuesNotice from './components/DataIssuesNotice.vue'
import DashboardPage from './pages/DashboardPage.vue'
import OverviewPage from './pages/OverviewPage.vue'
import WeekDetailPage from './pages/WeekDetailPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
import ProfilePage from './pages/ProfilePage.vue'
import NewProfilePage from './pages/NewProfilePage.vue'
import { currentRoute, guardRoute } from './router/router'
import { useAppStore } from './state/appStore'
import { useTheme } from './state/useTheme'
import { DEFAULT_ACCENT_COLOR } from './domain/defaults'
import { createBrowserNotifier, startReminderScheduler, type ReminderScheduler } from './services/reminderScheduler'

const store = useAppStore()
const menuOpen = ref(false)
const issuesDismissed = ref(false)
let reminderScheduler: ReminderScheduler | null = null

onMounted(() => {
  reminderScheduler = startReminderScheduler({ store, notifier: createBrowserNotifier() })
})

onBeforeUnmount(() => {
  reminderScheduler?.stop()
  reminderScheduler = null
})

const route = currentRoute
const issues = computed(() => store.state.issues)
const showIssues = computed(() => issues.value.length > 0 && !issuesDismissed.value)
const showShell = computed(() => route.value.name !== 'profiles' && route.value.name !== 'new-profile')

useTheme(
  () => store.state.data.theme,
  () => store.activeProfile.value?.accentColor ?? DEFAULT_ACCENT_COLOR,
)

watch(
  () => store.activeProfile.value?.id ?? null,
  () => {
    menuOpen.value = false
    guardRoute(store)
  },
)

watch(route, () => guardRoute(store), { deep: true })
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink" name="appShell" id="appShell">
    <DataIssuesNotice v-if="showIssues" :issues="issues" @dismiss="issuesDismissed = true" />

    <AppHeader v-if="showShell" :menu-open="menuOpen" @open-menu="menuOpen = true" />
    <Transition name="uw-drawer">
      <MenuDrawer v-if="menuOpen" :open="true" @close="menuOpen = false" />
    </Transition>

    <main name="appMain" id="appMain">
      <DashboardPage v-if="route.name === 'dashboard'" />
      <OverviewPage v-else-if="route.name === 'overview'" />
      <WeekDetailPage
        v-else-if="route.name === 'week-detail'"
        :key="`${route.isoYear}-${route.isoWeek}`"
        :iso-year="route.isoYear"
        :iso-week="route.isoWeek"
      />
      <SettingsPage v-else-if="route.name === 'settings'" />
      <ProfilePage v-else-if="route.name === 'profiles'" />
      <NewProfilePage v-else-if="route.name === 'new-profile'" />
    </main>
  </div>
</template>
