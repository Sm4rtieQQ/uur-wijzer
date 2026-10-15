<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../state/appStore'
import { navigate } from '../router/router'

const props = defineProps<{
  menuOpen: boolean
}>()

const emit = defineEmits<{
  openMenu: []
}>()

const store = useAppStore()
const username = computed(() => store.state.data.username)
const companyName = computed(() => store.activeProfile.value?.name ?? '')
</script>

<template>
  <header class="uw-header">
    <button
      type="button"
      class="uw-header-title"
      title="Profiel wisselen"
      @click="navigate({ name: 'profiles' })"
    >
      <span class="uw-eyebrow">{{ username }}</span>
      <strong>{{ companyName }}</strong>
    </button>

    <button
      type="button"
      class="uw-button uw-menu-button"
      :aria-expanded="props.menuOpen"
      aria-label="Menu openen"
      @click="emit('openMenu')"
    >
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
  </header>
</template>
