<script setup lang="ts">
import { formatDuration } from '../domain/time'
import { WEEKDAY_SHORT_LABELS } from '../domain/defaults'

const props = defineProps<{
  /** Zeven dagsommen in minuten, maandag t/m zondag. */
  dailyMinutes: number[]
}>()

function minutesFor(index: number): number {
  const value = props.dailyMinutes[index]
  return value === undefined ? 0 : value
}

function labelFor(index: number): string {
  return WEEKDAY_SHORT_LABELS[index] ?? ''
}
</script>

<template>
  <span class="uw-day-cells">
    <span
      v-for="index in 7"
      :key="index"
      class="uw-day-cell"
      :class="{ 'uw-day-cell--empty': minutesFor(index - 1) === 0 }"
    >
      <span class="uw-meta">{{ labelFor(index - 1) }}</span>
      <span v-if="minutesFor(index - 1) > 0">{{ formatDuration(minutesFor(index - 1)) }}</span>
      <span v-else aria-hidden="true">—</span>
    </span>
  </span>
</template>
