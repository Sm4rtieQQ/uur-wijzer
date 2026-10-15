<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import WeekDayCells from '../components/WeekDayCells.vue'
import { useAppStore } from '../state/appStore'
import { navigate } from '../router/router'
import { formatDateRangeDutch, todayIsoDate } from '../domain/date'
import { getIsoWeek, type IsoWeekRef } from '../domain/isoWeek'
import { availableIsoYears, buildWeekSummary, overviewIsoWeeks, yearBalance } from '../domain/weeks'
import { formatDuration, formatSignedDuration } from '../domain/time'

const store = useAppStore()
const profile = computed(() => store.activeProfile.value)
const today = todayIsoDate()
const currentIsoYear = getIsoWeek(today).isoYear

const years = computed(() => (profile.value ? availableIsoYears(store.state.data, profile.value.id, today) : []))
const selectedYear = ref(currentIsoYear)

watch(years, (list) => {
  if (!list.includes(selectedYear.value) && list.length > 0) {
    selectedYear.value = list[0] ?? currentIsoYear
  }
})

// Legt de weekcontracten van het gekozen jaar vast (eenmalig per week).
watch(
  () => `${profile.value?.id ?? ''}:${selectedYear.value}`,
  () => {
    const activeProfile = profile.value
    if (activeProfile) store.ensureWeeksForYear(activeProfile.id, selectedYear.value)
  },
  { immediate: true },
)

const weeks = computed(() => {
  const activeProfile = profile.value
  if (!activeProfile) return []
  return overviewIsoWeeks(store.state.data, activeProfile.id, selectedYear.value, today)
    .map((ref) => buildWeekSummary(store.state.data, activeProfile, ref))
    .sort((a, b) => b.isoWeek - a.isoWeek)
})

const saldoSelectedYear = computed(() => {
  const activeProfile = profile.value
  if (!activeProfile) return 0
  return yearBalance(store.state.data, activeProfile, selectedYear.value, today)
})

function openWeek(ref: IsoWeekRef): void {
  navigate({ name: 'week-detail', isoYear: ref.isoYear, isoWeek: ref.isoWeek })
}

function balanceClass(minutes: number): string {
  if (minutes > 0) return 'uw-balance--positive'
  if (minutes < 0) return 'uw-balance--negative'
  return ''
}
</script>

<template>
  <div v-if="!profile" class="uw-page">
    <p>Er is geen actief profiel. Kies eerst een profiel.</p>
    <button type="button" class="uw-button uw-button--primary" @click="navigate({ name: 'profiles' })">
      Naar profielkeuze
    </button>
  </div>

  <div v-else class="uw-page">
    <header class="uw-stack">
      <div class="uw-row">
        <h1>Overzicht</h1>
        <span class="uw-row uw-meta">
          <span>Jaarsaldo</span>
          <span :class="balanceClass(saldoSelectedYear)">{{ formatSignedDuration(saldoSelectedYear) }}</span>
        </span>
      </div>
      <select
        id="overview-year"
        v-model.number="selectedYear"
        class="uw-select"
        aria-label="ISO-weekjaar"
      >
        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
      </select>
    </header>

    <p v-if="weeks.length === 0" class="uw-meta">Er zijn nog geen weken met gegevens in dit jaar.</p>

    <button
      v-for="week in weeks"
      :key="`${week.isoYear}-${week.isoWeek}`"
      type="button"
      class="uw-week-link"
      @click="openWeek(week)"
    >
      <span class="uw-week-container">
        <span class="uw-row">
          <strong>Week {{ week.isoWeek }}</strong>
          <span v-if="week.isVacation" class="uw-badge">Vakantie</span>
          <span v-else-if="week.registrationCount === 0" class="uw-badge">Leeg</span>
          <span class="uw-meta">{{ formatDateRangeDutch(week.startDate, week.endDate) }}</span>
        </span>

        <template v-if="week.registrationCount > 0">
          <span class="uw-row">
            <span class="uw-meta">Contract</span>
            <span>{{ formatDuration(week.contractMinutes) }}</span>
          </span>
          <span class="uw-row">
            <span class="uw-meta">Gewerkt</span>
            <span>{{ formatDuration(week.workedMinutes) }}</span>
          </span>
          <span class="uw-row">
            <span class="uw-meta">Saldo</span>
            <span :class="balanceClass(week.balanceMinutes)">
              {{ formatSignedDuration(week.balanceMinutes) }}
            </span>
          </span>
          <WeekDayCells :daily-minutes="week.dailyMinutes" />
        </template>
      </span>
    </button>
  </div>
</template>
