<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import WeekDayCells from '../components/WeekDayCells.vue'
import RegistrationFormDialog from '../components/RegistrationFormDialog.vue'
import { useAppStore } from '../state/appStore'
import { navigate } from '../router/router'
import { formatDateRangeDutch, todayIsoDate } from '../domain/date'
import { getIsoWeek } from '../domain/isoWeek'
import { buildWeekSummary, yearBalance } from '../domain/weeks'
import { formatDuration, formatSignedDuration } from '../domain/time'

const store = useAppStore()
const profile = computed(() => store.activeProfile.value)
const registrationDialogOpen = ref(false)

const today = todayIsoDate()
const currentWeek = computed(() => getIsoWeek(today))

// Legt het weekcontract van de huidige week vast met de nu geldende contracturen.
watch(
  () => `${profile.value?.id ?? ''}:${currentWeek.value.isoYear}-${currentWeek.value.isoWeek}`,
  () => {
    const activeProfile = profile.value
    if (activeProfile) store.ensureWeek(activeProfile.id, currentWeek.value)
  },
  { immediate: true },
)

const summary = computed(() => {
  const activeProfile = profile.value
  if (!activeProfile) return null
  return buildWeekSummary(store.state.data, activeProfile, currentWeek.value)
})

const saldoThisYear = computed(() => {
  const activeProfile = profile.value
  if (!activeProfile) return 0
  return yearBalance(store.state.data, activeProfile, currentWeek.value.isoYear)
})

function toggleVacation(event: Event): void {
  const activeProfile = profile.value
  if (!activeProfile) return
  store.setWeekVacation(activeProfile.id, currentWeek.value, (event.target as HTMLInputElement).checked)
}

function balanceClass(minutes: number): string {
  if (minutes > 0) return 'uw-balance--positive'
  if (minutes < 0) return 'uw-balance--negative'
  return ''
}
</script>

<template>
  <div v-if="!profile || !summary" class="uw-page">
    <p>Er is geen actief profiel. Kies eerst een profiel.</p>
    <button type="button" class="uw-button uw-button--primary" @click="navigate({ name: 'profiles' })">
      Naar profielkeuze
    </button>
  </div>

  <div v-else class="uw-page">
    <header class="uw-stack">
      <div class="uw-row" style="align-items: flex-end">
        <div class="uw-stack">
          <span class="uw-eyebrow">{{ summary.isoYear }}</span>
          <h1>Week {{ summary.isoWeek }}</h1>
        </div>
        <span class="uw-meta">{{ formatDateRangeDutch(summary.startDate, summary.endDate) }}</span>
      </div>
      <p v-if="summary.isVacation" class="uw-badge">Vakantieweek</p>
    </header>

    <section class="uw-card uw-card--center">
      <h2 v-if="summary.registrationCount > 0" class="uw-total">
        Je hebt {{ formatDuration(summary.workedMinutes) }} gewerkt!
      </h2>
      <p v-else class="uw-meta">Deze week bevat nog geen registraties.</p>
    </section>

    <section class="uw-card">
      <WeekDayCells :daily-minutes="summary.dailyMinutes" />
    </section>

    <section v-if="summary.contractMinutes > 0" class="uw-card">
      <div class="uw-row">
        <span>Uren volgens contract</span>
        <strong>{{ formatDuration(summary.contractMinutes) }}</strong>
      </div>
      <div class="uw-row">
        <span>Saldo</span>
        <span :class="balanceClass(summary.balanceMinutes)">
          {{ formatSignedDuration(summary.balanceMinutes) }}
        </span>
      </div>
    </section>

    <section class="uw-card">
      <div class="uw-row">
        <span>Jaarsaldo ({{ summary.isoYear }})</span>
        <span :class="balanceClass(saldoThisYear)">{{ formatSignedDuration(saldoThisYear) }}</span>
      </div>
    </section>

    <section class="uw-card">
      <div class="uw-row" style="justify-content: flex-start">
        <button type="button" class="uw-button uw-button--primary" @click="registrationDialogOpen = true">
          Uren registreren
        </button>
        <button
          type="button"
          class="uw-button"
          @click="navigate({ name: 'week-detail', isoYear: summary.isoYear, isoWeek: summary.isoWeek })"
        >
          Weekdetails
        </button>
      </div>
    </section>

    <section class="uw-card">
      <label class="uw-checkbox-row">
        <input type="checkbox" :checked="summary.isVacation" @change="toggleVacation" />
        Vakantie
      </label>
    </section>

    <RegistrationFormDialog
      :open="registrationDialogOpen"
      :profile="profile"
      :default-date="today"
      @close="registrationDialogOpen = false"
    />
  </div>
</template>
