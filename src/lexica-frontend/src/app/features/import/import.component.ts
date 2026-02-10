import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Excel importeren</h1>
      </header>

      <div class="content">
        @if (step === 'upload') {
          <div class="upload-area" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
            <input type="file" accept=".xlsx,.xls" (change)="onFileSelected($event)" #fileInput hidden />
            <div class="upload-content" (click)="fileInput.click()">
              <span class="upload-icon"><i class="fa-solid fa-file-import"></i></span>
              <p>Sleep een Excel-bestand hierheen of klik om te selecteren</p>
              <span class="upload-hint">.xlsx of .xls</span>
            </div>
          </div>

          <div class="download-section">
            <h3>Excel downloaden</h3>
            <div class="download-buttons">
              <button class="download-btn" (click)="downloadTemplate()">
                <i class="fa-solid fa-file-circle-plus"></i>
                <div>
                  <strong>Lege template</strong>
                  <span>Excel met alle kolommen</span>
                </div>
              </button>
              <button class="download-btn" (click)="downloadExport()">
                <i class="fa-solid fa-file-export"></i>
                <div>
                  <strong>Bestaande woorden</strong>
                  <span>Exporteer al je woorden</span>
                </div>
              </button>
            </div>
            <p class="column-hint">Kolommen met * zijn verplicht</p>
          </div>
        }

        @if (step === 'loading') {
          <div class="loading">
            <p>Bestand verwerken...</p>
          </div>
        }

        @if (step === 'preview') {
          <div class="preview-summary">
            <div class="summary-item valid">{{ preview.validCount }} geldig</div>
            <div class="summary-item duplicate">{{ preview.duplicateCount }} duplicaten</div>
            <div class="summary-item errors">{{ preview.errorCount }} fouten</div>
          </div>

          <div class="preview-table-wrapper">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Taal</th>
                  <th>Term</th>
                  <th>Vertaling</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (row of preview.rows; track row.rowNumber) {
                  <tr [class.duplicate]="row.isDuplicate" [class.has-error]="row.errors.length > 0">
                    <td>{{ row.number }}</td>
                    <td>{{ row.language }}</td>
                    <td>{{ row.term }}</td>
                    <td>{{ row.translation }}</td>
                    <td>
                      @if (row.errors.length > 0) {
                        <span class="badge error">{{ row.errors[0] }}</span>
                      } @else if (row.isDuplicate) {
                        <span class="badge warn">Duplicaat</span>
                      } @else {
                        <span class="badge ok">OK</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (preview.duplicateCount > 0) {
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="updateDuplicates" />
              Duplicaten bijwerken
            </label>
          }

          <div class="actions">
            <button class="btn-secondary" (click)="reset()">Annuleren</button>
            <button class="btn-primary" (click)="confirmImport()" [disabled]="importing">
              {{ importing ? 'Importeren...' : 'Importeren' }}
            </button>
          </div>
        }

        @if (step === 'done') {
          <div class="result">
            <h2>Import voltooid!</h2>
            <div class="result-stats">
              <div>{{ result.imported }} geïmporteerd</div>
              <div>{{ result.updated }} bijgewerkt</div>
              <div>{{ result.skipped }} overgeslagen</div>
              <div>{{ result.errors }} fouten</div>
            </div>
            <button class="btn-primary" (click)="router.navigate(['/words'])">
              Naar woordenlijst
            </button>
          </div>
        }

        @if (error) {
          <div class="error-msg">{{ error }}</div>
        }
      </div>
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

    .content { padding: 1.5rem; max-width: 600px; margin: 0 auto; }

    .upload-area {
      border: 3px dashed #ccc;
      border-radius: 16px;
      padding: 3rem 1.5rem;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s;
      background: white;
      &:hover { border-color: #0f3460; }
    }

    .upload-icon { font-size: 3rem; }
    .upload-content p { margin: 0.75rem 0 0.25rem; color: #333; }
    .upload-hint { font-size: 0.8rem; color: #888; }

    .download-section {
      background: white;
      border-radius: 12px;
      padding: 1.25rem;
      margin-top: 1.5rem;
      h3 { font-size: 0.9rem; margin: 0 0 0.75rem; }
    }

    .download-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .download-btn {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.2s, background 0.2s;

      &:hover { border-color: #0f3460; background: #f0f4ff; }

      i { font-size: 1.5rem; color: #0f3460; }
      strong { display: block; font-size: 0.85rem; color: #1a1a2e; }
      span { font-size: 0.75rem; color: #888; }
    }

    .column-hint {
      font-size: 0.8rem;
      color: #888;
      margin: 0.75rem 0 0;
    }

    .loading { text-align: center; padding: 3rem; color: #666; }

    .preview-summary {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .summary-item {
      flex: 1;
      text-align: center;
      padding: 0.75rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .valid { background: #d4edda; color: #155724; }
    .duplicate { background: #fff3cd; color: #856404; }
    .errors { background: #f8d7da; color: #721c24; }

    .preview-table-wrapper { overflow-x: auto; margin-bottom: 1rem; }

    .preview-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      font-size: 0.85rem;

      th, td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
      th { background: #f8f9fa; font-weight: 600; }
      tr.has-error { background: #fff5f5; }
      tr.duplicate { background: #fffbea; }
    }

    .badge {
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge.ok { background: #d4edda; color: #155724; }
    .badge.warn { background: #fff3cd; color: #856404; }
    .badge.error { background: #f8d7da; color: #721c24; }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .actions { display: flex; gap: 0.75rem; }

    .btn-primary, .btn-secondary {
      flex: 1;
      padding: 0.85rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary { background: #0f3460; color: white; &:hover:not(:disabled) { background: #1a1a2e; } &:disabled { opacity: 0.6; } }
    .btn-secondary { background: #e0e0e0; color: #333; &:hover { background: #d0d0d0; } }

    .result {
      text-align: center;
      padding: 2rem 0;
      h2 { color: #155724; margin-bottom: 1rem; }
    }

    .result-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      div {
        background: white;
        padding: 0.75rem;
        border-radius: 10px;
        font-size: 0.9rem;
      }
    }

    .error-msg {
      background: #fee2e2;
      color: #dc2626;
      padding: 0.75rem;
      border-radius: 8px;
      margin-top: 1rem;
      font-size: 0.85rem;
    }
  `]
})
export class ImportComponent {
  step: 'upload' | 'loading' | 'preview' | 'done' = 'upload';
  preview: any = null;
  result: any = null;
  updateDuplicates = false;
  importing = false;
  error = '';

  private readonly baseUrl = `${environment.apiUrl}/words/import`;

  constructor(
    private http: HttpClient,
    public router: Router
  ) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadFile(file);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadFile(file);
  }

  uploadFile(file: File) {
    this.step = 'loading';
    this.error = '';
    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>(`${this.baseUrl}/preview`, formData).subscribe({
      next: (res) => {
        this.preview = res;
        this.step = 'preview';
      },
      error: (err) => {
        this.error = err.error || 'Fout bij verwerken bestand.';
        this.step = 'upload';
      }
    });
  }

  confirmImport() {
    this.importing = true;
    this.http.post<any>(`${this.baseUrl}/confirm`, {
      sessionId: this.preview.sessionId,
      updateDuplicates: this.updateDuplicates
    }).subscribe({
      next: (res) => {
        this.result = res;
        this.step = 'done';
        this.importing = false;
      },
      error: () => {
        this.error = 'Fout bij importeren.';
        this.importing = false;
      }
    });
  }

  downloadTemplate() {
    this.downloadFile(`${this.baseUrl}/template`, 'lexica-template.xlsx');
  }

  downloadExport() {
    this.downloadFile(`${this.baseUrl}/export`, 'lexica-woorden.xlsx');
  }

  private downloadFile(url: string, filename: string) {
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: () => this.error = 'Fout bij downloaden.'
    });
  }

  reset() {
    this.step = 'upload';
    this.preview = null;
    this.error = '';
  }
}
