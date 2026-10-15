# CSV-formaat van UurWijzer

Dit document beschrijft het CSV-formaat dat UurWijzer gebruikt voor export en
import (`src/services/csv.ts`). Het formaat is vastgelegd zodat bestanden ook
buiten de app bruikbaar zijn en toekomstige versies compatibel blijven.

## Algemene kenmerken

- Eén bestand bevat **alle** profielen met hun weekgegevens en registraties.
- Encoding: **UTF-8 met BOM**.
- Scheidingsteken: `,`.
- Regeleinden: **CRLF** (`\r\n`).
- Quoting volgens **RFC 4180**: velden met `"`, `,`, regeleinden of voor-/nakomende
  spaties worden tussen dubbele aanhalingstekens gezet; aanhalingstekens worden
  verdubbeld (`""`).
- Decimale getallen gebruiken een **punt** (bijvoorbeeld `32.5`).
- Lege rijen worden bij het lezen genegeerd.

## Kolomvolgorde

De header bevat altijd alle kolommen in deze volgorde:

```
record,schema_version,username,profile_id,profile_name,contract_hours,
default_start_time,default_end_time,theme,reminders_enabled,reminder_days,
reminder_time,iso_year,iso_week,week_contract_hours,is_vacation,
registration_id,date,start_time,end_time
```

(De regelafbreking hierboven is alleen ter leesbaarheid; in het bestand staat
de header op één regel.)

Elke rij begint met een `record`-kolom die het rijtype bepaalt. Kolommen die
niet van toepassing zijn op een rijtype blijven leeg.

## Rijtypen

### `meta`

Eén rij met bestandsinformatie.

| Kolom | Betekenis |
| --- | --- |
| `schema_version` | Schema-versie van de export (heel getal > 0) |
| `username` | Gedeelde gebruikersnaam (mag leeg zijn) |

### `profile`

Eén rij per profiel.

| Kolom | Betekenis |
| --- | --- |
| `profile_id` | Unieke id van het profiel (UUID); verplicht |
| `profile_name` | Profielnaam |
| `contract_hours` | Contracturen per week in uren (heel getal of decimaal met punt) |
| `default_start_time` | Standaard starttijd `HH:mm` |
| `default_end_time` | Standaard eindtijd `HH:mm` |
| `theme` | `light`, `dark` of `system` |
| `reminders_enabled` | `true` of `false` |
| `reminder_days` | Herinneringsdagen als ISO-weekdagen gescheiden door `\|` (bijv. `1|3|5`, 1 = maandag) |
| `reminder_time` | Herinneringstijd `HH:mm` |

### `week`

Eén rij per weekrecord (alleen weken met eigen informatie: vakantie of een
weekcontract dat afwijkt van het profielcontract).

| Kolom | Betekenis |
| --- | --- |
| `profile_id` | Id van het bijbehorende profiel; verplicht |
| `iso_year` | ISO-jaar van de week |
| `iso_week` | ISO-weeknummer (1–53) |
| `week_contract_hours` | Vastgelegde contracturen voor die week in uren |
| `is_vacation` | `true` of `false` |

### `registration`

Eén rij per gewerkte registratie.

| Kolom | Betekenis |
| --- | --- |
| `profile_id` | Id van het bijbehorende profiel; verplicht |
| `registration_id` | Unieke id van de registratie (UUID); verplicht |
| `date` | Datum `yyyy-mm-dd` |
| `start_time` | Starttijd `HH:mm` |
| `end_time` | Eindtijd `HH:mm` (moet later zijn dan de starttijd) |

De gewerkte tijd is de verstreken tijd tussen `start_time` en `end_time`.
Pauzetijd wordt niet meer ondersteund (schemaversie 2); de gewerkte tijd is
daarom altijd de volledige tijd tussen start en eind.

## Voorbeeld

```csv
record,schema_version,username,profile_id,profile_name,contract_hours,default_start_time,default_end_time,theme,reminders_enabled,reminder_days,reminder_time,iso_year,iso_week,week_contract_hours,is_vacation,registration_id,date,start_time,end_time
meta,2,Martin,,,,,,,,,,,,,,,,,
profile,,,7f9c1f2e-1a2b-4c3d-8e4f-0123456789ab,Werkgever A,32.5,09:00,17:00,system,true,1|3|5,08:00,,,,,,,,
week,,,7f9c1f2e-1a2b-4c3d-8e4f-0123456789ab,,,,,,,,,2026,2,24,true,,,,
registration,,,7f9c1f2e-1a2b-4c3d-8e4f-0123456789ab,,,,,,,,,,,,,a1b2c3d4-0001-4000-8000-000000000001,2026-01-05,09:00,17:30
```

## Importregels

- Het hele bestand wordt **eerst gevalideerd** vóór toepassen. Bij één fout
  wordt niets gewijzigd en verschijnt een Nederlandse foutmelding (maximaal 25
  fouten getoond, plus een telling van de rest).
- Alle verplichte kolommen moeten aanwezig zijn in de header.
- `schema_version` nieuwer dan de ondersteunde versie → import geweigerd.
- **Profielen:** een profiel met een bestaande `profile_id` wordt overgeslagen
  (met melding), inclusief bijbehorende weken en registraties. Dubbele
  `profile_id`'s binnen het bestand zijn een fout.
- **Registraties:** een registratie met een bestaande `registration_id` wordt
  overgeslagen. Dubbele `registration_id`'s binnen het bestand zijn een fout.
- **Weken:** een week met dezelfde sleutel (`profile_id` + `iso_year` +
  `iso_week`) bestaat al → overslaan. Weken/registraties die bij een onbekend
  profiel horen zijn een fout.
- Onbekende rijtypen worden genegeerd met een waarschuwing (voor toekomstige
  versies).
- Extra kolommen uit oudere versies (`default_break_minutes`, `break_minutes`)
  worden genegeerd. Staan er daadwerkelijk pauzetijden in, dan verschijnt een
  waarschuwing; de gewerkte tijd is dan de volledige tijd tussen start en eind.
- De gebruikersnaam wordt alleen overgenomen als er nog geen naam is ingesteld;
  anders verschijnt een waarschuwing.
- Import is daarmee **idempotent**: hetzelfde bestand nogmaals importeren
  verandert niets.
