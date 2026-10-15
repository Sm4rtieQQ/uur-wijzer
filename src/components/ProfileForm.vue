<script setup lang="ts">
import { reactive, ref } from 'vue'
import { THEME_OPTIONS } from '../domain/defaults'
import { validateProfileInput, type ValidatedProfile } from '../domain/validation'
import type { ThemeId } from '../domain/types'

const props = defineProps<{
  initialName: string
  initialContractHours: string
  initialStartTime: string
  initialEndTime: string
  initialTheme: ThemeId
  submitLabel: string
}>()

const emit = defineEmits<{
  submit: [profile: ValidatedProfile]
  cancel: []
}>()

const form = reactive({
  name: props.initialName,
  contractHours: props.initialContractHours,
  defaultStartTime: props.initialStartTime,
  defaultEndTime: props.initialEndTime,
  theme: props.initialTheme,
})

const errors = ref<Partial<Record<string, string>>>({})

function onSubmit(): void {
  const result = validateProfileInput({
    name: form.name,
    contractHours: form.contractHours,
    defaultStartTime: form.defaultStartTime,
    defaultEndTime: form.defaultEndTime,
    theme: form.theme,
  })

  if (!result.ok) {
    errors.value = result.errors
    return
  }

  errors.value = {}
  emit('submit', result.value)
}
</script>

<template>
  <form class="uw-stack" novalidate @submit.prevent="onSubmit">
    <div class="uw-field">
      <label for="profile-name">Naam van werkgever of bedrijf</label>
      <input id="profile-name" v-model="form.name" class="uw-input" type="text" autocomplete="organization" />
      <p v-if="errors.name" class="uw-field-error">{{ errors.name }}</p>
    </div>

    <div class="uw-field">
      <label for="profile-contract">Contracturen per week</label>
      <input
        id="profile-contract"
        v-model="form.contractHours"
        class="uw-input"
        type="text"
        inputmode="decimal"
        placeholder="bijvoorbeeld 32 of 32,5"
      />
      <p v-if="errors.contractHours" class="uw-field-error">{{ errors.contractHours }}</p>
    </div>

    <div class="uw-field">
      <label for="profile-start">Standaard starttijd</label>
      <input id="profile-start" v-model="form.defaultStartTime" class="uw-input" type="time" />
      <p v-if="errors.defaultStartTime" class="uw-field-error">{{ errors.defaultStartTime }}</p>
    </div>

    <div class="uw-field">
      <label for="profile-end">Standaard eindtijd</label>
      <input id="profile-end" v-model="form.defaultEndTime" class="uw-input" type="time" />
      <p v-if="errors.defaultEndTime" class="uw-field-error">{{ errors.defaultEndTime }}</p>
    </div>

    <div class="uw-field">
      <label for="profile-theme">Profiel-thema</label>
      <select id="profile-theme" v-model="form.theme" class="uw-select">
        <option v-for="theme in THEME_OPTIONS" :key="theme.id" :value="theme.id">{{ theme.label }}</option>
      </select>
      <p v-if="errors.theme" class="uw-field-error">{{ errors.theme }}</p>
    </div>

    <div class="uw-row" style="justify-content: flex-end">
      <button type="button" class="uw-button" @click="emit('cancel')">Annuleren</button>
      <button type="submit" class="uw-button uw-button--primary">{{ props.submitLabel }}</button>
    </div>
  </form>
</template>
