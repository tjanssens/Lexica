import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Privacyverklaring</h1>
      </header>

      <article class="content">
        <p class="lead">
          Lexica neemt jouw privacy ernstig. Deze verklaring legt uit welke persoonsgegevens we
          verwerken, waarom, hoe lang, en welke rechten je hebt. Lexica voldoet aan de Europese
          Algemene Verordening Gegevensbescherming (AVG/GDPR) en de Belgische
          Kaderwet Gegevensbescherming.
        </p>

        <section>
          <h2>1. Wie is verantwoordelijk?</h2>
          <p>
            De verwerkingsverantwoordelijke voor Lexica is:
          </p>
          <address>
            <strong>Mil Janssens</strong><br />
            Groeneweg 29<br />
            2920 Kalmthout<br />
            België<br />
            E-mail: <a href="mailto:hallo@miljanssens.be">hallo&#64;miljanssens.be</a>
          </address>
          <p>
            Voor alle vragen of verzoeken in verband met je persoonsgegevens kun je dit
            e-mailadres gebruiken.
          </p>
        </section>

        <section>
          <h2>2. Welke gegevens verwerken we?</h2>
          <p>Lexica verwerkt enkel wat strikt nodig is om de leerapp te laten werken:</p>
          <h3>Account- en identiteitsgegevens</h3>
          <ul>
            <li>E-mailadres</li>
            <li>Wachtwoord (versleuteld opgeslagen — wij kunnen het niet uitlezen)</li>
            <li>Een door jou gekozen weergavenaam (kan een schuilnaam zijn)</li>
            <li>Profielfoto (optioneel)</li>
            <li>Datum waarop je je account aanmaakte</li>
          </ul>

          <h3>Inhoud die je zelf aanmaakt</h3>
          <ul>
            <li>Woorden, vertalingen en woordgroepen die je toevoegt</li>
            <li>Woordensets (privé of openbaar gedeeld)</li>
          </ul>
          <p class="note">
            <strong>Let op:</strong> als je een set publiek deelt, wordt je weergavenaam zichtbaar
            voor andere gebruikers die deze set ontdekken of kopiëren. Wil je niet onder je echte
            naam zichtbaar zijn, kies dan een schuilnaam (de profielpagina heeft een knop om een
            willekeurige Romeinse naam te genereren).
          </p>

          <h3>Leerprogressie en gamificatie</h3>
          <ul>
            <li>Reviewlog per woord (wanneer, in welke richting, of je het wist)</li>
            <li>Statistieken: XP, niveau, dag-streak, laatste sessiedatum</li>
            <li>Voorkeursinstellingen (sessiegrootte, taalkeuze, notificatie-voorkeuren)</li>
          </ul>

          <h3>Notificaties (alleen als je ze aanzet)</h3>
          <ul>
            <li>
              Een push-abonnement van je browser of toestel — een technische sleutel (geen naam of
              e-mailadres) waarmee we je studieherinneringen kunnen bezorgen. Je geeft hier eerst
              uitdrukkelijk toestemming voor en kunt het op elk moment weer uitzetten in je profiel.
            </li>
          </ul>

          <h3>Wat we <em>niet</em> verwerken</h3>
          <ul>
            <li>Geen analytics, geen tracking cookies, geen advertentie-profielen</li>
            <li>Geen biometrische gegevens (profielfoto's worden enkel getoond, niet geanalyseerd)</li>
            <li>Geen bijzondere categorieën (gezondheid, geloof, politieke voorkeur, …)</li>
          </ul>
        </section>

        <section>
          <h2>3. Waarom verwerken we deze gegevens?</h2>
          <table class="purpose-table">
            <thead>
              <tr><th>Doel</th><th>Rechtsgrond (GDPR art. 6)</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Je account aanmaken, beheren en beveiligen</td>
                <td>Uitvoering van de overeenkomst</td>
              </tr>
              <tr>
                <td>Account-gerelateerde communicatie (bv. wachtwoord-reset)</td>
                <td>Uitvoering van de overeenkomst</td>
              </tr>
              <tr>
                <td>Je leerinhoud opslaan en tonen</td>
                <td>Uitvoering van de overeenkomst</td>
              </tr>
              <tr>
                <td>Spaced-repetition aanbieden (SM-2 algoritme)</td>
                <td>Uitvoering van de overeenkomst</td>
              </tr>
              <tr>
                <td>Misbruik en spam tegengaan</td>
                <td>Gerechtvaardigd belang</td>
              </tr>
              <tr>
                <td>Voldoen aan wettelijke verplichtingen (bv. verzoeken van betrokkenen)</td>
                <td>Wettelijke verplichting</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>4. Met wie delen we je gegevens?</h2>
          <p>
            Lexica deelt jouw gegevens met <strong>niemand</strong> voor commerciële doeleinden.
            De volgende technische dienstverleners (verwerkers) komen wel in beeld:
          </p>
          <ul>
            <li>
              <strong>Google (Sign-In, optioneel)</strong> — als je via je Google-account inlogt,
              wisselen we een verificatie-token uit met Google om te bevestigen dat jij het bent.
              Google ontvangt geen verdere informatie over je gebruik van Lexica.
              Niet inloggen via Google? Dan worden je gegevens niet met Google gedeeld.
            </li>
            <li>
              <strong>Hosting:</strong> Lexica draait op een private server in België.
              Je gegevens verlaten de Europese Economische Ruimte niet.
            </li>
            <li>
              <strong>Combell (e-mail):</strong> transactionele e-mails (zoals een
              wachtwoord-reset-link) worden verstuurd via de SMTP-server van Combell NV
              (Skaldenstraat 121, 9042 Gent, België). Combell verwerkt enkel je e-mailadres
              en de inhoud van de e-mail om de mail te bezorgen. Combell is een Belgische
              verwerker; je gegevens verlaten de Europese Economische Ruimte niet.
            </li>
            <li>
              <strong>Push-bezorgdiensten (alleen bij notificaties):</strong> als je push-notificaties
              aanzet, verloopt de bezorging via de push-dienst van je browser — <strong>Google</strong>
              (Chrome/Android), <strong>Mozilla</strong> (Firefox) of <strong>Apple</strong> (Safari).
              Zij ontvangen het versleutelde bericht en de technische sleutel om het op je toestel af te
              leveren, maar geen inhoud van je account. Deze diensten kunnen zich buiten de EER bevinden.
              Zet je notificaties uit, dan wordt niets met hen gedeeld.
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Hoe lang bewaren we je gegevens?</h2>
          <ul>
            <li>
              <strong>Actieve accounts:</strong> zolang je het account gebruikt.
            </li>
            <li>
              <strong>Inactieve accounts:</strong> na 3 jaar zonder login krijg je een
              herinneringsmail. Reageer je niet binnen 30 dagen, dan worden je account en alle
              bijbehorende gegevens definitief verwijderd.
            </li>
            <li>
              <strong>Account-verwijdering:</strong> je kunt je account op elk moment zelf
              verwijderen via je profielpagina (knop "Account verwijderen"). De verwijdering
              gebeurt onmiddellijk. Publieke sets die je hebt gedeeld blijven anoniem behouden
              voor gebruikers die ze al hebben gekopieerd. Lukt het verwijderen via de app niet,
              dan kan dat ook via e-mail aan <a href="mailto:hallo&#64;miljanssens.be">hallo&#64;miljanssens.be</a>;
              we behandelen het verzoek dan binnen 30 dagen.
            </li>
            <li>
              <strong>Reservekopieën:</strong> back-ups worden na maximaal 90 dagen overschreven.
            </li>
          </ul>
        </section>

        <section>
          <h2>6. Welke rechten heb je?</h2>
          <p>Onder de AVG heb je de volgende rechten:</p>
          <ul>
            <li><strong>Inzage</strong> — je mag opvragen welke gegevens we van jou hebben.</li>
            <li><strong>Rectificatie</strong> — onjuiste gegevens corrigeren.</li>
            <li><strong>Verwijdering</strong> ("recht om vergeten te worden") — vragen om al je gegevens te wissen.</li>
            <li><strong>Beperking</strong> — vragen om verwerking tijdelijk te stoppen.</li>
            <li><strong>Overdraagbaarheid</strong> — je kunt al je gegevens in één klik downloaden als JSON-bestand via je profielpagina (knop "Download al mijn gegevens"). Daarnaast biedt de app ook een Excel-export van je woorden.</li>
            <li><strong>Bezwaar</strong> — bezwaar maken tegen verwerking op basis van gerechtvaardigd belang.</li>
            <li><strong>Toestemming intrekken</strong> — indien verwerking op toestemming berust.</li>
          </ul>
          <p>
            Een verzoek indienen kan via
            <a href="mailto:hallo@miljanssens.be">hallo&#64;miljanssens.be</a>.
            We reageren binnen 30 dagen.
          </p>
          <p>
            Ben je niet tevreden met onze reactie? Dan heb je het recht om klacht in te dienen bij
            de Belgische toezichthouder:
          </p>
          <address>
            <strong>Gegevensbeschermingsautoriteit (GBA)</strong><br />
            Drukpersstraat 35, 1000 Brussel<br />
            Tel: +32 (0)2 274 48 00<br />
            <a href="https://www.gegevensbeschermingsautoriteit.be" target="_blank" rel="noopener">www.gegevensbeschermingsautoriteit.be</a>
          </address>
        </section>

        <section>
          <h2>7. Minderjarigen</h2>
          <p>
            Lexica is bedoeld voor het secundair onderwijs en richt zich vooral op leerlingen
            van 12 tot 18 jaar. In België mag je vanaf <strong>13 jaar</strong> zelf toestemming
            geven voor het gebruik van een online dienst.
          </p>
          <p>
            Ben je <strong>jonger dan 13</strong>? Dan moet een ouder of voogd toestemming geven.
            Vraag in dat geval je ouder om het account voor je aan te maken of contact op te
            nemen via <a href="mailto:hallo@miljanssens.be">hallo&#64;miljanssens.be</a>.
          </p>
        </section>

        <section>
          <h2>8. Cookies en opslag in je browser</h2>
          <p>
            Lexica gebruikt <strong>geen tracking cookies</strong> en <strong>geen
            analytics</strong>. Wel slaat de app strikt noodzakelijke informatie op in je
            browser (<code>localStorage</code>):
          </p>
          <ul>
            <li>Een inlog-token (JWT) om je sessie te onthouden, max. 7 dagen geldig</li>
            <li>Je gekozen taalvoorkeur (Latijn, Grieks, Engels of Frans)</li>
          </ul>
          <p>
            Deze opslag is technisch noodzakelijk om de app te laten functioneren en valt onder de
            uitzondering in artikel 129 van de Belgische Wet Elektronische Communicatie. Daarom
            tonen we geen cookiebanner. Je kunt deze opslag altijd zelf wissen via je
            browserinstellingen — dan word je uitgelogd.
          </p>
        </section>

        <section>
          <h2>9. Beveiliging</h2>
          <p>We nemen redelijke technische en organisatorische maatregelen om je gegevens te beschermen:</p>
          <ul>
            <li>Wachtwoorden worden alleen versleuteld (hash) opgeslagen via ASP.NET Identity</li>
            <li>Verkeer tussen jou en de server verloopt over HTTPS (TLS-versleuteling)</li>
            <li>Authenticatie via JWT-tokens met een vervaltermijn van 7 dagen</li>
            <li>De server staat fysiek beveiligd in een private omgeving en is niet toegankelijk voor derden</li>
            <li>Toegang tot de database is beperkt tot strikt noodzakelijk onderhoud</li>
          </ul>
        </section>

        <section>
          <h2>10. Geautomatiseerde besluitvorming</h2>
          <p>
            Lexica neemt <strong>geen geautomatiseerde beslissingen</strong> met juridische of
            vergelijkbare gevolgen voor jou. Het SM-2 spaced-repetition-algoritme bepaalt welk
            woord je opnieuw moet zien, maar dat heeft geen externe impact.
          </p>
        </section>

        <section>
          <h2>11. Wijzigingen aan deze verklaring</h2>
          <p>
            We kunnen deze privacyverklaring bijwerken — bijvoorbeeld bij nieuwe functies of
            wettelijke wijzigingen. Bij belangrijke wijzigingen brengen we je daarvan op de
            hoogte via e-mail of een melding in de app.
          </p>
          <p class="version">
            <strong>Laatste update:</strong> 30 mei 2026<br />
            <strong>Versie:</strong> 1.4<br />
            <span class="version-note">
              Wijzigingen t.o.v. versie 1.3: optionele push-notificaties toegevoegd. We bewaren
              hiervoor een push-abonnement (technische sleutel) en de bezorging verloopt via de
              push-dienst van je browser (Google, Mozilla of Apple). Notificaties zijn opt-in en
              kunnen altijd weer uitgezet worden.
            </span>
          </p>
        </section>

        <p class="back-link">
          <a routerLink="/">← Terug naar Lexica</a>
        </p>
      </article>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f5f5f5; }

    .page-header {
      background: linear-gradient(135deg, #1a1a2e, #0f3460);
      color: white;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .back-btn { color: white; text-decoration: none; font-size: 1.5rem; }
    h1 { flex: 1; font-size: 1.25rem; margin: 0; }

    .content {
      max-width: 760px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      color: #222;
      line-height: 1.6;
    }

    .lead {
      font-size: 1.05rem;
      color: #444;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #f0f0f0;
      margin: 0 0 2rem;
    }

    section { margin: 0 0 2.25rem; }

    h2 {
      font-size: 1.2rem;
      color: #0f3460;
      margin: 0 0 0.8rem;
      padding-bottom: 0.3rem;
      border-bottom: 1px solid #e8e8e8;
    }

    h3 {
      font-size: 0.95rem;
      color: #1a1a2e;
      margin: 1.25rem 0 0.5rem;
    }

    p { margin: 0 0 0.85rem; }

    ul {
      margin: 0 0 0.85rem;
      padding-left: 1.4rem;
    }

    li { margin-bottom: 0.3rem; }

    address {
      font-style: normal;
      background: #f7f8fb;
      border-left: 3px solid #0f3460;
      padding: 0.85rem 1rem;
      margin: 0.5rem 0 1rem;
      border-radius: 0 6px 6px 0;
    }

    a {
      color: #0f3460;
      text-decoration: underline;
    }
    a:hover { color: #1a1a2e; }

    code {
      background: #f0f0f0;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-size: 0.9em;
    }

    .note {
      background: #fff8e1;
      border-left: 3px solid #d4a017;
      padding: 0.7rem 0.9rem;
      border-radius: 0 6px 6px 0;
      font-size: 0.92rem;
    }

    .purpose-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      margin: 0.5rem 0 1rem;
    }
    .purpose-table th,
    .purpose-table td {
      padding: 0.55rem 0.7rem;
      text-align: left;
      border-bottom: 1px solid #ececec;
      vertical-align: top;
    }
    .purpose-table th {
      background: #f7f8fb;
      color: #0f3460;
      font-weight: 600;
    }

    .version {
      color: #666;
      font-size: 0.9rem;
      margin-top: 1rem;
    }

    .version-note {
      display: block;
      margin-top: 0.5rem;
      font-style: italic;
      color: #888;
      font-size: 0.85rem;
    }

    .back-link {
      text-align: center;
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 2px solid #f0f0f0;
    }

    @media (max-width: 600px) {
      .content { padding: 1.25rem 1rem 3rem; }
      h2 { font-size: 1.05rem; }
      .purpose-table { font-size: 0.85rem; }
      .purpose-table th, .purpose-table td { padding: 0.4rem 0.5rem; }
    }
  `]
})
export class PrivacyComponent {}
