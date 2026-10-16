# Takenlijst UurWijzer — update 01

Geordende, afvinkbare takenlijst voor update 01 (ziekte-uren, app-thema,
accentkleur, container-identificatie, header/menu/dashboard/overzicht).
Houd deze tijdens het werk actueel.

Afspraken uit overleg:

- Accentkleur: vaste set kleuren (swatches) in het profielformulier, per profiel.
- De gekozen accentkleur geldt in **beide** thema's; alleen de tekstkleur op de
  accent-achtergrond (`accent-ink`) wordt automatisch licht/donker bepaald op
  basis van de helderheid van de gekozen kleur.
- Ziekte: uren per week (op het `WeekRecord`), te registreren via een dialoog
  vanaf het dashboard. `saldo = gewerkt + ziekte − contract`; ziekte telt ook
  mee in het jaarsaldo.
- Nieuwe gegevens (ziekte-uren, accentkleur, app-thema) gaan mee in de
  CSV-export/import met schemaversie 3; oude exportbestanden blijven importeerbaar.

## Fase 1 — Datamodel, migratie en domeinlogica

- [x] `domain/types.ts`:
  - `AppData.theme: ThemeId` (app-thema, gedeeld door alle profielen)
  - `Profile.theme` vervalt; `Profile.accentColor: string` (hex, uit vaste set)
  - `WeekRecord.sickMinutes: number` (hele minuten, standaard 0)
  - `SCHEMA_VERSION` verhogen naar 3
- [x] `domain/defaults.ts`: `DEFAULT_THEME = 'system'`; nieuwe
  `ACCENT_COLOR_OPTIONS` (id + hex + Nederlands label) en `DEFAULT_ACCENT_COLOR`
- [x] `storage/parseStoredData.ts`: parser voor `accentColor` en `sickMinutes`
  (defensief met defaults) + migratie 2 → 3:
  - `AppData.theme` wordt gelezen (fallback `system`); `Profile.theme` wordt
    bij het lezen genegeerd (nieuwe objecten bouwen neemt het veld niet over)
  - testen voor migratie en defaults
- [x] `domain/weeks.ts`: `WeekSummary` krijgt `sickMinutes`;
  `balanceMinutes = workedMinutes + sickMinutes − contractMinutes`;
  tests aanpassen + nieuwe tests (met ziekte, vakantie, combinatie)
- [x] `domain/validation.ts`:
  - `validateProfileInput`: `theme` → `accentColor` (geldig hex uit de vaste set)
  - nieuwe `validateSickHours` (uren > 0, max 168 uur, komma/punt, NL foutmelding)
  - tests bijwerken
- [x] `state/appStore.ts`:
  - `ProfileChanges`/`NewProfileData`: `accentColor` i.p.v. `theme`
  - nieuwe actie `setWeekSick(profileId, ref, sickMinutes)` (opslaan + persist)
  - nieuwe actie `setTheme(theme: ThemeId)` voor het app-thema
  - `ensureWeek`: `sickMinutes: 0` bij aanmaken
  - tests bijwerken + nieuwe tests

## Fase 2 — App-thema en accentkleur toepassen

- [x] `state/useTheme.ts` + `App.vue`: thema komt uit
  `store.state.data.theme` (app-breed, standaard `system`); `data-theme` op
  `<html>` blijft zoals nu; watcher op actieve profiel verwijderen
- [x] Accentkleur toepassen via design tokens (`src/styles/tokens.css`):
  zet `--uw-accent` en `--uw-accent-ink` (helderheidsbepaling, bv. YIQ/relative
  luminance) op basis van het actieve profiel; donker-thema-override van
  `--uw-accent` vervalt
- [x] `components/ProfileForm.vue`: thema-select vervangen door accentkleur-keuze
  (radiogroep met zichtbare swatches + toegankelijke labels)
- [x] `pages/SettingsPage.vue`: thema-kiezer toevoegen onder kopje "Algemeen"
  (opties Licht / Donker / Systeem, standaard Systeem), opslaan via `setTheme`
- [x] `pages/NewProfilePage.vue`: initialisatie met `DEFAULT_ACCENT_COLOR`
- [x] Componenttests bijwerken (`ProfilePage.spec.ts`, `SettingsPage.spec.ts`,
  `AppHeader.spec.ts` etc.)

## Fase 3 — Ziekte registreren

- [x] Nieuw component `components/SicknessFormDialog.vue` (patroon van
  `RegistrationFormDialog.vue`): uren invoer (decimaal, komma/punt), validatie
  via `validateSickHours`, wijzigen van bestaande waarde, 0 = verwijderen,
  annuleren, Escape/sluitgedrag
- [x] `pages/DashboardPage.vue`: knop "Ziekte registreren" opent de dialoog voor
  de huidige week; opslaan via `store.setWeekSick`
- [x] `pages/WeekDetailPage.vue`: ziekte-uren tonen en bewerken (consistentie
  met weekcontract; dezelfde dialoog hergebruiken)
- [x] Tests: dialog component + koppeling dashboard

## Fase 4 — Header en menu-lade

- [x] `components/AppHeader.vue`: profielnaam groter (logische
  typografie-schaal/geen losse magische px); menuknop ca. 0,75× de huidige maat
  met logische waarden (hergebruik bestaande tokens/`rem`)
- [x] `components/MenuDrawer.vue`: "Terug"-knop onder de nav-buttons die de lade
  sluit (`emit('close')`); grotere gap tussen "Instellingen" en "Terug" dan de
  gap tussen de nav-buttons; `aria` blijft correct
- [x] Tests `AppHeader.spec.ts`, `MenuDrawer.spec.ts` bijwerken (Terug-knop sluit lade)

## Fase 5 — Dashboard

- [x] Kaart "Uren volgens contract"/"Saldo" uitbreiden:
  - `contract` → waarde
  - `ziekte` → waarde, alleen zichtbaar bij `v-if` wanneer ziekte > 0
  - `saldo` → waarde (inclusief ziekte)
- [x] Knoppenkaart aanpassen:
  - "Uren registreren" als primary button, volle breedte
  - rij "Weekdetails" + "Ziekte registreren", beide knoppen dezelfde breedte
    (bijv. `flex: 1`), rij gespreid over de volle breedte van de container
- [x] `DashboardPage.spec.ts` bijwerken + tests voor ziekterij en knoppen

## Fase 6 — Overzicht

- [x] `pages/OverviewPage.vue`:
  - badge "Ziek" in de weekcontainer wanneer `week.sickMinutes > 0`
    (rangorde badges: Vakantie / Ziek / Leeg)
  - datumtekst kleiner (bestaande meta-kleinmaat of stijl toevoegen)
- [x] `OverviewPage.spec.ts` bijwerken + test voor Ziek-badge

## Fase 7 — name/id op containers (hele app)

- [x] Conventie vastleggen (kort in `AGENTS.md`): betekenisvolle containers
  (secties, kaarten, header, lade, formulierblokken) krijgen `name` én `id`
  met dezelfde waarde, in camelCase, bijv. `name="saldoThisYear" id="saldoThisYear"`
- [x] Toepassen op alle pagina's en components: Dashboard, Overzicht,
  Weekdetail, Instellingen, Profiel, Nieuw profiel, AppHeader, MenuDrawer,
  dialogs (bv. `weekBalance`, `yearBalance`, `weekContract`, `sickness`,
  `registrationDialog`, `menuDrawer`, …)
- [x] Terugkerende lijstitems (bv. weekcontainers, registratie-items) krijgen
  een **unieke** id met context, bijv. `week-2026-41`, `registration-<id>`
  (name volgt dezelfde waarde)

## Fase 8 — CSV schemaversie 3

- [x] `services/csv.ts`:
  - nieuwe kolommen: `accent_color` (profile-rij), `sick_hours` (week-rij),
    `theme` in de meta-rij (app-thema)
  - export: weken exporteren bij vakantie, afwijkend contract **of** ziekte-uren
  - import: nieuwe kolommen zijn **optioneel** (ontbrekend →
    `DEFAULT_ACCENT_COLOR`, `system`, 0 uren), zodat oudere exportbestanden
    blijven werken zonder fout
  - legacy `theme`-kolom op profiel-rijen negeren met waarschuwing
  - validatie ziekte-uren via dezelfde regels als `validateSickHours`
- [x] `docs/CSV-FORMAAT.md` bijwerken
- [x] `csv.spec.ts` bijwerken + tests: export met ziekte/accent/thema, import
  van een versie-2-bestand zonder nieuwe kolommen

## Fase 9 — Controles en documentatie

- [x] `AGENTS.md` bijwerken (zie lijst hieronder)
- [x] `npm run typecheck` zonder fouten
- [x] `npm run test` groen (alle bestaande suites bijgewerkt)
- [x] `npm run build` slaagt

## AGENTS.md — vereiste wijzigingen

- [x] **Datamodel:** `AppData.theme` (app-thema, standaard `system`);
  `Profile.accentColor` in plaats van `Profile.theme`;
  `WeekRecord.sickMinutes`; `schemaVersion` 3
- [x] **Sectie "Vormgeving":** thema is app-breed (instellingen → Algemeen),
  niet meer per profiel; accentkleur is per profiel en toegepast via
  `--uw-accent`/`--uw-accent-ink`
- [x] **Nieuwe sectie "Ziekte-uren":** per week vastgelegd op het weekrecord;
  saldo = gewerkt + ziekte − contract (telt mee in jaarsaldo); geen
  dag- of datumkoppeling
- [x] **CSV-formaat:** nieuwe kolommen `accent_color`, `sick_hours`, `theme`
  (meta), kolom `theme` op profiel-rijen vervalt; oude bestanden importeerbaar
- [x] **Migratie:** 2 → 3 beschreven (profiel-thema genegeerd, ziekte 0,
  accentkleur default)
- [x] **Nieuwe afspraak:** betekenisvolle containers krijgen een passend
  `name`- en `id`-attribuut (gelijke waarde, camelCase; unieke id bij
  terugkerende lijstitems)

## Fase 10 — Overlappende registraties voorkomen (aanvulling)

- [x] `domain/validation.ts`: overlapdetectie in `validateRegistrationInput`
  via context (`existingRegistrations` van hetzelfde profiel +
  `excludeRegistrationId` bij wijzigen); een tijdvak dat een bestaande
  registratie op dezelfde dag overlapt is ongeldig, aansluitende tijden
  (15:00–16:00 na 10:00–15:00) mogen wel
- [x] `components/RegistrationFormDialog.vue`: bestaande registraties van het
  profiel meegeven; Nederlandse melding tonen bij overlap (opslaan geblokkeerd,
  dialoog blijft open)
- [x] `services/csv.ts`: import weigert overlappende registraties binnen één
  profiel (bestaand + nieuw in hetzelfde bestand) met een Nederlandse
  regelmelding; hele bestand blijft alles-of-niets
- [x] Tests: `validation.spec.ts` (overlap, aansluitend, andere dag, wijzigen
  sluit zichzelf uit), `DashboardPage.spec.ts` + `WeekDetailPage.spec.ts`
  (melding bij opslaan), `csv.spec.ts` (importfout bij overlap)
- [x] `AGENTS.md`: regel vastleggen (geen overlappende registraties per profiel)
