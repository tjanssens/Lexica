import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ImportPreviewResponse, ImportResultResponse } from '../../core/services/api.service';
import { prepareImportPhoto } from './photo-resize';
import { LoadingComponent } from '../../shared/components/loading.component';

// Importeert een woordenlijst rechtstreeks in een set: nieuwe woorden worden aangemaakt, bestaande
// woorden worden hergebruikt, en alle geldige woorden komen in de set. De lijst komt uit een
// Excel-bestand of uit een foto (Claude leest de woordjes uit, de gebruiker kijkt ze eerst na).

interface ReviewRow {
  term: string;
  translation: string;
  selected: boolean;
}
@Component({
  selector: 'app-set-import-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal import-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ source === 'photo' ? 'Woordjes van een foto' : 'Woordenlijst importeren' }}</h3>
          <button type="button" class="modal-close" (click)="close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          @if (importStep === 'upload') {
            <div class="photo-options">
              <button type="button" class="photo-btn" (click)="cameraInput.click()">
                <i class="fa-solid fa-camera"></i> Foto nemen
              </button>
              <button type="button" class="photo-btn secondary" (click)="photoInput.click()">
                <i class="fa-solid fa-image"></i> Foto kiezen
              </button>
              <input type="file" accept="image/*" capture="environment" (change)="onPhotoSelected($event)" #cameraInput hidden />
              <input type="file" accept="image/*" (change)="onPhotoSelected($event)" #photoInput hidden />
            </div>
            <p class="upload-hint center">Fotografeer een woordenlijst met {{ languageLabel }} en de Nederlandse vertaling. Je kijkt alles na voor er iets geïmporteerd wordt.</p>
            <div class="divider"><span>of</span></div>
            <div class="upload-area" (dragover)="$event.preventDefault()" (drop)="onImportDrop($event)" (click)="importFileInput.click()">
              <input type="file" accept=".xlsx,.xls" (change)="onImportFileSelected($event)" #importFileInput hidden />
              <i class="fa-solid fa-file-import"></i>
              <p>Excel-bestand kiezen</p>
              <span class="upload-hint">Zelfde template als bij Excel importeren. Een lege taalkolom wordt {{ languageLabel }}.</span>
            </div>
            <p class="import-explain">
              Bestaande woorden worden aan deze set toegevoegd, nieuwe woorden worden eerst geïmporteerd.
            </p>
          }
          @if (importStep === 'loading') {
            <app-loading [message]="loadingMessage"></app-loading>
          }
          @if (importStep === 'review') {
            <p class="import-explain">
              Kijk de herkende woordjes na. Pas aan wat fout gelezen is en vink uit wat je niet wilt importeren.
            </p>
            <div class="review-tools">
              <label class="checkbox-label">
                <input type="checkbox" [checked]="allSelected" (change)="toggleAll($any($event.target).checked)" />
                {{ selectedCount }} van {{ reviewRows.length }}
              </label>
              <button type="button" class="link-btn" (click)="swapColumns()" title="Term en vertaling omwisselen">
                <i class="fa-solid fa-right-left"></i> Omwisselen
              </button>
            </div>
            <div class="import-rows">
              @for (row of reviewRows; track $index) {
                <div class="review-row" [class.deselected]="!row.selected">
                  <input type="checkbox" [(ngModel)]="row.selected" [name]="'sel' + $index" />
                  <div class="review-fields">
                    <input type="text" [(ngModel)]="row.term" [name]="'term' + $index" placeholder="{{ languageLabel }}" (input)="autoSelect(row)" />
                    <input type="text" [(ngModel)]="row.translation" [name]="'tr' + $index" placeholder="Nederlands" (input)="autoSelect(row)" />
                  </div>
                  <button type="button" class="row-remove" (click)="removeRow($index)" title="Rij verwijderen"><i class="fa-solid fa-trash"></i></button>
                </div>
              }
              @if (reviewRows.length === 0) {
                <p class="empty">Er werden geen woordjes gevonden op deze foto.</p>
              }
            </div>
            <div class="review-tools">
              <button type="button" class="link-btn" (click)="addRow()"><i class="fa-solid fa-plus"></i> Rij toevoegen</button>
              <button type="button" class="link-btn" (click)="photoInput2.click()"><i class="fa-solid fa-camera"></i> Nog een foto</button>
              <input type="file" accept="image/*" (change)="onPhotoSelected($event)" #photoInput2 hidden />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="resetImport()">Opnieuw</button>
              <button type="button" class="btn-primary" (click)="previewReviewRows()" [disabled]="selectedCount === 0">Verder</button>
            </div>
          }
          @if (importStep === 'preview' && importPreview) {
            <div class="import-summary">
              <div class="summary-item valid">{{ importPreview.validCount }} nieuw</div>
              <div class="summary-item duplicate">{{ importPreview.duplicateCount }} bestaand</div>
              <div class="summary-item errors">{{ importPreview.errorCount }} fouten</div>
            </div>
            <p class="import-explain">
              <strong>{{ importPreview.toAddToSetCount }}</strong>
              {{ importPreview.toAddToSetCount === 1 ? 'woord wordt' : 'woorden worden' }} aan deze set toegevoegd.
            </p>
            <div class="import-rows">
              @for (row of importPreview.rows; track row.rowNumber) {
                <div class="import-row" [class.has-error]="row.errors.length > 0">
                  <span class="import-term">{{ row.term }}</span>
                  <span class="import-translation">{{ row.translation }}</span>
                  @if (row.errors.length > 0) {
                    <span class="badge error">{{ row.errors[0] }}</span>
                  } @else if (row.alreadyInSet) {
                    <span class="badge muted">Al in set</span>
                  } @else if (row.isDuplicate) {
                    <span class="badge warn">Bestaand</span>
                  } @else {
                    <span class="badge ok">Nieuw</span>
                  }
                </div>
              }
            </div>
            @if (importPreview.duplicateCount > 0) {
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="importUpdateDuplicates" />
                Vertaling van bestaande woorden bijwerken
              </label>
            }
            <div class="modal-actions">
              @if (source === 'photo') {
                <button type="button" class="btn-secondary" (click)="importStep = 'review'" [disabled]="importBusy">Terug</button>
              } @else {
                <button type="button" class="btn-secondary" (click)="resetImport()" [disabled]="importBusy">Ander bestand</button>
              }
              <button type="button" class="btn-primary" (click)="confirmImport()"
                      [disabled]="importBusy || importPreview.toAddToSetCount === 0">
                {{ importBusy ? 'Importeren...' : 'Importeren' }}
              </button>
            </div>
          }
          @if (importStep === 'done' && importResult) {
            <div class="import-done">
              <i class="fa-solid fa-circle-check"></i>
              <p><strong>{{ importResult.addedToSet }}</strong> {{ importResult.addedToSet === 1 ? 'woord' : 'woorden' }} toegevoegd aan de set.</p>
              <p class="import-explain">
                {{ importResult.imported }} nieuw geïmporteerd
                @if (importResult.updated > 0) { · {{ importResult.updated }} bijgewerkt }
                @if (importResult.errors > 0) { · {{ importResult.errors }} met fouten overgeslagen }
              </p>
            </div>
            <button type="button" class="btn-submit" (click)="close()">Sluiten</button>
          }
          @if (importError) { <div class="error">{{ importError }}</div> }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem;
    }
    .modal {
      background: white; border-radius: 14px; width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
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
    .modal-body { padding: 1.25rem; }
    .btn-submit {
      width: 100%; margin-top: 1rem; padding: 0.75rem; background: #0f3460; color: white;
      border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
      &:hover { background: #1a1a2e; }
    }
    .error {
      background: #fee2e2; color: #dc2626; padding: 0.6rem 0.75rem;
      border-radius: 8px; margin-top: 0.75rem; font-size: 0.85rem;
    }
    .import-modal { max-width: 520px; }
    .upload-area {
      border: 3px dashed #ccc; border-radius: 12px; padding: 2rem 1rem; text-align: center;
      cursor: pointer; transition: border-color 0.2s;
      &:hover { border-color: #0f3460; }
      i { font-size: 2rem; color: #0f3460; }
      p { margin: 0.5rem 0 0.25rem; color: #333; }
    }
    .upload-hint { font-size: 0.75rem; color: #888; }
    .import-explain { font-size: 0.85rem; color: #555; margin: 0.75rem 0; }
    .import-summary {
      display: flex; gap: 0.5rem;
      .summary-item { flex: 1; text-align: center; padding: 0.5rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; }
      .valid { background: #d4edda; color: #155724; }
      .duplicate { background: #fff3cd; color: #856404; }
      .errors { background: #f8d7da; color: #721c24; }
    }
    .import-rows {
      max-height: 40vh; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; margin-bottom: 0.75rem;
    }
    .import-row {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.65rem;
      border-bottom: 1px solid #f2f2f2; font-size: 0.85rem;
      &:last-child { border-bottom: none; }
      &.has-error { background: #fff5f5; }
    }
    .import-term { font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .import-translation { flex: 1; min-width: 0; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .badge { padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
    .badge.ok { background: #d4edda; color: #155724; }
    .badge.warn { background: #fff3cd; color: #856404; }
    .badge.muted { background: #eee; color: #666; }
    .badge.error { background: #f8d7da; color: #721c24; }
    .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; margin-bottom: 0.75rem; }
    .modal-actions {
      display: flex; gap: 0.5rem;
      button { flex: 1; padding: 0.7rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
      .btn-primary { background: #0f3460; color: white; &:disabled { opacity: 0.6; } }
      .btn-secondary { background: #e0e0e0; color: #333; }
    }
    .photo-options {
      display: flex; gap: 0.5rem;
    }
    .photo-btn {
      flex: 1; padding: 0.9rem 0.5rem; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 600;
      background: #0f3460; color: white; cursor: pointer;
      i { margin-right: 0.35rem; }
      &.secondary { background: #e8eef7; color: #0f3460; }
    }
    .upload-hint.center { display: block; text-align: center; margin: 0.5rem 0 0; }
    .divider {
      display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0; color: #999; font-size: 0.8rem;
      &::before, &::after { content: ''; flex: 1; border-top: 1px solid #eee; }
    }
    .review-tools {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem;
      .checkbox-label { margin: 0; }
    }
    .link-btn {
      background: none; border: none; color: #0f3460; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0.25rem 0;
    }
    .review-row {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.5rem; border-bottom: 1px solid #f2f2f2;
      &:last-child { border-bottom: none; }
      &.deselected .review-fields { opacity: 0.45; }
      > input[type=checkbox] { width: 1.1rem; height: 1.1rem; flex-shrink: 0; }
    }
    .review-fields {
      flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.25rem;
      input {
        width: 100%; box-sizing: border-box; padding: 0.35rem 0.5rem; border: 1px solid #ddd; border-radius: 6px;
        font-size: 16px; /* voorkomt inzoomen op iOS */
      }
      input:first-child { font-weight: 600; }
    }
    .row-remove { background: none; border: none; color: #bbb; cursor: pointer; padding: 0.25rem; &:hover { color: #dc2626; } }
    .empty { text-align: center; color: #888; font-size: 0.85rem; padding: 1rem; margin: 0; }
    .import-done {
      text-align: center;
      i { font-size: 2.5rem; color: #4caf50; }
      p { margin: 0.5rem 0; }
    }
  `]
})
export class SetImportModalComponent {
  @Input({ required: true }) setId!: string;
  @Input() languageLabel = '';
  /** true wanneer er effectief geïmporteerd werd (zodat de set herladen kan worden). */
  @Output() closed = new EventEmitter<boolean>();

  importStep: 'upload' | 'loading' | 'review' | 'preview' | 'done' = 'upload';
  source: 'excel' | 'photo' = 'excel';
  loadingMessage = 'Bestand verwerken...';
  reviewRows: ReviewRow[] = [];
  importPreview: ImportPreviewResponse | null = null;
  importResult: ImportResultResponse | null = null;
  importUpdateDuplicates = false;
  importBusy = false;
  importError = '';

  constructor(private api: ApiService) {}

  close() {
    if (this.importBusy) return;
    this.closed.emit(this.importStep === 'done');
  }

  resetImport() {
    this.importStep = 'upload';
    this.source = 'excel';
    this.reviewRows = [];
    this.importPreview = null;
    this.importUpdateDuplicates = false;
    this.importError = '';
  }

  onImportDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadImportFile(file);
  }

  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.uploadImportFile(file);
  }

  get selectedCount(): number {
    return this.reviewRows.filter(r => r.selected).length;
  }

  get allSelected(): boolean {
    return this.reviewRows.length > 0 && this.reviewRows.every(r => r.selected);
  }

  async onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    // Een extra foto vanuit het nakijkscherm voegt rijen toe in plaats van ze te vervangen.
    const previousStep = this.importStep;
    const append = previousStep === 'review';
    this.importError = '';
    this.loadingMessage = 'Woordjes lezen... dit duurt enkele seconden';
    this.importStep = 'loading';

    let photo: Blob;
    try {
      photo = await prepareImportPhoto(file);
    } catch {
      this.importError = 'Deze foto kon niet geopend worden. Probeer een JPG- of PNG-foto.';
      this.importStep = previousStep;
      return;
    }

    this.api.extractSetImportPhoto(this.setId, photo).subscribe({
      next: (res) => {
        const rows = res.rows.map(r => ({
          term: r.term ?? '',
          translation: r.translation ?? '',
          selected: !!r.term?.trim() && !!r.translation?.trim(),
        }));
        this.reviewRows = append ? [...this.reviewRows, ...rows] : rows;
        this.source = 'photo';
        this.importStep = 'review';
      },
      error: (err) => {
        this.importError = typeof err.error === 'string' ? err.error : 'De foto kon niet verwerkt worden.';
        this.importStep = previousStep;
      }
    });
  }

  toggleAll(selected: boolean) {
    this.reviewRows.forEach(r => r.selected = selected && !!r.term.trim() && !!r.translation.trim());
  }

  // Een rij die je net volledig ingevuld hebt, telt meteen mee.
  autoSelect(row: ReviewRow) {
    if (row.term.trim() && row.translation.trim()) row.selected = true;
  }

  swapColumns() {
    this.reviewRows.forEach(r => [r.term, r.translation] = [r.translation, r.term]);
  }

  addRow() {
    this.reviewRows = [...this.reviewRows, { term: '', translation: '', selected: false }];
  }

  removeRow(index: number) {
    this.reviewRows = this.reviewRows.filter((_, i) => i !== index);
  }

  previewReviewRows() {
    const rows = this.reviewRows
      .filter(r => r.selected)
      .map(r => ({ term: r.term.trim(), translation: r.translation.trim() }));
    if (rows.length === 0) return;
    this.importError = '';
    this.loadingMessage = 'Woorden controleren...';
    this.importStep = 'loading';
    this.api.previewSetImportRows(this.setId, rows).subscribe({
      next: (res) => {
        this.importPreview = res;
        this.importUpdateDuplicates = false;
        this.importStep = 'preview';
      },
      error: (err) => {
        this.importError = typeof err.error === 'string' ? err.error : 'Fout bij controleren van de woorden.';
        this.importStep = 'review';
      }
    });
  }

  private uploadImportFile(file: File) {
    this.source = 'excel';
    this.loadingMessage = 'Bestand verwerken...';
    this.importStep = 'loading';
    this.importError = '';
    this.api.previewSetImport(this.setId, file).subscribe({
      next: (res) => {
        this.importPreview = res;
        this.importStep = 'preview';
      },
      error: (err) => {
        this.importError = typeof err.error === 'string' ? err.error : 'Fout bij verwerken bestand.';
        this.importStep = 'upload';
      }
    });
  }

  confirmImport() {
    if (!this.importPreview) return;
    this.importBusy = true;
    this.importError = '';
    this.api.confirmSetImport(this.setId, this.importPreview.sessionId, this.importUpdateDuplicates).subscribe({
      next: (res) => {
        this.importResult = res;
        this.importStep = 'done';
        this.importBusy = false;
      },
      error: (err) => {
        this.importError = typeof err.error === 'string' ? err.error : 'Fout bij importeren.';
        this.importBusy = false;
      }
    });
  }
}
