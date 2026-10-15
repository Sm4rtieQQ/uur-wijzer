maak een prompt voor een code agent die deze app gaat maken

# UurWijzer

## Doel

Bijhouden van gewerkte uren voor werknemers die onregelmatige werktijden hebben.

## Functies

### Profiel

De gebruiker kan:

- De naam van de gebruiker aanpassen (verplicht wanneer deze niet is gevonden)
- Een nieuw profiel aanmaken, navigeert naar 'nieuw profiel pagina'
- Een profiel kiezen, indien aanwezig
- Een profiel/profielen importeren vanuit een CSV bestand.

### Nieuw profiel

Setup pagina voor een nieuw profiel
formulier voor gebruiker:

- Naam van werkgever/bedrijf -> dit is ook de naam van het profiel
- Uren volgens contract
- Standaard starttijd
- Standaard eindtijd
- Standaard hoeveelheid pauzetijd (in minuten)
- App thema

### Menu knop

Bovenin elke pagina (behalve de profiel pagina, en profiel aanmaken pagina) staat een menu knop, weergegeven met 3 horizontale streepjes, waarmee de gebruiker naar de verschillende pagina's kan navigeren.
Boven in de menu view staat de naam van de gebruiker, met een eyebrow met de naam van de werkgever. Als de gebruiker hierop klikt kan hij zijn profiel wisselen of er één toevoegen.
Pagina's in de menuknop zijn:

- Dashboard
- Overzicht
- Instellingen

### Dashboard (per profiel)

'+' knop voor het toevoegen van een nieuwe registratie.

Overzicht van de week, maandag tot zondag:

- klein: uren saldo jaartotaal
- alleen huidige week is zichtbaar
- dagen van de week zijn zichtbaar
- aantal uren volgens contract
- markeer week als vakantie: deze week telt 0 contracturen. er kan nog steeds gewerkt worden.

Wanneer de week ten minste één registratie heeft, komt erbij:

- aantal gewerkte uren (ingevuld door gebruiker)
  - weergave: "Je hebt <tijd> gewerkt!"
- rij met 7 vakjes, één voor elke dag. kleine notatie (ma, di, wo) en het aantal gewerkte uren die dag. 0 uur is een leeg vakje.

Oude weken zijn alleen zichtbaar vanuit het overzicht.

### Nieuwe registratie

Gebruiker vult in:

- datum (standaard vandaag)
- starttijd (standaard volgens profiel)
- eindtijd (standaard volgens profiel)
- pauzetijd (standaard volgens profiel)

foutmeldingen:
datum mag niet in de toekomst zijn
starttijd mag niet later zijn dan eindtijd
pauzetijd mag niet langer zijn dan gewerkte tijd

### Overzicht (per profiel, per jaar)

Overzicht van alle weken, gesorteerd op weeknummer, nieuwste bovenaan.
Opent standaard huidig jaar.
Verleden jaren (als deze bestaan / registraties hebben) kunnen via een drop-down menu worden bereikt.
Toekomstige weken worden niet getoond.
Weken worden getoont vanaf de eerste registratie van dat jaar.
Jaarfilter op ISO weekjaren
Elke week een eigen container met daarin:

- vakantie (als gemarkeerd als vakantie, anders niet tonen)
- weeknummer
- begindatum van de week
- einddatum van de week
- uren volgens contract
- gewerkte uren
- saldo van de week (gewerkt minus contracturen)
- een rij met 7 vakjes, waarin het aantal gewerkte uren per dag vermeldt kan worden. 0 uur is leeg
  Klikken op de container navigeert de gebruiker naar een detail pagina van die week.

Lege (verleden weken) van jaren waar wel uren zijn geregistreerd worden vereenvoudigd weergegeven:

- vakantie (als gemarkeerd als vakantie, anders niet tonen)
- leeg (als niet gemarkeerd als vakantie, anders niet tonen)
- weeknummer
- begindatum van de week
- einddatum van de week

### Detail pagina

Detail pagina van de week

- weeknummer
- contracturen (bewerkbaar)
- gewerkte uren
- urensaldo
- een rij met 7 vakjes, waarin het aantal gewerkte uren per dag vermeldt kan worden. 0 uur is leeg
- lijst van registraties, chronologisch gesorteerd, oudste bovenaan. gebruiker kan erop klikken om hem aan te passen, of verwijderen (met bevestiging)
- markeer week als vakantie

### Instellingen

- Naam van gebruiker (gehele applicatie)
- Naam van werkgever/bedrijf (per profiel)
- Uren volgens contract (uren per week, bijvoorbeel 32 uur)(per profiel)
- Standaard starttijd (per profiel)
- Standaard eindtijd (per profiel)
- Standaar pauzetijd (per profiel)
- Herinnering aan/uit (stuur melding als er nog geen registratie is gedaan op ingestelde dagen)(per profiel)
- Herinnering dagen (ma, di, wo, ...)(per profiel)
- Herinnering tijd (per profiel)
- App thema (kleuren aanpassen)(per profiel)

- Exporteren naar CSV: alle profielen opslaan in één CSV bestand. Duidelijke scheiding tussen profielen. Deze moeten op de profiel pagina weer kunnen worden geïmporteerd.

- Profiel verwijderen. Toont popup ter bevestiging. Gebruiker moet naam van het profiel overtypen om deze te kunnen verwijderen. Gegevens zoals registraties die bij dit profiel horen worden uit de storage verwijderd.

## Taal

- Code: Engels
- Documentatie: Nederlands
- App UI: Nederlands

## Tech

### Stack

- vue 3, composition api
- typescript, strict
- tailwind css
- capacitor
- android

### Units

- datum: d-m-jjjj
- tijd: HH:mm
- week: volgens ISO 8601
- gewerkte uren: (voorbeeld: 7u 30m)

### Persistence

state wordt in localstorage opgeslagen
state moet als csv geëxporteerd en geïmporteerd kunnen worden voor back-ups en herstel

## Stijl

Wordt later geïmplementeerd. Maak een 'blank canvas' die makkelijk aan te passen is. De agent en ik gaan stapsgewijs de applicatie vormgeven

## Overig

Applicatie opent op het dashboard van laatst geopende profiel. Als dat faalt, profiel-selectie pagina.

Gebruiker mag meerdere registraties per dag doen.
Als starttijd later is dan eindtijd: foutmelding (geen negatieve uren invullen)

Contracturen worden per week opgeslagen wanneer een nieuwe week start. Wanneer de contracturen wijzigen in het profiel geldt dit us alleen voor toekomstige weken, oude weken worden niet aangepast. De contracturen kunnen gewijzigd worden op de detail pagina van de week.

'Vakantie' zet de week op 0 contract uren.

Android build wordt pas gegenereerd op het moment dat de webversie van de applicatie door mij is goedgekeurd, de stijlen worden eerst samen met mij gebouwd.
