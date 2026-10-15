<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import WeekDayCells from '../components/WeekDayCells.vue'
import RegistrationFormDialog from '../components/RegistrationFormDialog.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAppStore } from '../state/appStore'
import { navigate } from '../router/router'
import { formatDateDutch, formatDateRangeDutch } from '../domain/date'
import { isoWeekDates, type IsoWeekRef } from '../domain/isoWeek'
import { buildWeekSummary, registrationsInWeek, registrationWorkedMinutes } from '../domain/weeks'
import { formatDuration, formatSignedDuration, minutesToHours } from '../domain/time'
import { WEEKDAY_SHORT_LABELS } from '../domain/defaults'
import { validateContractHours } from '../domain/validation'
import type { Registration } from '../domain/types'

const props = defineProps<{
  isoYear: number
  isoWeek: number
}>()

const store = useAppStore()
const profile = computed(() => store.activeProfile.value)
const ref0 = computed<IsoWeekRef>(() => ({ isoYear: props.isoYear, isoWeek: props.isoWeek }))

const registrationDialogOpen = ref(false)
const editingRegistration = ref<Registration | null>(null)
const deletingRegistration = ref<Registration | null>(null)

const contractDraft = ref('')
const contractError = ref('')
const contractSaved = ref(false)

watch(
  () => `${profile.value?.id ?? ''}:${props.isoYear}-${props.isoWeek}`,
  () => {
    const activeProfile = profile.value
    if (!activeProfile) return
    const week = store.ensureWeek(activeProfile.id, ref0.value)
    contractDraft.value = String(minutesToHours(week.contractMinutes))
    contractError.value = ''
    contractSaved.value = false
  },
  { immediate: true },
)

const summary = computed(() => {
  const activeProfile = profile.value
  if (!activeProfile) return null
  return buildWeekSummary(store.state.data, activeProfile, ref0.value)
})

const registrations = computed(() => {
  const activeProfile = profile.value
  if (!activeProfile) return []
  return registrationsInWeek(store.state.data.registrations, activeProfile.id, ref0.value)
})

function saveContract(): void {
  const activeProfile = profile.value
  if (!activeProfile) return
  const result = validateContractHours(contractDraft.value)
  if (!result.ok) {
    contractError.value = result.errors['contractHours'] ?? 'Ongeldige contracturen.'
    contractSaved.value = false
    return
  }
  contractError.value = ''
  store.setWeekContract(activeProfile.id, ref0.value, result.value.contractMinutes)
  contractSaved.value = true
}

function toggleVacation(event: Event): void {
  const activeProfile = profile.value
  if (!activeProfile) return
  store.setWeekVacation(activeProfile.id, ref0.value, (event.target as HTMLInputElement).checked)
}

function openEdit(registration: Registration): void {
  editingRegistration.value = registration
  registrationDialogOpen.value = true
}

function openNew(): void {
  editingRegistration.value = null
  registrationDialogOpen.value = true
}

function closeDialog(): void {
  registrationDialogOpen.value = false
  editingRegistration.value = null
}

function confirmDelete(): void {
  const registration = deletingRegistration.value
  if (registration) store.removeRegistration(registration.id)
  deletingRegistration.value = null
}

function workedLabel(registration: Registration): string {
  const minutes = registrationWorkedMinutes(registration)
  return minutes === null ? 'ongeldige tijden' : formatDuration(minutes)
}

function dayLabel(registration: Registration): string {
  const index = isoWeekDates(props.isoYear, props.isoWeek).indexOf(registration.date)
  return index >= 0 ? (WEEKDAY_SHORT_LABELS[index] ?? '') : ''
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
      <div class="uw-row">
        <h1>Week {{ summary.isoWeek }}</h1>
        <span v-if="summary.isVacation" class="uw-badge">Vakantie</span>
      </div>
      <p class="uw-meta">{{ formatDateRangeDutch(summary.startDate, summary.endDate) }} · {{ summary.isoYear }}</p>
      <div class="uw-row" style="justify-content: flex-start">
        <button type="button" class="uw-button" @click="navigate({ name: 'overview' })">Terug naar overzicht</button>
        <button type="button" class="uw-button uw-button--primary" @click="openNew">Registratie toevoegen</button>
      </div>
    </header>

    <section class="uw-card">
      <div class="uw-row">
        <span>Gewerkte uren</span>
        <strong>{{ formatDuration(summary.workedMinutes) }}</strong>
      </div>
      <div class="uw-row">
        <span>Saldo</span>
        <span :class="balanceClass(summary.balanceMinutes)">
          {{ formatSignedDuration(summary.balanceMinutes) }}
        </span>
      </div>
      <WeekDayCells :daily-minutes="summary.dailyMinutes" />
    </section>

    <section class="uw-card">
      <h2>Weekcontract</h2>
      <div class="uw-row" style="align-items: flex-end">
        <div class="uw-field" style="flex: 1">
          <label for="week-contract">Contracturen deze week (uren)</label>
          <input id="week-contract" v-model="contractDraft" class="uw-input" type="text" inputmode="decimal" />
          <p v-if="contractError" class="uw-field-error">{{ contractError }}</p>
        </div>
        <button type="button" class="uw-button uw-button--primary" @click="saveContract">Opslaan</button>
      </div>
      <p v-if="contractSaved" class="uw-meta" role="status">Weekcontract opgeslagen.</p>
      <p class="uw-meta">
        Effectief contract: {{ formatDuration(summary.contractMinutes) }}
        <span v-if="summary.isVacation">(vakantieweek)</span>
      </p>

      <label class="uw-checkbox-row">
        <input type="checkbox" :checked="summary.isVacation" @change="toggleVacation" />
        Deze week is vakantie
      </label>
    </section>

    <section class="uw-card">
      <h2>Registraties ({{ registrations.length }})</h2>
      <p v-if="registrations.length === 0" class="uw-meta">Deze week heeft nog geen registraties.</p>
      <ul v-else class="uw-list" style="list-style: none; margin: 0; padding: 0">
        <li v-for="registration in registrations" :key="registration.id" class="uw-card">
          <div class="uw-row">
            <span>
              <strong>{{ dayLabel(registration) }} {{ formatDateDutch(registration.date) }}</strong>
              <span class="uw-meta"> · {{ registration.startTime }}–{{ registration.endTime }} </span>
            </span>
            <strong>{{ workedLabel(registration) }}</strong>
          </div>
          <div class="uw-row" style="justify-content: flex-end">
            <button type="button" class="uw-button" @click="openEdit(registration)">Aanpassen</button>
            <button type="button" class="uw-button uw-button--danger" @click="deletingRegistration = registration">
              Verwijderen
            </button>
          </div>
        </li>
      </ul>
    </section>

    <RegistrationFormDialog
      :open="registrationDialogOpen"
      :profile="profile"
      :registration="editingRegistration"
      :default-date="summary.startDate"
      @close="closeDialog"
    />

    <ConfirmDialog
      :open="deletingRegistration !== null"
      title="Registratie verwijderen"
      :message="
        deletingRegistration
          ? `Weet je zeker dat je de registratie van ${formatDateDutch(deletingRegistration.date)} (${deletingRegistration.startTime}–${deletingRegistration.endTime}) wilt verwijderen?`
          : ''
      "
      confirm-label="Verwijderen"
      danger
      @confirm="confirmDelete"
      @cancel="deletingRegistration = null"
    />
  </div>
</template>
