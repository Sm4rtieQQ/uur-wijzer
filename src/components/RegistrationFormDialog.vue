<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { todayIsoDate } from '../domain/date'
import { validateRegistrationInput } from '../domain/validation'
import type { IsoDate, Profile, Registration } from '../domain/types'
import { useAppStore } from '../state/appStore'

const props = defineProps<{
  open: boolean
  profile: Profile
  /** Bestaande registratie om te wijzigen. */
  registration?: Registration | null
  /** Datum die als standaard gekozen wordt bij een nieuwe registratie. */
  defaultDate?: IsoDate
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useAppStore()
const errors = ref<Partial<Record<string, string>>>({})
const today = todayIsoDate()

const form = reactive({
  date: today,
  startTime: props.profile.defaultStartTime,
  endTime: props.profile.defaultEndTime,
})

function resetForm(): void {
  errors.value = {}
  const registration = props.registration
  if (registration) {
    form.date = registration.date
    form.startTime = registration.startTime
    form.endTime = registration.endTime
    return
  }
  form.date = props.defaultDate ?? today
  form.startTime = props.profile.defaultStartTime
  form.endTime = props.profile.defaultEndTime
}

watch(() => props.open, (open) => {
  if (open) resetForm()
})

function onSubmit(): void {
  const result = validateRegistrationInput({
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
  })

  if (!result.ok) {
    errors.value = result.errors
    return
  }

  errors.value = {}
  if (props.registration) {
    store.updateRegistration(props.registration.id, result.value)
  } else {
    store.addRegistration(props.profile.id, result.value)
  }
  emit('saved')
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}
</script>

<template>
  <div v-if="props.open" class="uw-dialog-backdrop" @click.self="emit('close')" @keydown="onKeydown">
    <div class="uw-dialog" role="dialog" aria-modal="true" aria-labelledby="registration-dialog-title">
      <h2 id="registration-dialog-title">
        {{ props.registration ? 'Registratie aanpassen' : 'Registratie toevoegen' }}
      </h2>

      <form class="uw-stack" novalidate @submit.prevent="onSubmit">
        <div class="uw-field">
          <label for="registration-date">Datum</label>
          <input id="registration-date" v-model="form.date" class="uw-input" type="date" :max="today" />
          <p v-if="errors.date" class="uw-field-error">{{ errors.date }}</p>
        </div>

        <div class="uw-field">
          <label for="registration-start">Starttijd</label>
          <input id="registration-start" v-model="form.startTime" class="uw-input" type="time" />
          <p v-if="errors.startTime" class="uw-field-error">{{ errors.startTime }}</p>
        </div>

        <div class="uw-field">
          <label for="registration-end">Eindtijd</label>
          <input id="registration-end" v-model="form.endTime" class="uw-input" type="time" />
          <p v-if="errors.endTime" class="uw-field-error">{{ errors.endTime }}</p>
        </div>

        <div class="uw-row" style="justify-content: flex-end">
          <button type="button" class="uw-button" @click="emit('close')">Annuleren</button>
          <button type="submit" class="uw-button uw-button--primary">Opslaan</button>
        </div>
      </form>
    </div>
  </div>
</template>
