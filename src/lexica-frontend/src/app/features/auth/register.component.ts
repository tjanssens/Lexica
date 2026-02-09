import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Lexica</h1>
        <p class="subtitle">Maak een account aan</p>

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

          <div class="form-group">
            <label for="password">Wachtwoord</label>
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              minlength="6"
              placeholder="Minimaal 6 tekens"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Wachtwoord bevestigen</label>
            <input
              id="confirmPassword"
              type="password"
              [(ngModel)]="confirmPassword"
              name="confirmPassword"
              required
              placeholder="Herhaal wachtwoord"
            />
          </div>

          @if (error) {
            <div class="error">{{ error }}</div>
          }

          <button type="submit" [disabled]="loading">
            {{ loading ? 'Bezig...' : 'Registreren' }}
          </button>
        </form>

        <p class="auth-link">
          Al een account? <a routerLink="/login">Inloggen</a>
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
      font-size: 2rem;
      color: #1a1a2e;
      margin: 0 0 0.25rem;
      font-weight: 700;
    }

    .subtitle {
      color: #666;
      margin: 0 0 2rem;
      font-size: 0.9rem;
    }

    .auth-form {
      text-align: left;
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

      &:hover:not(:disabled) {
        background: #1a1a2e;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .auth-link {
      margin-top: 1.5rem;
      color: #666;
      font-size: 0.9rem;

      a {
        color: #0f3460;
        text-decoration: none;
        font-weight: 600;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class RegisterComponent {
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService) {}

  onSubmit() {
    if (this.password !== this.confirmPassword) {
      this.error = 'Wachtwoorden komen niet overeen.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.register(this.email, this.password).subscribe({
      next: (res) => {
        this.auth.handleAuthResponse(res);
        this.loading = false;
      },
      error: (err) => {
        const errors = err.error;
        if (Array.isArray(errors)) {
          this.error = errors.map((e: any) => e.description).join(' ');
        } else {
          this.error = 'Registratie mislukt. Probeer het opnieuw.';
        }
        this.loading = false;
      }
    });
  }
}
