<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ACCENT_COLOR_OPTIONS } from '../domain/defaults'
import { validateProfileInput, type ValidatedProfile } from '../domain/validation'

const props = defineProps<{
  initialName: string
  initialContractHours: string
  initialStartTime: string
  initialEndTime: string
  initialAccentColor: string
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
  accentColor: props.initialAccentColor,
})

const errors = ref<Partial<Record<string, string>>>({})

function onSubmit(): void {
  const result = validateProfileInput({
    name: form.name,
    contractHours: form.contractHours,
    defaultStartTime: form.defaultStartTime,
    defaultEndTime: form.defaultEndTime,
    accentColor: form.accentColor,
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
  <form class="uw-stack" name="profileForm" id="profileForm" novalidate @submit.prevent="onSubmit">
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

    <fieldset class="uw-field" name="accentColor" id="accentColor" style="border: 0; padding: 0; margin: 0">
      <legend class="uw-legend">Accentkleur</legend>
      <div class="uw-swatches">
        <label v-for="option in ACCENT_COLOR_OPTIONS" :key="option.value" class="uw-swatch">
          <input
            :id="`profile-accent-${option.value.slice(1)}`"
            v-model="form.accentColor"
            class="uw-swatch-input"
            type="radio"
            name="profile-accent"
            :value="option.value"
            :aria-label="option.label"
          />
          <span
            class="uw-swatch-dot"
            :style="{ backgroundColor: option.value, '--uw-swatch-color': option.value }"
            aria-hidden="true"
          ></span>
        </label>
      </div>
      <p v-if="errors.accentColor" class="uw-field-error">{{ errors.accentColor }}</p>
    </fieldset>

    <div class="uw-row" style="justify-content: flex-end">
      <button type="button" class="uw-button" @click="emit('cancel')">Annuleren</button>
      <button type="submit" class="uw-button uw-button--primary">{{ props.submitLabel }}</button>
    </div>
  </form>
</template>
