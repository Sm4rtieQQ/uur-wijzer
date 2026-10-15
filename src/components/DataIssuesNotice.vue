<script setup lang="ts">
defineProps<{
  issues: string[]
}>()

const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div class="uw-page" role="status">
    <div class="uw-alert uw-alert--info uw-stack">
      <strong>Let op bij het laden van je gegevens</strong>
      <ul class="uw-stack" style="margin: 0; padding-left: 1.25rem">
        <li v-for="issue in issues" :key="issue">{{ issue }}</li>
      </ul>
      <div>
        <button type="button" class="uw-button uw-button--plain" @click="emit('dismiss')">Melding sluiten</button>
      </div>
    </div>
  </div>
</template>
