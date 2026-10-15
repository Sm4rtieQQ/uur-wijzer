Je bent de implementatie-agent voor UurWijzer. Bouw deze applicatie stapsgewijs op basis van de bestaande projectmap en de specificaties hieronder.

## Verplichte werkwijze

1. Inspecteer eerst de bestaande projectmap en relevante configuratiebestanden om de huidige staat en gebruikte tooling te begrijpen.
2. Maak daarna, vóór je code wijzigt of functionaliteit implementeert, deze twee bestanden:
   - `AGENTS.md`: projectafspraken, architectuurkeuzes, conventies en instructies voor toekomstige agents.
   - `tasks.md`: een geordende en afvinkbare takenlijst voor de implementatie.
3. Werk pas aan de applicatie nadat beide bestanden zijn aangemaakt. Houd `tasks.md` tijdens het werk actueel.
4. Implementeer de applicatie in kleine, controleerbare stappen. Werk niet vooruit aan definitieve vormgeving.
5. Voer passende controles uit, zoals typechecking, tests en een productiebuild. Los fouten op die door jouw wijzigingen ontstaan.
6. Genereer of bouw geen Android-app. De Android-build mag pas worden gemaakt nadat de gebruiker de webversie heeft goedgekeurd.
7. Stop voordat je een definitief visueel ontwerp of uitgebreide styling maakt. Maak eerst een functionele, neutrale webversie die de gebruiker kan beoordelen. Bespreek daarna samen de vormgeving.

## Projectdoel

UurWijzer is een app voor het bijhouden van gewerkte uren door werknemers met onregelmatige werktijden. De gebruiker kan meerdere profielen beheren, bijvoorbeeld voor verschillende werkgevers.

## Technologie

Gebruik waar mogelijk de bestaande projectconfiguratie. De verplichte stack is:

- Vue 3 met Composition API
- TypeScript met `strict` ingeschakeld
- Vite als development- en build-tool
- Vitest als testframework
- Tailwind CSS
- Capacitor, met Android als toekomstig platform
- `localStorage` voor lokale opslag

Gebruik geen onnodige afhankelijkheden. Als een extra package nodig is, leg in `AGENTS.md` of de uiteindelijke samenvatting kort uit waarom. Gebruik Vite voor de webontwikkelserver en productiebuild. Gebruik Vitest voor unit- en componenttests.

## Taal en schrijfconventies

- Code, variabelen, types, componentnamen en technische identifiers: Engels.
- App-interface en gebruikersgerichte foutmeldingen: Nederlands.
- Documentatie, waaronder `AGENTS.md` en `tasks.md`: Nederlands.
- Gebruik leesbare namen, kleine componenten en duidelijke verantwoordelijkheden.
- Houd TypeScript strict: vermijd `any` en los typeproblemen op in plaats van ze te omzeilen.

## Vormgeving

De gebruiker wil de vormgeving later samen met jou ontwikkelen.

- Maak een functionele “blank canvas”: rustige, neutrale basisopmaak, duidelijke inhoudshiërarchie en bruikbare bedieningselementen.
- Voeg geen uitgebreide branding, decoratieve illustraties, definitief kleurenpalet of uitgewerkt visueel ontwerp toe.
- Maak de themakeuze wel functioneel en zorg dat de gekozen waarde wordt opgeslagen. Gebruik hiervoor aanpasbare design tokens of CSS-variabelen, zodat de styling later gemakkelijk kan veranderen.
- Zorg vanaf het begin voor bruikbaarheid op mobiele schermen en toetsenbordbediening. Gebruik semantische HTML en labels voor formulieronderdelen.

## Functionele eisen

### 1. Profielen en eerste gebruik

De app heeft een profielpagina voor profielkeuze, profielbeheer en import.

Toon deze pagina wanneer:

- er geen geldige lokale appdata beschikbaar is;
- de gebruikersnaam ontbreekt;
- er geen profiel beschikbaar is;
- het laatst gebruikte profiel niet meer bestaat of niet kan worden geladen.

De gebruiker kan op de profielpagina:

- de algemene gebruikersnaam invoeren of aanpassen;
- een bestaand profiel kiezen;
- een nieuw profiel aanmaken;
- één of meerdere profielen importeren vanuit CSV.

De naam van de werkgever/het bedrijf is ook de naam van het profiel. Toon profielen daarom herkenbaar, bijvoorbeeld met de bedrijfsnaam.

Bij meerdere profielen kan de gebruiker vanuit de profielkeuze een profiel toevoegen of kiezen. De menuheader toont de gebruikersnaam en de bedrijfsnaam van het actieve profiel. Aanklikken van die header opent de profielkeuze of profielwissel.

### 2. Nieuw profiel

Maak een formulier voor een nieuw profiel met:

- naam van werkgever/bedrijf;
- contracturen per week;
- standaard starttijd;
- standaard eindtijd;
- standaard pauzetijd in minuten;
- app-thema.

Valideer verplichte velden en numerieke/tijdwaarden. Toon Nederlandstalige foutmeldingen bij ongeldige invoer.

### 3. Navigatie

Behalve op de profielpagina en de pagina voor het aanmaken van een profiel staat bovenaan de pagina een menu-knop met drie horizontale lijnen.

Het menu biedt toegang tot:

- Dashboard
- Overzicht
- Instellingen

De schermen Dashboard, Overzicht, Detail en Instellingen werken steeds voor het actieve profiel.

### 4. Dashboard

Toon voor het actieve profiel de huidige ISO-week, van maandag tot en met zondag.

Toon:

- weeknummer en datumbereik;
- contracturen voor deze week;
- een compacte weergave van het urensaldo van het huidige ISO-weekjaar;
- een mogelijkheid om de week als vakantie te markeren;
- een knop om een registratie toe te voegen;
- de dagen van de week.

Als de week minstens één registratie bevat, toon ook:

- het totaal aantal gewerkte uren met de tekst “Je hebt <tijd> gewerkt!”;
- zeven dagvakjes met een korte Nederlandse dagaanduiding en het totaal aantal gewerkte uren per dag;
- laat een dag met nul geregistreerde uren leeg.

Oude weken zijn bereikbaar via Overzicht; het dashboard toont standaard alleen de huidige week.

### 5. Registraties toevoegen en bewerken

Een registratie bevat:

- datum;
- starttijd;
- eindtijd;
- pauzetijd in minuten.

Bij een nieuwe registratie:

- is de standaarddatum vandaag;
- worden de standaard starttijd, eindtijd en pauzetijd overgenomen uit het actieve profiel;
- zijn meerdere registraties per dag toegestaan.

Validatie:

- de datum mag niet in de toekomst liggen;
- de starttijd mag niet later zijn dan de eindtijd;
- de pauzetijd mag niet langer zijn dan de verstreken tijd tussen start en eind;
- ongeldige of ontbrekende waarden mogen niet worden opgeslagen.

Een eindtijd vóór de starttijd is ongeldig. Ondersteun in deze versie geen diensten die over middernacht lopen; toon daarvoor een begrijpelijke Nederlandse foutmelding.

De gebruiker kan een bestaande registratie aanpassen of verwijderen. Vraag bevestiging voordat een registratie wordt verwijderd.

Bij het wijzigen of verwijderen van een registratie moeten totalen, dagsommen, weektotalen en saldo’s direct opnieuw worden berekend. Als een registratie naar een andere datum wordt verplaatst, moeten zowel de oorspronkelijke als de nieuwe week correct worden bijgewerkt.

Bereken gewerkte tijd als verstreken tijd tussen begin en einde minus pauze. Bewaar tijden en duur intern op een betrouwbare, eenduidige manier. Toon gewerkte tijd in de interface als bijvoorbeeld `7u 30m`.

### 6. Weekcontract en vakantie

Contracturen worden per week vastgelegd.

- Wanneer een nieuwe ISO-week begint, krijgt die week de actuele contracturen van het profiel.
- Een wijziging van contracturen in het profiel geldt alleen voor toekomstige weken. Historische weken blijven ongewijzigd.
- Contracturen kunnen afzonderlijk worden aangepast op de detailpagina van een week.
- Een als vakantie gemarkeerde week heeft nul contracturen. Er mag in die week nog steeds worden gewerkt.
- Houd de vakantiestatus als weekgegeven bij, zodat deze zichtbaar blijft in Dashboard, Overzicht en Detail.

Voorkom dat een wijziging aan het profiel per ongeluk historische weekcontracten overschrijft. Zorg dat het uitschakelen van de vakantiemarkering geen onverwacht of onbedoeld contracturenverlies veroorzaakt; documenteer de gekozen logica in `AGENTS.md`.

### 7. Overzicht per jaar

Het overzicht toont weken voor het actieve profiel.

- Standaard opent het huidige ISO-weekjaar.
- Laat eerdere ISO-weekjaren met gegevens via een keuzelijst selecteren.
- Toon geen toekomstige weken.
- Toon weken vanaf de eerste registratie in het geselecteerde jaar tot en met de laatste relevante week van dat jaar. Neem lege tussenliggende weken op.
- Sorteer weken van nieuw naar oud.
- Gebruik ISO 8601 voor weeknummers en weekgrenzen. Houd rekening met het verschil tussen kalenderjaar en ISO-weekjaar.

Een weekcontainer met registraties toont:

- vakantiestatus, alleen als de week vakantie is;
- weeknummer;
- begindatum en einddatum;
- contracturen;
- gewerkte uren;
- saldo (`gewerkte uren − contracturen`);
- zeven dagvakjes met de dagsommen; nuluren blijven leeg.

Een weekcontainer zonder registraties toont alleen:

- vakantiestatus als de week vakantie is, anders een aanduiding dat de week leeg is;
- weeknummer;
- begindatum en einddatum.

Aanklikken van een week opent de detailpagina van die week.

### 8. Detailpagina van een week

Toon:

- weeknummer en datumbereik;
- contracturen, bewerkbaar;
- gewerkte uren;
- urensaldo (`gewerkte uren − contracturen`);
- zeven dagvakjes met dagsommen;
- de registraties van de week, chronologisch van oudste naar nieuwste;
- de vakantiestatus en een bediening om die te wijzigen.

De gebruiker kan registraties vanaf deze pagina openen om ze aan te passen of te verwijderen. Na elke wijziging moeten de getoonde totalen direct worden bijgewerkt.

### 9. Instellingen

Toon instellingen voor de algemene app en het actieve profiel.

Algemeen:

- gebruikersnaam, gedeeld door de app en alle profielen.

Per profiel:

- werkgever-/profielnaam;
- contracturen per week;
- standaard starttijd;
- standaard eindtijd;
- standaard pauzetijd;
- herinneringen aan/uit;
- herinneringsdagen (maandag tot en met zondag);
- herinneringstijd;
- app-thema.

Wijzigingen aan de profielcontracturen gelden alleen voor toekomstige weken. Bestaande weekcontracten blijven behouden.

### 10. Herinneringen

De gebruiker kan herinneringen instellen:

- aan of uit;
- op één of meer weekdagen;
- op een gekozen tijd.

Stuur alleen een herinnering op een ingestelde dag wanneer er voor die dag nog geen registratie is gedaan.

In een week die als vakantie is gemarkeerd, zijn herinneringen uitgeschakeld. Stuur of plan in die week geen herinneringen, ook niet als herinneringen voor het profiel aanstaan. Wanneer een week als vakantie wordt gemarkeerd, annuleer of onderdruk dan eventuele herinneringen voor die week. Wanneer de vakantiemarkering wordt verwijderd, mogen herinneringen weer volgens de profielinstellingen gelden.

Implementeer meldingen passend bij de huidige webprojectomgeving en Capacitor-configuratie. Vraag waar nodig toestemming en behandel geweigerde of niet-beschikbare meldingen netjes. Voeg geen Android-build of Android-specifieke eindoplevering toe. Als betrouwbare planning van meldingen niet mogelijk is in de huidige webomgeving, leg de beperking duidelijk vast en bouw de instellingen zo dat de functionaliteit later kan worden aangesloten.

### 11. CSV-import en export

CSV-import/export is onderdeel van de app. De gebruiker laat de precieze CSV-indeling en importregels aan jou over; kies daarom zelf een robuust, begrijpelijk formaat en documenteer de keuzes.

Eisen:

- exporteer alle profielen en bijbehorende gegevens naar één CSV-bestand;
- ondersteun het importeren van profielen en registraties uit dat bestand;
- houd profielen en hun registraties ondubbelzinnig van elkaar gescheiden;
- voorkom dat een ongeldige import bestaande data gedeeltelijk overschrijft;
- valideer inhoud en toon begrijpelijke fouten;
- behandel dubbele profielen/registraties op een voorspelbare manier;
- maak een export die ook na toekomstige wijzigingen zo goed mogelijk te importeren blijft.

Documenteer de gekozen kolommen, identificatie van profielen, encoding, scheidingsteken, versiebeheer en het gedrag bij dubbele gegevens in `AGENTS.md` of een passende projectdocumentatie.

### 12. Profiel verwijderen

In Instellingen kan de gebruiker het actieve profiel verwijderen.

- Toon eerst een bevestigingsdialoog.
- De gebruiker moet exact de profielnaam overtypen om de verwijdering te bevestigen.
- Verwijder ook de registraties en weekgegevens die bij dat profiel horen.
- Verwijder geen andere profielen of de algemene gebruikersnaam.
- Als het actieve profiel wordt verwijderd, navigeer dan naar profielkeuze. Als er nog profielen bestaan, mag de gebruiker er een kiezen.

### 13. Opslag en opstartgedrag

Bewaar appstatus lokaal met `localStorage`.

Sla minimaal op:

- algemene gebruikersnaam;
- profielen en profielinstellingen;
- registraties;
- weekgegevens, waaronder vakantie en weekcontracturen;
- laatst geopende profiel-ID;
- relevante data- of schemaversie.

De app opent op het dashboard van het laatst gebruikte profiel als die data geldig is. Anders opent de app op de profielpagina.

Behandel ontbrekende, ongeldige of oudere opgeslagen data zonder crash. Gebruik waar nodig datavalidatie en migraties. Laat fouten niet stilzwijgend leiden tot verlies van bestaande data.

Houd berekende totalen bij voorkeur afleidbaar uit de opgeslagen brongegevens, zodat dubbele of verouderde totalen worden voorkomen.

### 14. Eenheden en weergave

- Datums: toon als `d-m-jjjj`.
- Tijden: 24-uursnotatie `HH:mm`.
- Weken: ISO 8601.
- Gewerkte uren: leesbare notatie zoals `7u 30m`.
- Saldo’s: toon duidelijk of het saldo positief of negatief is.

Maak de formaterings- en datumlogica herbruikbaar en testbaar. Laat ISO-weekberekeningen niet afhangen van een naïeve kalenderjaar-/weeknummeraanname.

## Kwaliteit en tests

Schrijf tests voor ten minste:

- berekening van gewerkte tijd en pauzes;
- validatie van registratie-invoer;
- meerdere registraties op dezelfde dag;
- ISO-weekgrenzen en jaarwisseling;
- weektotalen en dagsommen;
- vakantie en saldo;
- contracturen die per week worden vastgelegd;
- wijzigingen aan registraties die weken beïnvloeden;
- CSV-export/import en foutafhandeling;
- ontbrekende of ongeldige opgeslagen data.
- herinneringen worden niet verstuurd of gepland voor een vakantieweek;
- het markeren van een week als vakantie annuleert of onderdrukt relevante herinneringen;
- het verwijderen van de vakantiemarkering laat herinneringen weer de profielinstellingen volgen;

Gebruik de test- en buildcommando’s die bij de bestaande repository passen. Voeg waar nodig passende scripts toe en documenteer ze.

## Verwachte volgorde van oplevering

1. Inspecteer de repository.
2. Maak `AGENTS.md` en `tasks.md`; nog geen applicatiecode wijzigen vóór die twee bestanden bestaan.
3. Implementeer de datamodellen, opslaglaag, datum-/tijd-/weekberekeningen en tests.
4. Implementeer profielen en eerste-gebruik-flow.
5. Implementeer registraties, Dashboard, Overzicht en Detail.
6. Implementeer Instellingen, vakantie, herinneringen en profielverwijderen.
7. Implementeer CSV-import/export en documenteer het formaat.
8. Voeg de neutrale, functionele interface toe en controleer de mobiele bruikbaarheid.
9. Voer typecheck, tests en webbuild uit. Los fouten op. Gebruik Vite en Vitest
10. Stop zonder Android-build en zonder definitieve visuele styling. Rapporteer dat de functionele webversie klaarstaat voor beoordeling.

## Afrondingsrapport

Geef aan het einde een beknopte maar concrete samenvatting met:

- wat is geïmplementeerd;
- welke projectbestanden zijn toegevoegd of belangrijk gewijzigd;
- welke tests, typechecks en builds zijn uitgevoerd en of ze slaagden;
- gemaakte aannames of keuzes die de gebruiker moet beoordelen;
- bekende beperkingen, vooral rond meldingen en CSV;
- bevestiging dat geen Android-build is gemaakt en dat definitieve styling nog niet is uitgevoerd.
