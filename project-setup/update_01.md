# update_01
Maak een tasks_01.md voor het volgende.
Waar nodig moet AGENTS.md gewijzigd worden.
Vraag me als iets niet duidelijk is.

## Algemeen
De containers van de applicatie krijgen een passende 'name' en 'id', bijvoorbeeld de container met het jaarsaldo op het dashboard: name="saldoThisYear" id="saldoThisYear"
Profiel-thema wordt app-thema. Deze wordt global en is niet meer gekoppeld aan een profiel. De standaard waarde is 'systeem'. De gebruiker kan dit wijzigen in instellingen onder het kopje 'algemeen'. De keuze valt nog steeds tussen 'licht', 'donker' en 'systeem'.
De accentkleur van de applicatie moet per profiel aangepast kunnen worden, dus wordt toegevoegd aan het profile form.

## Header
Titel van profiel moet groter
Menu knop moet kleiner, ca. 0.75x wat het nu is. Gebruik wel logische waardes.

## Menu lade
Onder de nav buttons, komt een 'Terug' knop die de lade weer sluit. De gap tussen 'Instellingen' en 'Terug' moet groter zijn dan de gap tussen de andere knoppen.

## Ziekte registreren
De gebruiker moet kunnen registreren dat hij ziek is geweest.
Saldo uren wordt dan: <saldo> = <contract> - <gewerkt> - <ziekte>
Voorbeeld:
- De gebruiker heeft deze week al 8 uur gewerkt, dus nog een saldo van -12 uur.
- De gebruiker heeft een contract van 20 uur.
- De gebruiker registreert 8 ziek uren.
- De gebruiker heeft nog steeds 8 uur gewerkt, maar heeft nu een saldo van -4 uur.

Ziekte uren worden per week bijgehouden

## UI
### Dashboard
De container met de 'Uren volgens contract' en 'Saldo' krijgt een toevoeging:
<contract><waarde>
<ziekte><waarde> (alleen zichtbaar als ziekte een waarde heeft, v-if)
<saldo><waarde>

De container met de knoppen 'uren registreren' en 'weekdetails,' wordt aangepast:
<uren registreren> (primary button)
<weekdetails><ziekte registreren> (beide knoppen dezelfde breedte)
stretch over gehele breedte van de container

### Overzicht
Week containers krijgen een badge 'Ziek' wanneer er ziekte is geregistreerd in de week.
Datum tekst in week container moet kleiner, het neemt teveel ruimte