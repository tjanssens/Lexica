import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ImportPreviewResponse, ImportResultResponse } from '../../core/services/api.service';
import { LoadingComponent } from '../../shared/components/loading.component';

// Importeert een woordenlijst (Excel-template) rechtstreeks in een set: nieuwe woorden worden
// aangemaakt, bestaande woorden worden hergebruikt, en alle geldige woorden komen in de set.
@Component({
  selector: 'app-set-import-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal import-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Woordenlijst importeren</h3>
          <button type="button" class="modal-close" (click)="close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          @if (importStep === 'upload') {
            <div class="upload-area" (dragover)="$event.preventDefault()" (drop)="onImportDrop($event)" (click)="importFileInput.click()">
              <input type="file" accept=".xlsx,.xls" (change)="onImportFileSelected($event)" #importFileInput hidden />
              <i class="fa-solid fa-file-import"></i>
              <p>Sleep een Excel-bestand hierheen of klik om te selecteren</p>
              <span class="upload-hint">Zelfde template als bij Excel importeren. Een lege taalkolom wordt {{ languageLabel }}.</span>
            </div>
            <p class="import-explain">
              Bestaande woorden worden aan deze set toegevoegd, nieuwe woorden worden eerst geïmporteerd.
            </p>
          }
          @if (importStep === 'loading') {
            <app-loading message="Bestand verwerken..."></app-loading>
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
              <button type="button" class="btn-secondary" (click)="resetImport()" [disabled]="importBusy">Ander bestand</button>
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

  importStep: 'upload' | 'loading' | 'preview' | 'done' = 'upload';
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

  private uploadImportFile(file: File) {
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
