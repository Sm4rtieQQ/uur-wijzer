<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../state/appStore'
import { navigate } from '../router/router'
import { minutesToHours } from '../domain/time'
import BannerDial from '../components/BannerDial.vue'

const store = useAppStore()
const notice = ref('')

const username = computed(() => store.state.data.username.trim())
const usernameDraft = ref(store.state.data.username)
const profiles = computed(() =>
  [...store.state.data.profiles].sort((a, b) =>
    b.contractMinutes - a.contractMinutes || a.name.localeCompare(b.name, 'nl'),
  ),
)

function saveUsername(): void {
  store.setUsername(usernameDraft.value)
  notice.value = usernameDraft.value.trim() === '' ? 'Vul een gebruikersnaam in.' : 'Gebruikersnaam opgeslagen.'
}

function chooseProfile(profileId: string): void {
  store.selectProfile(profileId)
  navigate({ name: 'dashboard' })
}
</script>

<template>
  <header class="uw-profile-banner" name="profilesHeader" id="profilesHeader">
    <BannerDial />
    <h1>UurWijzer</h1>
  </header>

  <div class="uw-page" name="profilesPage" id="profilesPage">
    <!-- Zolang er geen gebruikersnaam is, is invullen het enige dat hier kan. -->
    <section v-if="username === ''" class="uw-card" name="usernameSetup" id="usernameSetup">
      <form class="uw-stack" name="usernameForm" id="usernameForm" novalidate @submit.prevent="saveUsername">
        <div class="uw-field">
          <label for="username">Gebruikersnaam</label>
          <input id="username" v-model="usernameDraft" class="uw-input" type="text" autocomplete="name" />
        </div>
        <div class="uw-row">
          <button type="submit" class="uw-button uw-button--primary">Opslaan</button>
        </div>
        <p v-if="notice" class="uw-meta" role="status">{{ notice }}</p>
      </form>
    </section>

    <h2 v-else>Hallo, {{ username }}!</h2>

    <section class="uw-card" name="profileList" id="profileList">
      <h2 class="uw-profile-select-label">Selecteer een profiel</h2>
      <p v-if="profiles.length === 0" class="uw-meta">Er zijn nog geen profielen.</p>
      <ul v-else class="uw-list" style="list-style: none; margin: 0; padding: 0">
        <li
          v-for="profile in profiles"
          :key="profile.id"
          :name="`profile-${profile.id}`"
          :id="`profile-${profile.id}`"
        >
          <button type="button" class="uw-button uw-list-item" @click="chooseProfile(profile.id)">
            <span class="uw-stack" style="gap: 0">
              <strong>{{ profile.name }}</strong>
              <span class="uw-meta">{{ minutesToHours(profile.contractMinutes) }}u per week</span>
              <span class="uw-meta">{{ profile.defaultStartTime }}–{{ profile.defaultEndTime }}</span>
            </span>
          </button>
        </li>
      </ul>

      <div class="uw-row" style="justify-content: flex-start">
        <button type="button" class="uw-button uw-button--primary" @click="navigate({ name: 'new-profile' })">
          Nieuw profiel
        </button>
      </div>
    </section>
  </div>
</template>
