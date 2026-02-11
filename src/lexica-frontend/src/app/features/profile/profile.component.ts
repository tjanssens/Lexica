import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, UserProfileDto } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Profiel</h1>
      </header>

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
              <input type="text" [(ngModel)]="displayName" name="displayName" required />
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
  `]
})
export class ProfileComponent implements OnInit {
  profile: UserProfileDto | null = null;

  displayName = '';
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

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.api.getProfile().subscribe(profile => {
      this.profile = profile;
      this.displayName = profile.displayName;
      this.profilePictureUrl = this.api.resolveUrl(profile.profilePictureUrl);
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
