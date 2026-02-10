import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, AuthResponse } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'lexica_token';
  private readonly EMAIL_KEY = 'lexica_email';

  private tokenSignal = signal<string | null>(this.getStoredToken());

  isAuthenticated = computed(() => !!this.tokenSignal());
  userEmail = computed(() => localStorage.getItem(this.EMAIL_KEY));

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  get token(): string | null {
    return this.tokenSignal();
  }

  register(email: string, password: string) {
    return this.api.register(email, password);
  }

  login(email: string, password: string) {
    return this.api.login(email, password);
  }

  googleLogin(idToken: string) {
    return this.api.googleLogin(idToken);
  }

  handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.EMAIL_KEY, response.email);
    this.tokenSignal.set(response.token);
    this.router.navigate(['/']);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
