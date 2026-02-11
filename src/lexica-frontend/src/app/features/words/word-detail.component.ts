import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, WordDto } from '../../core/services/api.service';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  selector: 'app-word-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/words" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>{{ isNew ? 'Woord toevoegen' : 'Woord bewerken' }}</h1>
        @if (!isNew) {
          <button class="delete-btn" (click)="deleteWord()"><i class="fa-solid fa-trash"></i></button>
        }
      </header>

      @if (!word) {
        <app-loading message="Woord laden..."></app-loading>
      }
      @if (word) {
        <form (ngSubmit)="save()" class="form">
          <div class="form-group">
            <label>Nummer</label>
            <input type="number" [(ngModel)]="word.number" name="number" required />
          </div>

          @if (isNew) {
            <div class="form-group">
              <label>Taal</label>
              <select [(ngModel)]="word.language" name="language" required>
                <option value="Latin">Latijn</option>
                <option value="Greek">Grieks</option>
              </select>
            </div>
          } @else {
            <div class="form-group">
              <label>Taal</label>
              <input type="text" [value]="word.language === 'Latin' ? 'Latijn' : 'Grieks'" disabled />
            </div>
          }

          <div class="form-group">
            <label>Term</label>
            <input type="text" [(ngModel)]="word.term" name="term" required placeholder="Latijns/Grieks woord" />
          </div>

          <div class="form-group">
            <label>Vertaling</label>
            <input type="text" [(ngModel)]="word.translation" name="translation" required placeholder="Nederlandse vertaling" />
          </div>

          <div class="form-group">
            <label>Woordsoort</label>
            <input type="text" [(ngModel)]="word.partOfSpeech" name="partOfSpeech" placeholder="bijv. nomen, verbum" />
          </div>

          <div class="form-group">
            <label>Notities</label>
            <textarea [(ngModel)]="word.notes" name="notes" placeholder="Ezelsbruggetje, extra context..."></textarea>
          </div>

          @if (!isNew) {
            <div class="sm2-info">
              <h3>SM-2 Voortgang <button type="button" class="info-btn" (click)="showSm2Modal = true"><i class="fa-solid fa-circle-info"></i></button></h3>
              <div class="sm2-grid">
                <div><span class="label">Easiness:</span> {{ word.easiness.toFixed(2) }}</div>
                <div><span class="label">Interval:</span> {{ word.interval }} {{ word.interval === 1 ? 'dag' : 'dagen' }}</div>
                <div><span class="label">Correct op rij:</span> {{ word.repetitions }}</div>
                <div><span class="label">Due:</span> {{ word.dueDate | date:'d MMM yyyy' }}</div>
              </div>
            </div>

            @if (showSm2Modal) {
              <div class="modal-backdrop" (click)="showSm2Modal = false">
                <div class="modal" (click)="$event.stopPropagation()">
                  <div class="modal-header">
                    <h3>SM-2 Algoritme</h3>
                    <button type="button" class="modal-close" (click)="showSm2Modal = false"><i class="fa-solid fa-xmark"></i></button>
                  </div>
                  <div class="modal-body">
                    <p>SM-2 (SuperMemo 2) is een spaced repetition algoritme dat bepaalt wanneer je een woord opnieuw moet oefenen. Hoe beter je een woord kent, hoe langer het interval tot de volgende herhaling.</p>

                    <h4>Parameters</h4>
                    <dl>
                      <dt>Easiness (E-Factor)</dt>
                      <dd>Geeft aan hoe makkelijk je dit woord vindt. Start op 2.5 en daalt bij fouten. Hoe hoger, hoe sneller het interval groeit. Minimum: 1.3.</dd>

                      <dt>Interval</dt>
                      <dd>Het aantal dagen tot de volgende herhaling. Groeit exponentieel bij correcte antwoorden: 1 dag, 6 dagen, daarna interval x easiness.</dd>

                      <dt>Correct op rij</dt>
                      <dd>Het aantal opeenvolgende correcte antwoorden. Bij een fout wordt dit gereset naar 0.</dd>

                      <dt>Due (vervaldatum)</dt>
                      <dd>De datum waarop dit woord opnieuw geoefend moet worden. Woorden die "due" zijn verschijnen in je studiesessie.</dd>
                    </dl>

                    <h4>Wanneer is een woord "gekend"?</h4>
                    <p>Een woord telt als gemeesterd wanneer: correct op rij &gt; 5, easiness &gt; 2.3 en interval &gt; 21 dagen.</p>
                  </div>
                </div>
              </div>
            }
          }

          @if (error) {
            <div class="error">{{ error }}</div>
          }

          <button type="submit" [disabled]="saving">
            {{ saving ? 'Opslaan...' : (isNew ? 'Toevoegen' : 'Opslaan') }}
          </button>
        </form>
      }
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
    .delete-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.25rem;
    }

    .form {
      padding: 1.5rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.4rem;
    }

    input, select, textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      box-sizing: border-box;
      background: white;
      &:focus { outline: none; border-color: #0f3460; }
    }

    textarea { min-height: 80px; resize: vertical; }

    .sm2-info {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1.25rem;

      h3 { font-size: 0.9rem; margin: 0 0 0.75rem; color: #333; display: flex; align-items: center; gap: 0.5rem; }
    }

    .info-btn {
      background: none; border: none; color: #0f3460; cursor: pointer;
      font-size: 1rem; padding: 0; line-height: 1;
      &:hover { color: #f59e0b; }
    }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem;
    }

    .modal {
      background: white; border-radius: 14px; max-width: 450px; width: 100%;
      max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid #eee;
      h3 { margin: 0; font-size: 1rem; color: #1a1a2e; }
    }

    .modal-close {
      background: none; border: none; font-size: 1.25rem; color: #888;
      cursor: pointer; padding: 0.25rem;
      &:hover { color: #333; }
    }

    .modal-body {
      padding: 1.25rem;
      font-size: 0.85rem; color: #444; line-height: 1.5;

      p { margin: 0 0 1rem; }
      h4 { margin: 0 0 0.5rem; color: #1a1a2e; font-size: 0.9rem; }

      dl { margin: 0 0 1rem; }
      dt { font-weight: 600; color: #333; margin-top: 0.5rem; }
      dd { margin: 0.15rem 0 0 0; color: #555; }
    }

    .sm2-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #555;

      .label { font-weight: 600; }
    }

    .error {
      background: #fee2e2;
      color: #dc2626;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }

    button[type="submit"] {
      width: 100%;
      padding: 0.85rem;
      background: #0f3460;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      &:hover:not(:disabled) { background: #1a1a2e; }
      &:disabled { opacity: 0.6; }
    }
  `]
})
export class WordDetailComponent implements OnInit {
  word: any = null;
  isNew = false;
  saving = false;
  error = '';
  showSm2Modal = false;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || this.route.snapshot.data['id'];
    if (id === 'new') {
      this.isNew = true;
      this.word = {
        number: 0, language: 'Latin', term: '', translation: '',
        partOfSpeech: '', notes: '', easiness: 2.5, interval: 0,
        repetitions: 0, dueDate: new Date().toISOString()
      };
    } else if (id) {
      this.api.getWord(id).subscribe({
        next: (w) => this.word = { ...w },
        error: () => this.router.navigate(['/words'])
      });
    }
  }

  save() {
    this.saving = true;
    this.error = '';

    if (this.isNew) {
      this.api.createWord({
        number: this.word.number,
        language: this.word.language,
        term: this.word.term,
        translation: this.word.translation,
        partOfSpeech: this.word.partOfSpeech || undefined,
        notes: this.word.notes || undefined
      }).subscribe({
        next: (w) => this.router.navigate(['/words', w.id]),
        error: (err) => { this.error = err.error || 'Fout bij opslaan.'; this.saving = false; }
      });
    } else {
      this.api.updateWord(this.word.id, {
        number: this.word.number,
        term: this.word.term,
        translation: this.word.translation,
        partOfSpeech: this.word.partOfSpeech,
        notes: this.word.notes
      }).subscribe({
        next: () => { this.saving = false; this.router.navigate(['/words']); },
        error: (err) => { this.error = err.error || 'Fout bij opslaan.'; this.saving = false; }
      });
    }
  }

  deleteWord() {
    if (confirm('Weet je zeker dat je dit woord wilt verwijderen?')) {
      this.api.deleteWord(this.word.id).subscribe({
        next: () => this.router.navigate(['/words']),
        error: () => this.error = 'Fout bij verwijderen.'
      });
    }
  }
}
