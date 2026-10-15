<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ProfileForm from '../components/ProfileForm.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAppStore } from '../state/appStore'
import { navigate } from '../router/router'
import { WEEKDAY_LONG_LABELS } from '../domain/defaults'
import { minutesToHours } from '../domain/time'
import { validateReminderSettings, type ValidatedProfile } from '../domain/validation'
import type { IsoWeekday } from '../domain/types'
import { exportToCsv } from '../services/csv'
import { downloadTextFile } from '../services/fileTransfer'
import { createBrowserNotifier } from '../services/reminderScheduler'
import { todayIsoDate } from '../domain/date'

const store = useAppStore()
const profile = computed(() => store.activeProfile.value)

const usernameDraft = ref(store.state.data.username)
const generalNotice = ref('')

const profileNotice = ref('')
const remindersError = ref('')
const deleteDialogOpen = ref(false)

const notifier = createBrowserNotifier()
const permissionState = ref(notifier.permission())

interface ReminderDraft {
  enabled: boolean
  days: IsoWeekday[]
  time: string
}

const reminderDraft = ref<ReminderDraft>({ enabled: false, days: [], time: '09:00' })

watch(
  () => profile.value?.id ?? null,
  () => {
    const current = profile.value
    profileNotice.value = ''
    remindersError.value = ''
    if (current) {
      reminderDraft.value = {
        enabled: current.reminders.enabled,
        days: [...current.reminders.days],
        time: current.reminders.time,
      }
      permissionState.value = notifier.permission()
    }
  },
  { immediate: true },
)

const weekdays: ReadonlyArray<{ day: IsoWeekday; label: string }> = WEEKDAY_LONG_LABELS.map((label, index) => ({
  day: (index + 1) as IsoWeekday,
  label,
}))

function saveUsername(): void {
  store.setUsername(usernameDraft.value)
  generalNotice.value = usernameDraft.value.trim() === '' ? 'Vul een gebruikersnaam in.' : 'Gebruikersnaam opgeslagen.'
}

function saveProfile(validated: ValidatedProfile): void {
  const current = profile.value
  if (!current) return
  store.updateProfile(current.id, validated)
  profileNotice.value =
    'Profiel opgeslagen. Gewijzigde contracturen gelden alleen voor toekomstige weken; bestaande weekcontracten blijven staan.'
}

function toggleReminderDay(day: IsoWeekday, checked: boolean): void {
  const days = checked
    ? [...reminderDraft.value.days, day]
    : reminderDraft.value.days.filter((value) => value !== day)
  reminderDraft.value = { ...reminderDraft.value, days }
}

function setRemindersEnabled(event: Event): void {
  reminderDraft.value = { ...reminderDraft.value, enabled: (event.target as HTMLInputElement).checked }
}

function setReminderDay(event: Event, day: IsoWeekday): void {
  toggleReminderDay(day, (event.target as HTMLInputElement).checked)
}

function setReminderTime(event: Event): void {
  reminderDraft.value = { ...reminderDraft.value, time: (event.target as HTMLInputElement).value }
}

async function saveReminders(): Promise<void> {
  const current = profile.value
  if (!current) return

  const result = validateReminderSettings(reminderDraft.value.enabled, reminderDraft.value.days, reminderDraft.value.time)
  if (!result.ok) {
    remindersError.value = Object.values(result.errors).join(' ')
    return
  }

  remindersError.value = ''
  store.updateProfile(current.id, { reminders: result.value })

  // Toestemming voor meldingen wordt gevraagd wanneer het is inschakelen.
  if (result.value.enabled && notifier.isSupported() && notifier.permission() !== 'granted') {
    permissionState.value = await notifier.requestPermission()
  } else {
    permissionState.value = result.value.enabled ? notifier.permission() : 'default'
  }
}

function exportCsv(): void {
  const csv = exportToCsv(store.state.data)
  downloadTextFile(`uurwijzer-export-${todayIsoDate()}.csv`, csv)
}

function askDelete(): void {
  deleteDialogOpen.value = true
}

function deleteProfile(): void {
  const current = profile.value
  if (!current) return
  store.deleteProfile(current.id)
  deleteDialogOpen.value = false
  navigate({ name: 'profiles' })
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
    <h1>Instellingen</h1>

    <section class="uw-card">
      <h2>Algemeen</h2>
      <form class="uw-stack" novalidate @submit.prevent="saveUsername">
        <div class="uw-field">
          <label for="settings-username">Gebruikersnaam (voor de hele app)</label>
          <input id="settings-username" v-model="usernameDraft" class="uw-input" type="text" autocomplete="name" />
        </div>
        <div class="uw-row" style="justify-content: flex-start">
          <button type="submit" class="uw-button uw-button--primary">Opslaan</button>
        </div>
        <p v-if="generalNotice" class="uw-meta" role="status">{{ generalNotice }}</p>
      </form>
    </section>

    <section class="uw-card">
      <h2>Profiel: {{ profile.name }}</h2>
      <ProfileForm
        :key="profile.id"
        :initial-name="profile.name"
        :initial-contract-hours="String(minutesToHours(profile.contractMinutes))"
        :initial-start-time="profile.defaultStartTime"
        :initial-end-time="profile.defaultEndTime"
        :initial-theme="profile.theme"
        submit-label="Profiel opslaan"
        @submit="saveProfile"
        @cancel="navigate({ name: 'dashboard' })"
      />
      <p v-if="profileNotice" class="uw-meta" role="status">{{ profileNotice }}</p>
    </section>

    <section class="uw-card">
      <h2>Notificaties</h2>
      <p class="uw-meta">Stuurt een notificatie als op de aangegeven dag geen uren zijn geregistreerd.</p>

      <label class="uw-checkbox-row">
        <input type="checkbox" :checked="reminderDraft.enabled" @change="setRemindersEnabled" />
        Notificaties inschakelen
      </label>

      <fieldset v-if="reminderDraft.enabled" style="border: 0; padding: 0; margin: 0">
        <legend class="uw-legend">Werkdagen</legend>
        <div class="uw-stack">
          <label v-for="weekday in weekdays" :key="weekday.day" class="uw-checkbox-row">
            <input
              type="checkbox"
              :checked="reminderDraft.days.includes(weekday.day)"
              @change="setReminderDay($event, weekday.day)"
            />
            {{ weekday.label }}
          </label>
        </div>
      </fieldset>

      <div v-if="reminderDraft.enabled" class="uw-field">
        <label for="reminder-time">Notificatietijd</label>
        <input
          id="reminder-time"
          :value="reminderDraft.time"
          class="uw-input"
          type="time"
          @change="setReminderTime"
        />
      </div>

      <p v-if="remindersError" class="uw-field-error">{{ remindersError }}</p>

      <div class="uw-row" style="justify-content: flex-start">
        <button type="button" class="uw-button uw-button--primary" @click="saveReminders">
          Notificaties opslaan
        </button>
      </div>

      <p class="uw-meta">Let op! In een vakantieweek worden geen meldingen verstuurd!</p>
    </section>

    <section class="uw-card">
      <h2>Back-up (CSV)</h2>
      <p class="uw-meta">
        De export bevat alle profielen met hun weekgegevens en registraties. Importeren doe je op de profielpagina.
      </p>
      <div class="uw-row" style="justify-content: flex-start">
        <button type="button" class="uw-button" @click="exportCsv">Exporteren naar CSV</button>
      </div>
    </section>

    <section class="uw-card">
      <h2>Profiel verwijderen</h2>
      <p class="uw-meta">
        Hiermee verwijder je dit profiel met alle registraties en weekgegevens. Andere profielen blijven bestaan.
      </p>
      <div class="uw-row" style="justify-content: flex-start">
        <button type="button" class="uw-button uw-button--danger" @click="askDelete">Profiel verwijderen</button>
      </div>
    </section>

    <ConfirmDialog
      :open="deleteDialogOpen"
      title="Profiel verwijderen"
      :message="`Typ de profielnaam over om het profiel definitief te verwijderen.`"
      :required-text="profile.name"
      confirm-label="Definitief verwijderen"
      danger
      @confirm="deleteProfile"
      @cancel="deleteDialogOpen = false"
    />
  </div>
</template>
