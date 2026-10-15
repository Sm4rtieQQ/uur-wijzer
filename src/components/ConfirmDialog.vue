<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  /** Wanneer ingevuld moet de gebruiker deze tekst exact overtypen. */
  requiredText?: string | null
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const typedText = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) typedText.value = ''
  },
)

function canConfirm(): boolean {
  if (!props.requiredText) return true
  return typedText.value === props.requiredText
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('cancel')
}
</script>

<template>
  <div v-if="props.open" class="uw-dialog-backdrop" @click.self="emit('cancel')" @keydown="onKeydown">
    <div class="uw-dialog" role="alertdialog" aria-modal="true" :aria-label="props.title">
      <h2>{{ props.title }}</h2>
      <p>{{ props.message }}</p>

      <div v-if="props.requiredText" class="uw-field">
        <label for="confirm-text">Typ ter bevestiging: {{ props.requiredText }}</label>
        <input id="confirm-text" v-model="typedText" class="uw-input" type="text" autocomplete="off" />
      </div>

      <div class="uw-row" style="justify-content: flex-end">
        <button type="button" class="uw-button" @click="emit('cancel')">Annuleren</button>
        <button
          type="button"
          class="uw-button"
          :class="props.danger ? 'uw-button--danger' : 'uw-button--primary'"
          :disabled="!canConfirm()"
          @click="emit('confirm')"
        >
          {{ props.confirmLabel ?? 'Bevestigen' }}
        </button>
      </div>
    </div>
  </div>
</template>
