<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration } from '../domain/time'
import { WEEKDAY_SHORT_LABELS } from '../domain/defaults'

const props = defineProps<{
  /** Zeven dagsommen in minuten, maandag t/m zondag. */
  dailyMinutes: number[]
  /**
   * Voorvoegsel voor de `name`/`id` van de container en de dagcellen. Nodig
   * zodra het component meerdere keren op één pagina staat (bijv. per week in
   * het overzicht), zodat de ids uniek blijven.
   */
  idPrefix?: string
}>()

const prefix = computed(() => props.idPrefix ?? 'week')
const containerId = computed(() => `${prefix.value}-days`)

function minutesFor(index: number): number {
  const value = props.dailyMinutes[index]
  return value === undefined ? 0 : value
}

function labelFor(index: number): string {
  return WEEKDAY_SHORT_LABELS[index] ?? ''
}

/** Unieke id/naam per dagcel, met context van de week waarin hij staat. */
function cellId(index: number): string {
  return `${prefix.value}-day-${index}`
}
</script>

<template>
  <span class="uw-day-cells" :name="containerId" :id="containerId">
    <span
      v-for="index in 7"
      :key="index"
      class="uw-day-cell"
      :class="{ 'uw-day-cell--empty': minutesFor(index - 1) === 0 }"
      :name="cellId(index)"
      :id="cellId(index)"
    >
      <span class="uw-meta">{{ labelFor(index - 1) }}</span>
      <span v-if="minutesFor(index - 1) > 0">{{ formatDuration(minutesFor(index - 1)) }}</span>
      <span v-else aria-hidden="true">—</span>
    </span>
  </span>
</template>
