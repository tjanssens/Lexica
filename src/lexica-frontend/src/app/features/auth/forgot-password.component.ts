import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Wachtwoord vergeten</h1>
        <p class="subtitle">Vul je e-mailadres in en we sturen je een link om je wachtwoord opnieuw in te stellen.</p>

        @if (sent) {
          <div class="success">
            Als er een account bestaat met dit e-mailadres, hebben we een reset-link verstuurd.
            Check je inbox (en eventueel je spam-map).
          </div>
        } @else {
          <form (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label for="email">E-mail</label>
              <input
                id="email"
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="je@email.com"
              />
            </div>

            @if (error) {
              <div class="error">{{ error }}</div>
            }

            <button type="submit" [disabled]="loading">
              {{ loading ? 'Bezig...' : 'Stuur reset-link' }}
            </button>
          </form>
        }

        <p class="auth-link">
          <a routerLink="/login">← Terug naar inloggen</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 1rem;
    }

    .auth-card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }

    h1 {
      font-size: 1.5rem;
      color: #1a1a2e;
      margin: 0 0 0.5rem;
      font-weight: 700;
    }

    .subtitle {
      color: #666;
      margin: 0 0 1.75rem;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .auth-form { text-align: left; }

    .form-group { margin-bottom: 1.25rem; }

    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.4rem;
    }

    input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #0f3460;
      }
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
      color: #166534;
      padding: 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      line-height: 1.5;
      text-align: left;
    }

    button {
      width: 100%;
      padding: 0.85rem;
      background: #0f3460;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;

      &:hover:not(:disabled) { background: #1a1a2e; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .auth-link {
      margin-top: 1.5rem;
      color: #666;
      font-size: 0.9rem;

      a {
        color: #0f3460;
        text-decoration: none;
        font-weight: 600;

        &:hover { text-decoration: underline; }
      }
    }
  `]
})
export class ForgotPasswordComponent {
  email = '';
  error = '';
  loading = false;
  sent = false;

  constructor(private api: ApiService) {}

  onSubmit() {
    this.loading = true;
    this.error = '';

    this.api.forgotPassword(this.email).subscribe({
      next: () => {
        this.sent = true;
        this.loading = false;
      },
      error: () => {
        this.error = 'Er ging iets mis. Probeer het later opnieuw.';
        this.loading = false;
      }
    });
  }
}
