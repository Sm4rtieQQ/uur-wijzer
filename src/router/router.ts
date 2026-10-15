import { ref, type Ref } from 'vue'
import type { AppStore } from '../state/appStore'

/** Alle schermen van de app. */
export type Route =
  | { name: 'profiles' }
  | { name: 'new-profile' }
  | { name: 'dashboard' }
  | { name: 'overview' }
  | { name: 'week-detail'; isoYear: number; isoWeek: number }
  | { name: 'settings' }

export type RouteName = Route['name']

/** Schermen die een actief profiel vereisen. */
const PROFILE_ROUTES: RouteName[] = ['dashboard', 'overview', 'week-detail', 'settings']

/** Huidige route (lichte eigen navigatie, geen router-dependency). */
export const currentRoute: Ref<Route> = ref({ name: 'dashboard' })

/** Navigeert naar een scherm; valt terug op profielkeuze zonder actief profiel. */
export function navigate(route: Route): void {
  currentRoute.value = route
}

/** Bepaalt het startscherm op basis van de beschikbare gegevens. */
export function resolveStartRoute(store: AppStore): Route {
  if (!hasUsableProfile(store)) {
    return { name: 'profiles' }
  }
  return { name: 'dashboard' }
}

/** Is er een gebruikersnaam én een geldig actief profiel? */
export function hasUsableProfile(store: AppStore): boolean {
  return store.state.data.username.trim() !== '' && store.activeProfile.value !== null
}

/** Vereist een scherm een actief profiel? */
export function routeRequiresProfile(route: Route): boolean {
  return PROFILE_ROUTES.includes(route.name)
}

/** Volgt de actieve route en zorgt dat profielschermen niet zonder profiel openen. */
export function guardRoute(store: AppStore): void {
  if (routeRequiresProfile(currentRoute.value) && !hasUsableProfile(store)) {
    navigate({ name: 'profiles' })
  }
}
