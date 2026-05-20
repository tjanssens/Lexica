import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService, UserProfileDto } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LoadingComponent } from '../../shared/components/loading.component';
import { generateLatinName, LatinNameGender } from '../../shared/utils/latin-name-generator';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Profiel</h1>
      </header>

      @if (!profile) {
        <app-loading message="Profiel laden..."></app-loading>
      }
      @if (profile) {
        <div class="form">
          <!-- Profile picture -->
          <section class="section">
            <div class="avatar-row">
              <div class="avatar-wrapper" (click)="fileInput.click()">
                @if (profilePictureUrl) {
                  <img [src]="profilePictureUrl" class="avatar" alt="Profielfoto" />
                } @else {
                  <div class="avatar avatar-placeholder">
                    <i class="fa-solid fa-user"></i>
                  </div>
                }
                <div class="avatar-overlay">
                  <i class="fa-solid fa-camera"></i>
                </div>
                @if (uploadingPicture) {
                  <div class="avatar-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                  </div>
                }
              </div>
              <input #fileInput type="file" accept="image/jpeg,image/png,image/gif,image/webp" (change)="onFileSelected($event)" hidden />
              <div class="avatar-info">
                <span class="name">{{ displayName }}</span>
                <span class="email">{{ profile.email }}</span>
                @if (profilePictureUrl) {
                  <button class="remove-pic-btn" (click)="removePicture()">
                    <i class="fa-solid fa-trash-can"></i> Foto verwijderen
                  </button>
                }
              </div>
            </div>

            <div class="form-group">
              <label>Weergavenaam</label>
              <div class="gender-row" role="radiogroup" aria-label="Geslacht voor naamgenerator">
                <button type="button"
                        class="gender-btn"
                        [class.active]="nameGender === 'male'"
                        (click)="nameGender = 'male'"
                        role="radio"
                        [attr.aria-checked]="nameGender === 'male'">
                  <i class="fa-solid fa-mars"></i> Man
                </button>
                <button type="button"
                        class="gender-btn"
                        [class.active]="nameGender === 'female'"
                        (click)="nameGender = 'female'"
                        role="radio"
                        [attr.aria-checked]="nameGender === 'female'">
                  <i class="fa-solid fa-venus"></i> Vrouw
                </button>
                <button type="button"
                        class="gender-btn"
                        [class.active]="nameGender === 'any'"
                        (click)="nameGender = 'any'"
                        role="radio"
                        [attr.aria-checked]="nameGender === 'any'">
                  <i class="fa-solid fa-shuffle"></i> Geen voorkeur
                </button>
              </div>
              <div class="name-row">
                <input type="text" [(ngModel)]="displayName" name="displayName" required />
                <button type="button" class="dice-btn" (click)="rollLatinName()" title="Romeinse naam genereren">
                  <i class="fa-solid fa-dice"></i>
                </button>
              </div>
            </div>

            @if (profileSuccess) {
              <div class="success">{{ profileSuccess }}</div>
            }
            @if (profileError) {
              <div class="error">{{ profileError }}</div>
            }

            <button (click)="saveProfile()" [disabled]="savingProfile" class="btn-primary">
              {{ savingProfile ? 'Opslaan...' : 'Profiel opslaan' }}
            </button>
          </section>

          <!-- Email -->
          <section class="section">
            <h2>E-mailadres wijzigen</h2>

            <div class="form-group">
              <label>Nieuw e-mailadres</label>
              <input type="email" [(ngModel)]="newEmail" name="newEmail" [placeholder]="profile.email" />
            </div>

            <div class="form-group">
              <label>Wachtwoord ter bevestiging</label>
              <input type="password" [(ngModel)]="emailPassword" name="emailPassword" placeholder="Je huidige wachtwoord" />
            </div>

            @if (emailSuccess) {
              <div class="success">{{ emailSuccess }}</div>
            }
            @if (emailError) {
              <div class="error">{{ emailError }}</div>
            }

            <button (click)="changeEmail()" [disabled]="savingEmail || !newEmail || !emailPassword" class="btn-primary">
              {{ savingEmail ? 'Wijzigen...' : 'E-mail wijzigen' }}
            </button>
          </section>

          <!-- Password -->
          <section class="section">
            <h2>{{ profile.hasPassword ? 'Wachtwoord wijzigen' : 'Wachtwoord instellen' }}</h2>

            @if (profile.hasPassword) {
              <div class="form-group">
                <label>Huidig wachtwoord</label>
                <input type="password" [(ngModel)]="currentPassword" name="currentPassword" />
              </div>
            }

            <div class="form-group">
              <label>Nieuw wachtwoord</label>
              <input type="password" [(ngModel)]="newPassword" name="newPassword" />
            </div>

            <div class="form-group">
              <label>Bevestig nieuw wachtwoord</label>
              <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" />
            </div>

            @if (passwordSuccess) {
              <div class="success">{{ passwordSuccess }}</div>
            }
            @if (passwordError) {
              <div class="error">{{ passwordError }}</div>
            }

            <button (click)="changePassword()" [disabled]="savingPassword || !newPassword || !confirmPassword" class="btn-primary">
              {{ savingPassword ? 'Wijzigen...' : (profile.hasPassword ? 'Wachtwoord wijzigen' : 'Wachtwoord instellen') }}
            </button>
          </section>

          <!-- Mijn gegevens (GDPR) -->
          <section class="section">
            <h2>Mijn gegevens</h2>
            <p class="hint">
              Onder de GDPR heb je het recht om je gegevens te downloaden en je account te verwijderen.
            </p>

            <button (click)="exportData()" [disabled]="exportingData" class="btn-secondary">
              <i class="fa-solid fa-download"></i>
              {{ exportingData ? 'Bezig...' : 'Download al mijn gegevens (JSON)' }}
            </button>
            @if (exportError) {
              <div class="error" style="margin-top: 0.75rem;">{{ exportError }}</div>
            }
          </section>

          <!-- Account verwijderen -->
          <section class="section danger-section">
            <h2>Account verwijderen</h2>
            <p class="hint">
              Hiermee verwijder je je account en al je gegevens definitief. Publieke sets die je
              hebt gedeeld blijven anoniem bestaan voor gebruikers die ze al hebben gekopieerd.
              Deze actie kan niet ongedaan gemaakt worden.
            </p>

            @if (!showDeleteConfirm) {
              <button (click)="showDeleteConfirm = true" class="btn-danger">
                <i class="fa-solid fa-trash-can"></i> Account verwijderen
              </button>
            } @else {
              <div class="delete-confirm">
                <p>
                  Typ <strong>VERWIJDEREN</strong> ter bevestiging.
                </p>
                <div class="form-group">
                  <input type="text" [(ngModel)]="deleteConfirmText" name="deleteConfirmText" placeholder="VERWIJDEREN" />
                </div>

                @if (profile.hasPassword) {
                  <div class="form-group">
                    <label>Wachtwoord</label>
                    <input type="password" [(ngModel)]="deletePassword" name="deletePassword" placeholder="Je huidige wachtwoord" />
                  </div>
                }

                @if (deleteError) {
                  <div class="error">{{ deleteError }}</div>
                }

                <div class="delete-actions">
                  <button (click)="cancelDelete()" class="btn-secondary" [disabled]="deletingAccount">
                    Annuleren
                  </button>
                  <button (click)="confirmDelete()" [disabled]="!canDelete() || deletingAccount" class="btn-danger">
                    {{ deletingAccount ? 'Bezig...' : 'Definitief verwijderen' }}
                  </button>
                </div>
              </div>
            }
          </section>

          <p class="legal-link">
            <a routerLink="/terms">Gebruiksvoorwaarden</a> ·
            <a routerLink="/privacy">Privacyverklaring</a>
          </p>
        </div>
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

    .form { padding: 1.5rem; max-width: 500px; margin: 0 auto; }

    .section {
      background: white;
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    h2 { font-size: 0.95rem; color: #333; margin: 0 0 1rem; }

    .avatar-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .avatar-placeholder {
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: #888;
    }

    .avatar-wrapper {
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
    }

    .avatar-overlay {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.25rem;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .avatar-wrapper:hover .avatar-overlay { opacity: 1; }

    .avatar-loading {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(255,255,255,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0f3460;
      font-size: 1.25rem;
    }

    .avatar-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .remove-pic-btn {
      background: none;
      border: none;
      color: #dc2626;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 0;
      margin-top: 0.2rem;
      text-align: left;
      &:hover { text-decoration: underline; }
    }

    .name { font-weight: 600; color: #1a1a2e; font-size: 1.1rem; }
    .email { color: #888; font-size: 0.85rem; }

    .form-group { margin-bottom: 1rem; }

    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.4rem;
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      box-sizing: border-box;
      background: white;
      &:focus { outline: none; border-color: #0f3460; }
    }

    .name-row {
      display: flex;
      gap: 0.5rem;
      align-items: stretch;
    }

    .name-row input { flex: 1; }

    .dice-btn {
      flex-shrink: 0;
      width: 48px;
      background: #0f3460;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.15s;
      &:hover { background: #1a1a2e; }
      &:active { transform: rotate(20deg) scale(0.95); }
    }

    .gender-row {
      display: flex;
      gap: 0.4rem;
      margin-bottom: 0.6rem;
    }

    .gender-btn {
      flex: 1;
      padding: 0.45rem 0.5rem;
      background: white;
      color: #555;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      transition: all 0.15s;
      &:hover { border-color: #0f3460; color: #0f3460; }
      &.active {
        background: #0f3460;
        color: white;
        border-color: #0f3460;
      }
      i { font-size: 0.85rem; }
    }

    .btn-primary {
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

    .error {
      background: #fee2e2;
      color: #dc2626;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }

    .success {
      background: #dcfce7;
      color: #16a34a;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }

    .legal-link {
      text-align: center;
      font-size: 0.8rem;
      margin: 0.5rem 0 0;

      a {
        color: #888;
        text-decoration: underline;
        &:hover { color: #0f3460; }
      }
    }

    .hint {
      color: #666;
      font-size: 0.88rem;
      margin: 0 0 1rem;
    }

    .btn-secondary {
      width: 100%;
      padding: 0.75rem;
      background: white;
      color: #0f3460;
      border: 2px solid #0f3460;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      &:hover:not(:disabled) { background: #f0f3f9; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .danger-section {
      border: 2px solid #fee2e2;
      background: #fffafa;
    }

    .danger-section h2 { color: #b91c1c; }

    .btn-danger {
      padding: 0.75rem 1rem;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      &:hover:not(:disabled) { background: #b91c1c; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .delete-confirm {
      background: white;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 1rem;
    }

    .delete-actions {
      display: flex;
      gap: 0.6rem;
      margin-top: 0.5rem;

      .btn-secondary { flex: 1; padding: 0.65rem; }
      .btn-danger { flex: 1; justify-content: center; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  profile: UserProfileDto | null = null;

  displayName = '';
  nameGender: LatinNameGender = 'any';
  profilePictureUrl: string | undefined = '';
  uploadingPicture = false;
  savingProfile = false;
  profileSuccess = '';
  profileError = '';

  newEmail = '';
  emailPassword = '';
  savingEmail = false;
  emailSuccess = '';
  emailError = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingPassword = false;
  passwordSuccess = '';
  passwordError = '';

  exportingData = false;
  exportError = '';

  showDeleteConfirm = false;
  deleteConfirmText = '';
  deletePassword = '';
  deletingAccount = false;
  deleteError = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.api.getProfile().subscribe(profile => {
      this.profile = profile;
      this.displayName = profile.displayName;
      this.profilePictureUrl = this.api.resolveUrl(profile.profilePictureUrl);
    });
  }

  rollLatinName() {
    this.displayName = generateLatinName(this.nameGender, this.displayName);
  }

  exportData() {
    this.exportingData = true;
    this.exportError = '';

    this.api.exportMyData().subscribe({
      next: (blob) => {
        this.exportingData = false;
        const date = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lexica-export-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.exportingData = false;
        this.exportError = typeof err.error === 'string' ? err.error : 'Fout bij het downloaden van je gegevens.';
      }
    });
  }

  canDelete(): boolean {
    if (this.deleteConfirmText !== 'VERWIJDEREN') return false;
    if (this.profile?.hasPassword && !this.deletePassword) return false;
    return true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.deleteConfirmText = '';
    this.deletePassword = '';
    this.deleteError = '';
  }

  confirmDelete() {
    if (!this.canDelete()) return;

    this.deletingAccount = true;
    this.deleteError = '';

    const password = this.profile?.hasPassword ? this.deletePassword : null;

    this.api.deleteAccount(password).subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.deletingAccount = false;
        this.deleteError = typeof err.error === 'string' ? err.error : 'Fout bij verwijderen van je account.';
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingPicture = true;
    this.profileError = '';
    this.profileSuccess = '';

    this.api.uploadProfilePicture(file).subscribe({
      next: (res) => {
        this.uploadingPicture = false;
        const fullUrl = this.api.resolveUrl(res.url)!;
        this.profilePictureUrl = fullUrl;
        this.auth.updateProfilePicture(fullUrl);
        this.profileSuccess = 'Foto geüpload.';
      },
      error: (err) => {
        this.uploadingPicture = false;
        this.profileError = typeof err.error === 'string' ? err.error : 'Fout bij uploaden.';
      }
    });

    input.value = '';
  }

  removePicture() {
    this.uploadingPicture = true;
    this.profileError = '';
    this.profileSuccess = '';

    this.api.deleteProfilePicture().subscribe({
      next: () => {
        this.uploadingPicture = false;
        this.profilePictureUrl = undefined;
        this.auth.updateProfilePicture(null);
        this.profileSuccess = 'Foto verwijderd.';
      },
      error: (err) => {
        this.uploadingPicture = false;
        this.profileError = typeof err.error === 'string' ? err.error : 'Fout bij verwijderen.';
      }
    });
  }

  saveProfile() {
    this.savingProfile = true;
    this.profileSuccess = '';
    this.profileError = '';

    this.api.updateProfile({
      displayName: this.displayName,
      profilePictureUrl: this.profilePictureUrl ?? ''
    }).subscribe({
      next: () => {
        this.savingProfile = false;
        this.profileSuccess = 'Profiel opgeslagen.';
        this.auth.updateDisplayName(this.displayName);
        this.auth.updateProfilePicture(this.profilePictureUrl || null);
      },
      error: (err) => {
        this.savingProfile = false;
        this.profileError = err.error || 'Fout bij opslaan.';
      }
    });
  }

  changeEmail() {
    this.savingEmail = true;
    this.emailSuccess = '';
    this.emailError = '';

    this.api.changeEmail({
      newEmail: this.newEmail,
      password: this.emailPassword
    }).subscribe({
      next: () => {
        this.savingEmail = false;
        this.emailSuccess = 'E-mailadres gewijzigd.';
        if (this.profile) this.profile = { ...this.profile, email: this.newEmail };
        this.newEmail = '';
        this.emailPassword = '';
      },
      error: (err) => {
        this.savingEmail = false;
        this.emailError = typeof err.error === 'string' ? err.error : 'Fout bij wijzigen.';
      }
    });
  }

  changePassword() {
    this.savingPassword = true;
    this.passwordSuccess = '';
    this.passwordError = '';

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Wachtwoorden komen niet overeen.';
      this.savingPassword = false;
      return;
    }

    this.api.changePassword({
      currentPassword: this.profile?.hasPassword ? this.currentPassword : undefined,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordSuccess = this.profile?.hasPassword
          ? 'Wachtwoord gewijzigd.'
          : 'Wachtwoord ingesteld.';
        if (this.profile) this.profile = { ...this.profile, hasPassword: true };
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        this.savingPassword = false;
        this.passwordError = typeof err.error === 'string' ? err.error : 'Fout bij wijzigen.';
      }
    });
  }
}
