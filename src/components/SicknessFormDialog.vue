<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { formatDateRangeDutch } from '../domain/date'
import { isoWeekEnd, isoWeekStart, type IsoWeekRef } from '../domain/isoWeek'
import { minutesToHours } from '../domain/time'
import { validateSickHours } from '../domain/validation'
import type { Profile } from '../domain/types'
import { useAppStore } from '../state/appStore'

const props = defineProps<{
  open: boolean
  profile: Profile
  /** De week waarvoor ziekte-uren worden geregistreerd. */
  week: IsoWeekRef
  /** Reeds vastgelegde ziekte-uren in minuten (0 = geen). */
  sickMinutes: number
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useAppStore()
const errors = ref<Partial<Record<string, string>>>({})
const form = reactive({ sickHours: '' })

const weekLabel = computed(() =>
  formatDateRangeDutch(
    isoWeekStart(props.week.isoYear, props.week.isoWeek),
    isoWeekEnd(props.week.isoYear, props.week.isoWeek),
  ),
)

function resetForm(): void {
  errors.value = {}
  // Minuten terug omzetten naar uren met een Nederlandse decimaalkomma.
  form.sickHours = props.sickMinutes > 0 ? String(minutesToHours(props.sickMinutes)).replace('.', ',') : ''
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
)

function onSubmit(): void {
  const result = validateSickHours(form.sickHours)

  if (!result.ok) {
    errors.value = result.errors
    return
  }

  errors.value = {}
  // 0 slaat de ziekte-uren op als "verwijderd" (het weekrecord blijft bestaan).
  store.setWeekSick(props.profile.id, props.week, result.value.sickMinutes)
  emit('saved')
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}
</script>

<template>
  <div
    v-if="props.open"
    class="uw-dialog-backdrop"
    name="sickness"
    id="sickness"
    @click.self="emit('close')"
    @keydown="onKeydown"
  >
    <div class="uw-dialog" role="dialog" aria-modal="true" aria-labelledby="sickness-dialog-title">
      <h2 id="sickness-dialog-title">Ziekte registreren</h2>
      <p class="uw-meta">Week {{ props.week.isoWeek }} · {{ weekLabel }}</p>

      <form class="uw-stack" novalidate @submit.prevent="onSubmit">
        <div class="uw-field">
          <label for="sickness-hours">Ziekte-uren deze week</label>
          <input
            id="sickness-hours"
            v-model="form.sickHours"
            class="uw-input"
            type="text"
            inputmode="decimal"
            placeholder="bijvoorbeeld 8 of 7,5"
          />
          <p v-if="errors.sickHours" class="uw-field-error">{{ errors.sickHours }}</p>
          <p class="uw-meta">Vul 0 in om de ziekte-uren te verwijderen.</p>
        </div>

        <div class="uw-row" style="justify-content: flex-end">
          <button type="button" class="uw-button" @click="emit('close')">Annuleren</button>
          <button type="submit" class="uw-button uw-button--primary">Opslaan</button>
        </div>
      </form>
    </div>
  </div>
</template>
