import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Gebruiksvoorwaarden</h1>
      </header>

      <article class="content">
        <p class="lead">
          Welkom bij Lexica. Deze gebruiksvoorwaarden regelen het gebruik van de Lexica-leerapp.
          Door een account aan te maken of de app te gebruiken, ga je akkoord met deze
          voorwaarden. Lees ze rustig door — ze zijn opgesteld in eenvoudig Nederlands.
        </p>

        <section>
          <h2>1. Wie is Lexica?</h2>
          <p>Lexica is een leerapp voor Latijnse en Griekse woordenschat, aangeboden door:</p>
          <address>
            <strong>Mil Janssens</strong><br />
            Groeneweg 29<br />
            2920 Kalmthout<br />
            België<br />
            E-mail: <a href="mailto:hallo&#64;miljanssens.be">hallo&#64;miljanssens.be</a>
          </address>
          <p>
            In deze voorwaarden noemen we Mil Janssens "wij", "ons" of "Lexica". Jij, de
            gebruiker, ben "jij" of "de gebruiker".
          </p>
        </section>

        <section>
          <h2>2. Definities</h2>
          <ul>
            <li><strong>Lexica / De Dienst:</strong> de web-applicatie voor het leren van Latijnse en Griekse vocabulaire, beschikbaar via deze website.</li>
            <li><strong>Account:</strong> jouw persoonlijke profiel waarmee je gebruik kunt maken van Lexica.</li>
            <li><strong>Inhoud:</strong> woorden, vertalingen, groepen, sets en alle andere informatie die door gebruikers wordt toegevoegd.</li>
            <li><strong>Publieke Set:</strong> een verzameling woorden die je als gebruiker uitdrukkelijk hebt gedeeld zodat andere gebruikers ze kunnen ontdekken en kopiëren.</li>
          </ul>
        </section>

        <section>
          <h2>3. De Dienst</h2>
          <p>
            Lexica biedt een spaced-repetition-leerapp aan voor klassieke talen. Je kunt eigen
            woorden invoeren, ze in groepen en sets ordenen, leersessies starten en je
            voortgang opvolgen. De app bevat ook een ontdekfunctie waarmee je publieke sets van
            andere gebruikers kunt kopiëren.
          </p>
          <p>
            <strong>Lexica is en blijft volledig gratis</strong> voor het beschreven gebruik. Er
            zijn geen advertenties, geen verkoop van gegevens, en geen abonnementen.
          </p>
        </section>

        <section>
          <h2>4. Account en registratie</h2>
          <ul>
            <li>Je moet minstens <strong>13 jaar</strong> zijn om zelf een account aan te maken. Ben je jonger? Vraag dan een ouder of voogd om dat voor jou te doen.</li>
            <li>Je geeft een correct e-mailadres op en houdt je inloggegevens geheim. Misbruik vanuit jouw account valt onder jouw verantwoordelijkheid.</li>
            <li>Eén account per persoon. Misbruik (meerdere accounts om regels te omzeilen, accounts voor anderen, ...) is verboden.</li>
            <li>Je weergavenaam mag geen aanstootgevende, lasterlijke of misleidende inhoud bevatten. Een schuilnaam mag, een nepidentiteit van een bestaand persoon niet.</li>
          </ul>
        </section>

        <section>
          <h2>5. Aanvaardbaar gebruik</h2>
          <p>Bij het gebruik van Lexica is het verboden om:</p>
          <ul>
            <li>De dienst te gebruiken voor illegale doeleinden of in strijd met goede zeden;</li>
            <li>Inhoud toe te voegen die rechten van derden schendt (auteursrechten, privacy, eer en goede naam);</li>
            <li>Inhoud te plaatsen die aanzet tot haat, geweld, discriminatie, of die schadelijk is voor minderjarigen;</li>
            <li>De dienst geautomatiseerd te bevragen (scrapers, bots) zonder voorafgaande toestemming;</li>
            <li>De beveiliging van Lexica te omzeilen of te testen zonder toestemming;</li>
            <li>Malware, virussen of schadelijke code te uploaden of te verspreiden;</li>
            <li>Andere gebruikers lastig te vallen of te bedreigen, ook niet via publieke sets of weergavenamen;</li>
            <li>De dienst te gebruiken om examenfraude te plegen of leerkrachten/medeleerlingen te misleiden.</li>
          </ul>
          <p>
            Wij behouden ons het recht voor om inhoud of accounts die deze regels overtreden te
            verwijderen of te schorsen (zie artikel 11).
          </p>
        </section>

        <section>
          <h2>6. Jouw inhoud</h2>
          <p>
            <strong>Je blijft eigenaar van de woorden, vertalingen, groepen en sets die je
            invoert.</strong> Lexica claimt geen eigendom op jouw inhoud.
          </p>
          <p>
            Om de dienst technisch te kunnen aanbieden, verleen je ons een beperkte,
            niet-exclusieve, gratis licentie om jouw inhoud op te slaan, te tonen aan jou, en
            te verwerken voor het functioneren van de app (back-ups, zoekfunctie, statistieken
            voor jouw account, ...). Deze licentie eindigt automatisch wanneer jouw account
            wordt verwijderd, behalve voor publieke sets (zie artikel 7) en voor reservekopieën
            die binnen 90 dagen overschreven worden.
          </p>
          <p>
            Je verklaart dat de inhoud die je toevoegt door jou zelf is opgesteld, dan wel dat
            je over de nodige rechten beschikt om die inhoud op Lexica te plaatsen.
          </p>
        </section>

        <section>
          <h2>7. Publieke sets en delen</h2>
          <p>
            Wanneer je een set <strong>uitdrukkelijk publiek deelt</strong> via de
            ontdek-functie, gebeurt het volgende:
          </p>
          <ul>
            <li>Andere geregistreerde gebruikers kunnen de set ontdekken, bekijken, en een eigen kopie ("fork") maken die ze vervolgens kunnen aanpassen voor persoonlijk gebruik.</li>
            <li>Je weergavenaam wordt zichtbaar bij de set en op gekopieerde sets als oorspronkelijke auteur (<code>OriginalAuthorDisplayName</code>). Wil je niet met je echte naam zichtbaar zijn? Stel dan een schuilnaam in op je profielpagina.</li>
            <li>Je verleent andere gebruikers een <strong>niet-exclusieve, niet-overdraagbare, gratis licentie</strong> om de set te kopiëren en voor eigen leer-doeleinden aan te passen binnen Lexica. Deze licentie is niet herroepbaar voor kopieën die al gemaakt zijn op het moment dat je de set unpubliceert of verwijdert.</li>
            <li>Lexica zelf verkrijgt geen verdere rechten op publieke sets buiten wat nodig is om ze technisch beschikbaar te maken.</li>
          </ul>
          <p>
            Je kunt een publieke set op elk moment terug privé maken of verwijderen. Bestaande
            kopieën bij andere gebruikers blijven dan bij hen — die zijn ondertussen hun
            eigendom geworden.
          </p>
        </section>

        <section>
          <h2>8. Intellectuele eigendom van Lexica</h2>
          <p>
            Het ontwerp, de broncode, de huisstijl, de naam "Lexica", het algoritme voor
            spaced repetition (de implementatie ervan) en alle andere elementen van de dienst
            die niet door gebruikers zijn toegevoegd, blijven eigendom van Mil Janssens.
          </p>
          <p>
            Je krijgt een persoonlijk, niet-overdraagbaar gebruiksrecht op de dienst zolang je
            account bestaat. Dit recht geeft je geen toestemming om de app of delen ervan te
            kopiëren, te reverse-engineeren, of commercieel te exploiteren.
          </p>
        </section>

        <section>
          <h2>9. Beschikbaarheid van de dienst</h2>
          <p>
            We doen ons best om Lexica zo continu mogelijk beschikbaar te houden, maar we
            geven <strong>geen garantie van ononderbroken beschikbaarheid</strong>. Onderhoud,
            technische problemen, stroomonderbrekingen of overmacht kunnen tijdelijke
            onderbrekingen veroorzaken. Lexica draait op een private server in België.
          </p>
          <p>
            We mogen functies wijzigen, toevoegen of verwijderen om de app te verbeteren of te
            onderhouden. Bij belangrijke wijzigingen die jouw gebruik raken, brengen we je daar
            redelijk op tijd van op de hoogte.
          </p>
        </section>

        <section>
          <h2>10. Aansprakelijkheid</h2>
          <p>
            Lexica is een gratis hulpmiddel voor zelfstudie. We bieden de dienst aan
            <strong>"zoals ze is"</strong> ("as-is"), zonder garanties:
          </p>
          <ul>
            <li>We <strong>garanderen niet</strong> dat alle vertalingen, woordsoorten of voorbeelden correct zijn — vooral niet voor inhoud die door gebruikers wordt toegevoegd. Controleer belangrijke informatie altijd tegen een betrouwbaar woordenboek.</li>
            <li>We zijn <strong>niet aansprakelijk</strong> voor indirecte schade of gevolgschade (verloren examenpunten, gemiste deadlines, frustratie, gederfde winst, ...).</li>
            <li>We zijn <strong>niet aansprakelijk</strong> voor schade door tijdelijke onbeschikbaarheid van de dienst of door verlies van gegevens als gevolg van technisch falen waaraan ons geen zware fout te wijten is.</li>
          </ul>
          <p>
            Deze beperkingen gelden <strong>niet</strong> in geval van opzet of zware fout van
            onze kant, of voor verplichtingen die de Belgische wet dwingend voorschrijft. Niets
            in deze voorwaarden beperkt jouw rechten als consument onder dwingend Belgisch recht.
          </p>
        </section>

        <section>
          <h2>11. Schorsing en beëindiging</h2>
          <p>
            <strong>Door jou:</strong> je kunt op elk moment je account verwijderen. Daarna
            worden je persoonsgegevens gewist volgens de privacyverklaring.
          </p>
          <p>
            <strong>Door ons:</strong> we mogen jouw account schorsen of verwijderen als je deze
            voorwaarden ernstig of herhaaldelijk overtreedt. Voor minder ernstige inbreuken
            sturen we eerst een waarschuwing. In geval van ernstig misbruik (illegale inhoud,
            beveiligingsaanvallen, kindermisbruik, ...) handelen we onmiddellijk.
          </p>
          <p>
            We mogen Lexica ook stopzetten, bijvoorbeeld omdat we de app niet langer onderhouden
            kunnen of willen. In dat geval kondigen we dat minstens <strong>30 dagen vooraf</strong>
            aan via e-mail of een melding in de app, en bieden we je de kans om je gegevens te
            exporteren.
          </p>
        </section>

        <section>
          <h2>12. Persoonsgegevens</h2>
          <p>
            Hoe Lexica met jouw persoonsgegevens omgaat, lees je in onze
            <a routerLink="/privacy">privacyverklaring</a>. Die maakt integraal deel uit van
            deze voorwaarden.
          </p>
        </section>

        <section>
          <h2>13. Wijzigingen aan deze voorwaarden</h2>
          <p>
            We kunnen deze voorwaarden bijwerken. Bij belangrijke wijzigingen brengen we je
            minstens <strong>30 dagen vooraf</strong> op de hoogte via e-mail of een melding in
            de app. Ben je het niet eens met de nieuwe voorwaarden? Dan kun je je account
            verwijderen vóór ze in werking treden. Door de dienst na de aankondiging te blijven
            gebruiken, aanvaard je de gewijzigde voorwaarden.
          </p>
          <p>
            Kleine, niet-ingrijpende wijzigingen (taalcorrecties, verduidelijkingen) kunnen
            zonder voorafgaande aankondiging gebeuren; we updaten dan wel de versie en datum
            onderaan deze pagina.
          </p>
        </section>

        <section>
          <h2>14. Toepasselijk recht en bevoegde rechtbank</h2>
          <p>
            Op deze voorwaarden is uitsluitend het <strong>Belgisch recht</strong> van
            toepassing. Geschillen die voortvloeien uit of verband houden met deze voorwaarden
            of het gebruik van Lexica worden bij voorkeur in onderling overleg opgelost.
          </p>
          <p>
            Lukt dat niet, dan zijn enkel de hoven en rechtbanken van het
            <strong>arrondissement Antwerpen, afdeling Antwerpen</strong>, bevoegd, onverminderd
            jouw dwingende rechten als consument om je tot de rechter van jouw woonplaats te
            wenden.
          </p>
          <p>
            Voor consumentengeschillen kun je ook gebruik maken van het Europese
            onlineplatform voor geschillenbeslechting:
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.
          </p>
        </section>

        <section>
          <h2>15. Contact</h2>
          <p>
            Heb je vragen, opmerkingen of klachten over deze voorwaarden of over de dienst? Mail
            ons via <a href="mailto:hallo&#64;miljanssens.be">hallo&#64;miljanssens.be</a>. We
            antwoorden zo snel als redelijk mogelijk is.
          </p>
        </section>

        <p class="version">
          <strong>Laatste update:</strong> 20 mei 2026<br />
          <strong>Versie:</strong> 1.0
        </p>

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

    .version {
      color: #666;
      font-size: 0.9rem;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e8e8e8;
    }

    .back-link {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 2px solid #f0f0f0;
    }

    @media (max-width: 600px) {
      .content { padding: 1.25rem 1rem 3rem; }
      h2 { font-size: 1.05rem; }
    }
  `]
})
export class TermsComponent {}
