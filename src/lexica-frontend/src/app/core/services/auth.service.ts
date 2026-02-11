import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, AuthResponse } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'lexica_token';
  private readonly EMAIL_KEY = 'lexica_email';
  private readonly DISPLAY_NAME_KEY = 'lexica_display_name';
  private readonly PROFILE_PIC_KEY = 'lexica_profile_pic';

  private tokenSignal = signal<string | null>(this.getStoredToken());

  isAuthenticated = computed(() => !!this.tokenSignal());
  userEmail = computed(() => localStorage.getItem(this.EMAIL_KEY));
  displayName = computed(() => localStorage.getItem(this.DISPLAY_NAME_KEY));
  profilePicture = computed(() => localStorage.getItem(this.PROFILE_PIC_KEY));

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
    
    // Load profile data (display name + picture) after login
    this.loadProfileData();
    
    this.router.navigate(['/']);
  }

  private loadProfileData(): void {
    this.api.getProfile().subscribe({
      next: (profile) => {
        if (profile.displayName) {
          this.updateDisplayName(profile.displayName);
        }
        if (profile.profilePictureUrl) {
          const fullUrl = this.api.resolveUrl(profile.profilePictureUrl);
          if (fullUrl) {
            this.updateProfilePicture(fullUrl);
          }
        }
      },
      error: () => {
        // Silently fail - profile data is not critical for login
      }
    });
  }

  updateDisplayName(name: string): void {
    localStorage.setItem(this.DISPLAY_NAME_KEY, name);
  }

  updateProfilePicture(url: string | null): void {
    if (url) {
      localStorage.setItem(this.PROFILE_PIC_KEY, url);
    } else {
      localStorage.removeItem(this.PROFILE_PIC_KEY);
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
    localStorage.removeItem(this.DISPLAY_NAME_KEY);
    localStorage.removeItem(this.PROFILE_PIC_KEY);
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
