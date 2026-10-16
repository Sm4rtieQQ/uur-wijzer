# AGENTS.md — UurWijzer

Projectafspraken, architectuurkeuzes en instructies voor (toekomstige) agents.

## Doel

UurWijzer is een app voor het bijhouden van gewerkte uren door werknemers met
onregelmatige werktijden. De gebruiker beheert meerdere profielen (bijv. voor
verschillende werkgevers). Alle gegevens blijven lokaal op het apparaat.

## Stack en tooling

- Vue 3 met Composition API (`<script setup lang="ts">`)
- TypeScript met `strict: true`
- Vite (dev-server en productiebuild)
- Vitest (unit- en componenttests)
- Tailwind CSS v4 (via `@tailwindcss/vite`-plugin)
- Capacitor: alleen voorbereid (config + dependency); **geen Android-build**
  zolang de webversie niet is goedgekeurd
- `localStorage` voor lokale opslag

Bewust geen extra dependencies (geen vue-router, geen Pinia, geen date-library):
de app is klein genoeg voor een eigen navigatiestate en eigen datum-/weeklogica.
ISO-weekberekeningen zijn zelf geïmplementeerd en getest conform ISO 8601.

## Taal- en schrijfconventies

- Code, variabelen, types, componentnamen, bestandsnamen: **Engels**.
- App-interface, gebruikersgerichte foutmeldingen: **Nederlands**.
- Documentatie (`AGENTS.md`, `tasks.md`): **Nederlands**.
- Geen `any`; los typeproblemen op in plaats van ze te omzeilen.
- Kleine componenten, duidelijke verantwoordelijkheden, leesbare namen.

## Architectuur

```
src/
  domain/        Pure bedrijfslogica, zonder Vue-afhankelijkheid (goed testbaar)
    types.ts     Datamodellen (AppData, Profile, Registration, WeekRecord, ...)
    time.ts      Tijdopslag, duurberekeningen, opmaak (7u 30m), validatie
    date.ts      ISO-datumstrings (yyyy-mm-dd), parsing, opmaak (d-m-jjjj)
    isoWeek.ts   ISO 8601-weekberekeningen (weeknummer, weekgrenzen, weekjaar)
    validation.ts Validatie van registratie- en profielinvoer
    weeks.ts     Dagsommen, weektotalen, saldo's, contracturen per week
  storage/       localStorage-laag: laden, valideren, migreren, opslaan
  services/      CSV-export/import, herinneringslogica (puren `shouldSendReminder`)
  state/         Reactieve appstate (Vue), mutaties + persistente opslag
  components/    Kleine, herbruikbare componenten
  pages/         Paginaschermen
  router/        Lichte eigen navigatiestate (geen vue-router)
```

Regels:

- `domain/` en `services/` bevatten geen Vue-imports; alle logica is unit-testbaar.
- Totalen (dagsommen, weektotalen, saldo's) worden **altijd afgeleid** uit
  brongegevens (registraties + weekrecords), nooit apart opgeslagen.
- Mutaties gaan via de state-module, die na elke mutatie naar `localStorage`
  schrijft.

## Datamodel en opslag

`AppData` (sleutel `uurwijzer:data`, versie via `schemaVersion`):

- `username`: gedeelde gebruikersnaam (optioneel tot ingevuld)
- `theme`: app-breed thema (`light` | `dark` | `system`, standaard `system`)
- `profiles[]`: profielinstellingen incl. accentkleur en herinneringen
- `registrations[]`: registraties (datum, start, eind)
- `weeks[]`: weekgegevens per profiel per ISO-week (contracturen, vakantie,
  ziekte-uren)
- `lastProfileId`: laatst geopende profiel-ID
- `schemaVersion`: voor migraties

Eenheden intern:

- Datum: ISO-string `yyyy-mm-dd`
- Tijd: 24-uursstring `HH:mm`
- Duur/gewerkte tijd: **hele minuten**
- Contracturen: hele **minuten** intern (invoer in uren, bv. 32,5 → 1920)
- Ziekte-uren: hele **minuten** intern (invoer in uren, bv. 7,5 → 450)

Per profiel geldt een **accentkleur** (`Profile.accentColor`, hex uit de vaste
set in `domain/defaults.ts`); het **thema** is app-breed en staat in
`AppData.theme`.

### Laadgedrag

Bij laden wordt de opgeslagen JSON gevalideerd. Onjuiste of ontbrekende data
wordt defensief behandeld (defaults, overslaan van kapotte records) zonder
crash. Onleesbare data wordt **niet** stil overschreven: de oude waarde blijft
staan totdat een succesvolle opslag volgt.

### Pauzetijd is bewust verwijderd (schemaversie 2)

De app kent **geen pauzetijd** meer. Gewerkte tijd is de verstreken tijd
tussen start en eind; er is geen aftrekpauze. `Profile` heeft geen
`defaultBreakMinutes` en `Registration` geen `breakMinutes`.

Bij het migreren van versie 1 naar 2 worden die twee velden bij het lezen
genegeerd (de parsers bouwen nieuwe objecten en nemen ze dus niet over).
CSV-rijen uit versie 1 met een `break_minutes`- of
`default_break_minutes`-kolom worden geaccepteerd, de pauzetijden worden
genegeerd en er verschijnt een waarschuwing.

**Pauze niet opnieuw toevoegen** zonder expliciet akkoord van de gebruiker.

### Migratie 2 → 3 (app-thema, accentkleur, ziekte-uren)

De actieve schemaversie is **3**. Bij het lezen van versie-2-gegevens:

- `Profile.theme` bestaat niet meer: het veld wordt genegeerd (de parsers bouwen
  nieuwe objecten en nemen het niet over). `AppData.theme` valt terug op
  `system`.
- `Profile.accentColor` krijgt `DEFAULT_ACCENT_COLOR` als het ontbreekt of
  ongeldig is.
- `WeekRecord.sickMinutes` wordt 0 als het ontbreekt.

Oudere CSV-exportbestanden blijven importeerbaar (zie `docs/CSV-FORMAAT.md`).

## Registraties en overlap

- Binnen één profiel mogen registraties elkaar op dezelfde dag **niet
  overlappen**. Tijden die elkaar exact raken (10:00–15:00 en 15:00–16:00)
  mogen wel.
- De controle zit in `domain/validation.ts` (`findOverlappingRegistration`,
  gebruikt door `validateRegistrationInput` met de bestaande registraties van
  het profiel en, bij het wijzigen, het id van de registratie zelf).
- Het registratieformulier toont een Nederlandse melding en blokkeert opslaan;
  de CSV-import weigert overlappende rijen met een regelmelding (alles-of-niets).

## Weekcontract- en vakantielogica (belangrijk)

- Een weekrecord wordt **lazy aangemaakt** bij eerste toegang tot die week
  (dashboard/detail/overzicht/berekening), met de *op dat moment* geldende
  contracturen van het profiel. Zo geldt een wijziging van profielcontracturen
  alleen voor weken die nog niet vastgelegd zijn (toekomstige weken).
- Historische weekrecords worden **nooit** overschreven door profielwijzigingen.
- Vakantie is een **losse boolean** (`isVacation`) naast `contractMinutes`.
  Activeren zet effectief contract op 0, maar het opgeslagen `contractMinutes`
  blijft bewaard. Uitschakelen herstelt daarmee het eerdere contract zonder
  verlies. Ná uitschakelen wordt het opgeslagen bedrag opnieuw vastgelegd.
- Een vakantieweek mag nog steeds registraties bevatten; gewerkte tijd telt
  dan volledig als saldo (contract is 0).

## Ziekte-uren

- Ziekte wordt per **week** vastgelegd op het weekrecord (`WeekRecord.sickMinutes`,
  hele minuten; invoer in uren). Er is geen koppeling met een dag of datum.
- Het weeksaldo is `gewerkt + ziekte − contract` en telt zo mee in het
  jaarsaldo. Ziekte-uren zijn geen gewerkte tijd, maar tellen wel mee als
  gecompenseerde uren.
- Een vakantieweek mag ziekte-uren bevatten; het effectieve contract is dan 0,
  dus tellen die uren volledig mee in het saldo.
- Invoer gaat via een dialoog op het dashboard en de weekdetailpagina
  (`components/SicknessFormDialog.vue`); 0 uren betekent "geen ziekte".

## Herinneringen (beperking webomgeving)

- Instellingen (aan/uit, dagen ma–zo, tijd) worden volledig per profiel
  opgeslagen en gevalideerd.
- Verzending gebeurt via de Notification API zolang de app geopend is: een
  periodieke controle (en controle bij focus/wijziging) kijkt of het nu de
  ingestelde tijd is op een ingestelde dag, of er die dag nog geen registratie
  bestaat en of de week geen vakantie is. Zo niet → melding; zo wel → niets.
- **Beperking:** een echte achtergrondplanning (ook als de app gesloten is) is
  niet betrouwbaar mogelijk in een gewone webomgeving; daar is een service
  worker + Android-notificatieplanning voor nodig (Capacitor/Android-build).
  De logica zit achter een zuivere functie (`shouldSendReminder`) en een
  scheduler-interface, zodat latere Android-planning hierop kan worden
  aangesloten.
- Toestemming wordt gevraagd bij het inschakelen van herinneringen. Geweigerde
  of niet-beschikbare meldingen worden netjes afgehandeld (instelling blijft
  bewaard, melding in de UI).

## CSV-formaat (import/export)

- Eén bestand met **alle** profielen; UTF-8 met BOM; scheidingsteken `,`;
  RFC 4180-quoting; CRLF-regelafsluiting.
- Elke rij heeft een `record`-kolom met een van:
  `meta`, `profile`, `week`, `registration`.
- `meta` bevat `schemaVersion` en het app-thema (`theme`).
- `profile` bevat id, naam, contracturen, standaardtijden, accentkleur en
  herinneringsinstellingen.
- `week` bevat profiel-id, ISO-jaar, ISO-week, contracturen, vakantiestatus en
  ziekte-uren.
- `registration` bevat id, profiel-id, datum, start, eind.
- **Identificatie:** profielen via `profile_id` (UUID), registraties via hun
  eigen `id`. De export bevat de interne id's zodat import ondubbelzinnig is.
- **Validatie:** het hele bestand wordt eerst gevalideerd vóór toepassen. Bij
  één fout wordt niets gewijzigd en verschijnt een Nederlandse foutmelding.
- **Dubbele gegevens:** profielen met een bestaande id worden **overgeslagen**
  (met melding); registraties waarvan (id) al bestaat worden overgeslagen.
  Nieuwe profielen worden toegevoegd inclusief hun weken en registraties.
  Zo is import idempotent en voorspelbaar.
- **Schemaversie 3:** nieuwe kolommen `accent_color` (profielrij),
  `sick_hours` (weekrij) en `theme` in de meta-rij zijn bij import
  **optioneel** (ontbreken → `DEFAULT_ACCENT_COLOR`, 0 uren, bestaand thema),
  zodat bestanden van vóór versie 3 blijven werken. Een gevulde `theme`-kolom
  op profielrijen (v2) wordt genegeerd met een waarschuwing. Overlappende
  registraties binnen één profiel zijn een importfout. Zie
  `docs/CSV-FORMAAT.md`.

## Vormgeving

- Functionele "blank canvas": rustige neutrale basisopmaak, geen branding of
  decoratief ontwerp.
- Thema is **app-breed** (`light` | `dark` | `system`, standaard `system`),
  ingesteld onder Instellingen → Algemeen en opgeslagen in `AppData.theme`;
  toegepast via `data-theme` + CSS-variabelen (design tokens in
  `src/styles/tokens.css`). Per profiel is er een **accentkleur**
  (`Profile.accentColor`, vaste set), toegepast via `--uw-accent`, een afgeleide
  `--uw-accent-ink` voor leesbare tekst en `--uw-accent-soft` (accent gemengd met
  wit) voor decor op de accentkleur. Alle drie worden per profiel gezet in
  `state/useTheme.ts`. Definitieve vormgeving volgt later samen met de gebruiker.
- **Header/banner:** de app-header is de "banner". De achtergrond is de
  accentkleur van het actieve profiel; rechtsonder staat het klokdecor
  (`--uw-accent-soft`). Dat decor is `.uw-banner-dial` in `AppHeader.vue`: een
  inline-SVG met de uitsnede van het voorbeeld, verankerd op de rechteronderhoek
  (`preserveAspectRatio="xMaxYMax meet"`) en zo hoog als de header, zodat de
  uitsnede tegen de rechter- en onderrand afloopt. Het decor is puur decoratief
  (`aria-hidden`) en ligt achter de inhoud.
- Semantische HTML, labels bij formulieronderdelen, mobielvriendelijke layout
  en toetsenbordbediening vanaf het begin.
- **Containers met identificatie:** betekenisvolle containers (secties, kaarten,
  header, lade, formulierblokken, dialoogcontainers) krijgen `name` én `id` met
  **dezelfde** waarde, in camelCase, bijv.
  `name="weekBalance" id="weekBalance"`. Terugkerende lijstitems krijgen een
  unieke id met context, bijv. `week-2026-41`, `registration-<id>` of
  `profile-<id>`; `name` volgt exact dezelfde waarde. Nooit `id="app"`: dat is
  het mount-punt in `index.html`.

## Scripts

- `npm run dev` — Vite dev-server
- `npm run build` — typecheck (`vue-tsc -b`) + productiebuild
- `npm run test` — Vitest (unit + component)
- `npm run test:coverage` — Vitest met dekking
- `npm run typecheck` — alleen typecheck

## Afspraken voor toekomstige agents

- Wijzig `domain/`-logica altijd samen met bijbehorende tests.
- Voeg bij wijziging van het opslagformaat een migratie in `storage/` toe en
  verhoog `schemaVersion`.
- Geen Android-build of platformspecifieke eindoplevering zolang de
  webversie niet is goedgekeurd.
- Definitieve visuele styling gebeurt pas samen met de gebruiker.
