<script setup lang="ts">
import { ref } from 'vue'
import ProfileForm from '../components/ProfileForm.vue'
import { useAppStore } from '../state/appStore'
import { navigate } from '../router/router'
import { DEFAULT_ACCENT_COLOR, DEFAULT_CONTRACT_HOURS, DEFAULT_END_TIME, DEFAULT_START_TIME } from '../domain/defaults'
import { importFromCsv, type CsvImportSummary } from '../services/csv'
import { readFileAsText } from '../services/fileTransfer'
import type { ValidatedProfile } from '../domain/validation'

const store = useAppStore()

const importErrors = ref<string[]>([])
const importSummary = ref<CsvImportSummary | null>(null)
const importNotice = ref('')
const importFileName = ref('')

function createProfile(profile: ValidatedProfile): void {
  store.createProfile(profile)
  navigate({ name: 'dashboard' })
}

async function importFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  importErrors.value = []
  importSummary.value = null
  importNotice.value = ''
  if (!file) return

  importFileName.value = file.name
  let text: string
  try {
    text = await readFileAsText(file)
  } catch {
    importErrors.value = ['Het bestand kon niet worden gelezen.']
    input.value = ''
    return
  }

  const result = importFromCsv(text, store.state.data)
  input.value = ''

  if (!result.ok) {
    importErrors.value = result.errors
    return
  }

  store.replaceData(result.data)
  importSummary.value = result.summary
  importNotice.value = 'Import voltooid.'
}
</script>

<template>
  <div class="uw-page" name="newProfilePage" id="newProfilePage">
    <header class="uw-stack" name="newProfileHeader" id="newProfileHeader">
      <h1>Nieuw profiel</h1>
      <p class="uw-meta">Vul de gegevens van de werkgever in. Je kunt ze later aanpassen in de instellingen.</p>
    </header>

    <section class="uw-card" name="newProfileForm" id="newProfileForm">
      <ProfileForm
        :initial-name="''"
        :initial-contract-hours="String(DEFAULT_CONTRACT_HOURS)"
        :initial-start-time="DEFAULT_START_TIME"
        :initial-end-time="DEFAULT_END_TIME"
        :initial-accent-color="DEFAULT_ACCENT_COLOR"
        submit-label="Profiel aanmaken"
        @submit="createProfile"
        @cancel="navigate({ name: 'profiles' })"
      />
    </section>

    <section class="uw-card" name="profileImport" id="profileImport">
      <h2>Profiel importeren</h2>
      <p class="uw-meta">Kies een exportbestand van UurWijzer. Bestaande profielen worden overgeslagen.</p>
      <div class="uw-field">
        <label for="import-file">CSV-bestand</label>
        <input id="import-file" class="uw-input" type="file" accept=".csv,text/csv" @change="importFile" />
      </div>

      <div v-if="importErrors.length > 0" class="uw-alert uw-alert--error uw-stack" role="alert">
        <strong>Het bestand is niet geïmporteerd{{ importFileName ? ` (${importFileName})` : '' }}.</strong>
        <ul class="uw-stack" style="margin: 0; padding-left: 1.25rem">
          <li v-for="error in importErrors" :key="error">{{ error }}</li>
        </ul>
      </div>

      <div v-if="importSummary" class="uw-alert uw-alert--info uw-stack" role="status">
        <strong>{{ importNotice }}</strong>
        <p v-if="importSummary.importedProfiles.length > 0">
          Toegevoegd: {{ importSummary.importedProfiles.join(', ') }}.
        </p>
        <p v-if="importSummary.skippedProfiles.length > 0">
          Overgeslagen (bestaat al): {{ importSummary.skippedProfiles.join(', ') }}.
        </p>
        <p>
          Registraties: {{ importSummary.importedRegistrations }} toegevoegd,
          {{ importSummary.skippedRegistrations }} overgeslagen. Weekgegevens:
          {{ importSummary.importedWeeks }} toegevoegd, {{ importSummary.skippedWeeks }} overgeslagen.
        </p>
        <ul v-if="importSummary.warnings.length > 0" class="uw-stack" style="margin: 0; padding-left: 1.25rem">
          <li v-for="warning in importSummary.warnings" :key="warning">{{ warning }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>
