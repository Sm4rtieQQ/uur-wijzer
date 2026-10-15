<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useAppStore } from '../state/appStore'
import { currentRoute, navigate, type Route } from '../router/router'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useAppStore()
const dialog = ref<HTMLElement | null>(null)

const menuItems: ReadonlyArray<{ route: Route; label: string }> = [
  { route: { name: 'dashboard' }, label: 'Dashboard' },
  { route: { name: 'overview' }, label: 'Overzicht' },
  { route: { name: 'settings' }, label: 'Instellingen' },
]

const username = computed(() => store.state.data.username)
const companyName = computed(() => store.activeProfile.value?.name ?? 'Geen profiel')

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      dialog.value?.focus()
    }
  },
)

function isActive(route: Route): boolean {
  return currentRoute.value.name === route.name
}

function goTo(route: Route): void {
  navigate(route)
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}
</script>

<template>
  <div v-if="props.open" class="uw-dialog-backdrop" @click.self="emit('close')">
    <div
      ref="dialog"
      class="uw-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="uw-stack">
        <span class="uw-eyebrow">{{ username }}</span>
        <strong>{{ companyName }}</strong>
      </div>

      <nav class="uw-nav" aria-label="Hoofdmenu">
        <button
          v-for="item in menuItems"
          :key="item.label"
          type="button"
          class="uw-button uw-nav-button"
          :aria-current="isActive(item.route) ? 'page' : undefined"
          @click="goTo(item.route)"
        >
          {{ item.label }}
        </button>
      </nav>
    </div>
  </div>
</template>
