import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Auth
  register(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, { email, password });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password });
  }

  googleLogin(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/google`, { idToken });
  }

  // Words
  getWords(language?: string): Observable<WordDto[]> {
    let params = new HttpParams();
    if (language) params = params.set('language', language);
    return this.http.get<WordDto[]>(`${this.baseUrl}/words`, { params });
  }

  getWord(id: string): Observable<WordDto> {
    return this.http.get<WordDto>(`${this.baseUrl}/words/${id}`);
  }

  createWord(word: CreateWordRequest): Observable<WordDto> {
    return this.http.post<WordDto>(`${this.baseUrl}/words`, word);
  }

  updateWord(id: string, word: UpdateWordRequest): Observable<WordDto> {
    return this.http.put<WordDto>(`${this.baseUrl}/words/${id}`, word);
  }

  deleteWord(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/words/${id}`);
  }

  // Stats
  getStats(): Observable<UserStatsDto> {
    return this.http.get<UserStatsDto>(`${this.baseUrl}/stats`);
  }

  getWeeklyStats(): Observable<WeeklyStatsDto> {
    return this.http.get<WeeklyStatsDto>(`${this.baseUrl}/stats/weekly`);
  }

  // Profile
  getProfile(): Observable<UserProfileDto> {
    return this.http.get<UserProfileDto>(`${this.baseUrl}/profile`);
  }

  updateProfile(request: UpdateProfileRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/profile`, request);
  }

  uploadProfilePicture(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/profile/picture`, formData);
  }

  deleteProfilePicture(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/profile/picture`);
  }

  changeEmail(request: ChangeEmailRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/profile/email`, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/profile/password`, request);
  }

  resolveUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${this.baseUrl.replace('/api', '')}${url}`;
  }

  // Sets
  getSets(language?: string): Observable<SetDto[]> {
    let params = new HttpParams();
    if (language) params = params.set('language', language);
    return this.http.get<SetDto[]>(`${this.baseUrl}/sets`, { params });
  }

  getSet(id: string): Observable<SetDto> {
    return this.http.get<SetDto>(`${this.baseUrl}/sets/${id}`);
  }

  createSet(request: CreateSetRequest): Observable<SetDto> {
    return this.http.post<SetDto>(`${this.baseUrl}/sets`, request);
  }

  updateSet(id: string, request: UpdateSetRequest): Observable<SetDto> {
    return this.http.put<SetDto>(`${this.baseUrl}/sets/${id}`, request);
  }

  deleteSet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sets/${id}`);
  }

  getSetWords(setId: string): Observable<WordDto[]> {
    return this.http.get<WordDto[]>(`${this.baseUrl}/sets/${setId}/words`);
  }

  addWordsToSet(setId: string, request: AddWordsToSetRequest): Observable<{ added: number }> {
    return this.http.post<{ added: number }>(`${this.baseUrl}/sets/${setId}/words`, request);
  }

  getPublicSets(language?: string, search?: string): Observable<PublicSetDto[]> {
    let params = new HttpParams();
    if (language) params = params.set('language', language);
    if (search) params = params.set('search', search);
    return this.http.get<PublicSetDto[]>(`${this.baseUrl}/sets/public`, { params });
  }

  subscribeToSet(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sets/${id}/subscribe`, {});
  }

  unsubscribeFromSet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sets/${id}/subscribe`);
  }
}

// Interfaces
export interface AuthResponse {
  token: string;
  expiration: string;
  email: string;
}

export interface WordDto {
  id: string;
  number: number;
  language: string;
  term: string;
  translation: string;
  partOfSpeech?: string;
  notes?: string;
  easiness: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReviewed?: string;
  timesReviewed: number;
}

export interface CreateWordRequest {
  number: number;
  language: string;
  term: string;
  translation: string;
  partOfSpeech?: string;
  notes?: string;
}

export interface UpdateWordRequest {
  number?: number;
  term?: string;
  translation?: string;
  partOfSpeech?: string;
  notes?: string;
}

export interface UserStatsDto {
  xp: number;
  level: number;
  levelTitle: string;
  xpForNextLevel: number;
  streak: number;
  streakFreezeAvailable: boolean;
  totalWords: number;
  masteredWords: number;
  inProgressWords: number;
  dueToday: number;
  achievements: AchievementDto[];
}

export interface AchievementDto {
  type: string;
  title: string;
  unlockedAt: string;
}

export interface DayStatsDto {
  date: string;
  totalReviews: number;
  known: number;
  easy: number;
  unknown: number;
}

export interface WeeklyStatsDto {
  days: DayStatsDto[];
  currentStreak: number;
}

// Profile
export interface UserProfileDto {
  displayName: string;
  profilePictureUrl?: string;
  email: string;
  hasPassword: boolean;
}

export interface UpdateProfileRequest {
  displayName?: string;
  profilePictureUrl?: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

// Sets
export interface SetDto {
  id: string;
  name: string;
  language: string;
  defaultDirection: string;
  wordCount: number;
  masteredWordCount: number;
  inProgressWordCount: number;
  createdAt: string;
  isPublic: boolean;
  description?: string;
  isOwner: boolean;
  ownerName?: string;
  ownerPictureUrl?: string;
  subscriberCount: number;
}

export interface PublicSetDto {
  id: string;
  name: string;
  language: string;
  description?: string;
  wordCount: number;
  ownerName?: string;
  ownerPictureUrl?: string;
  subscriberCount: number;
  isSubscribed: boolean;
}

export interface CreateSetRequest {
  name: string;
  language: string;
  defaultDirection: string;
  fromNumber?: number;
  toNumber?: number;
}

export interface UpdateSetRequest {
  name?: string;
  defaultDirection?: string;
  isPublic?: boolean;
  description?: string;
}

export interface AddWordsToSetRequest {
  wordIds?: string[];
  fromNumber?: number;
  toNumber?: number;
}
