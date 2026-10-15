# Takenlijst UurWijzer

Geordende, afvinkbare takenlijst. Houd deze tijdens het werk actueel.

## Fase 0 — Voorbereiding

- [x] Inspecteer projectmap en tooling
- [x] Maak `AGENTS.md`
- [x] Maak `tasks.md`

## Fase 1 — Projectopzet

- [x] Scaffolding: package.json, Vite, TypeScript (strict), Vitest, Tailwind
- [x] Capacitor-voorbereiding (config + dependency, geen Android-build)
- [x] Basisprojectstructuur (domain/storage/services/state/components/pages)
- [x] Controleer dat dev-server, tests en build draaien (lege staat)

## Fase 2 — Datamodellen, opslag, datum/tijd/week + tests

- [x] `domain/types.ts` — AppData, Profile, Registration, WeekRecord
- [x] `domain/date.ts` — ISO-datumstrings, opmaak d-m-jjjj, validatie
- [x] `domain/time.ts` — duurberekeningen, opmaak `7u 30m`, validatie
- [x] `domain/isoWeek.ts` — ISO 8601 weeknummer, weekgrenzen, weekjaar
- [x] `domain/validation.ts` — validatie registratie- en profielinvoer
- [x] `domain/weeks.ts` — dagsommen, weektotalen, saldo, contracturen per week
- [x] `storage/` — localStorage laden, valideren, migreren, opslaan
- [x] Tests voor al het bovenstaande

## Fase 3 — Profielen en eerste-gebruik-flow

- [x] State-module (reactieve appstate + persistente mutaties)
- [x] Router/navigatiestate (eigen lichte oplossing)
- [x] Profielpagina: gebruikersnaam, profielkeuze, nieuw profiel, CSV-import
- [x] Nieuw-profielformulier met validatie (NL foutmeldingen)
- [x] App-header met menuknop en profielwissel

## Fase 4 — Registraties, Dashboard, Overzicht, Detail

- [x] Registratieformulier (toevoegen/bewerken/verwijderen met bevestiging)
- [x] Dashboard: huidige ISO-week, saldo jaartotaal, vakantie, dagvakjes
- [x] Overzicht: ISO-weekjaren, keuzelijst, weken nieuw→oud, lege weken
- [x] Detailpagina: contracturen bewerkbaar, totalen, registraties, vakantie

## Fase 5 — Instellingen, vakantie, herinneringen, profielverwijderen

- [x] Instellingen: algemeen (gebruikersnaam) + per profiel
- [x] Contracturenprofiel wijzigen → alleen toekomstige weken
- [x] Herinneringen: instellingen, `shouldSendReminder`, scheduler, Notification API
- [x] Vakantie onderdrukt/herstelt herinneringen (tests)
- [x] Profiel verwijderen met exacte naambevestiging

## Fase 6 — CSV-import/export

- [x] Export alle profielen → één CSV (UTF-8 BOM, `,`, RFC 4180)
- [x] Import met volledige validatie vóór toepassen (atomair)
- [x] Dubbelgedrag: overslaan met melding; idempotente import
- [x] Formaat gedocumenteerd in `AGENTS.md` en `docs/CSV-FORMAAT.md`
- [x] Tests export/import en foutafhandeling

## Fase 7 — Interface (neutraal) en mobiele bruikbaarheid

- [x] Neutrale basisopmaak met design tokens (thema light/dark/system)
- [x] Semantische HTML, labels, toetsenbordbediening
- [x] Mobielvriendelijke layout controleren (max-breedte + responsief grid)

## Fase 8 — Controles en afronding

- [x] Typecheck (`npm run typecheck`) zonder fouten
- [x] Alle tests groen (`npm run test`)
- [x] Productiebuild (`npm run build`) slaagt
- [x] Afrondingsrapport schrijven; **geen** Android-build, geen definitieve styling

## Fase 9 — Pauzetijd verwijderen

- [x] Datamodel: `defaultBreakMinutes` en `breakMinutes` uit `Profile`/`Registration`
- [x] `schemaVersion` verhoogd naar 2 met migratie die de oude velden negeert
- [x] `domain/`: duurberekening, validatie en tests aangepast (gewerkte tijd = verstreken tijd)
- [x] `state/`, `components/`, `pages/`: pauze-velden uit formulieren en weergave
- [x] CSV: kolommen `break_minutes`/`default_break_minutes` vervallen; legacy-import met waarschuwing
- [x] Documentatie bijgewerkt (`AGENTS.md`, `docs/CSV-FORMAAT.md`)
- [x] Typecheck, tests (203) en productiebuild groen
