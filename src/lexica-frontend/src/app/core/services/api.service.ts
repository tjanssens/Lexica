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

  // Groups
  getGroups(language?: string): Observable<GroupDto[]> {
    let params = new HttpParams();
    if (language) params = params.set('language', language);
    return this.http.get<GroupDto[]>(`${this.baseUrl}/groups`, { params });
  }

  getGroup(id: string): Observable<GroupDto> {
    return this.http.get<GroupDto>(`${this.baseUrl}/groups/${id}`);
  }

  createGroup(group: CreateGroupRequest): Observable<GroupDto> {
    return this.http.post<GroupDto>(`${this.baseUrl}/groups`, group);
  }

  updateGroup(id: string, group: UpdateGroupRequest): Observable<GroupDto> {
    return this.http.put<GroupDto>(`${this.baseUrl}/groups/${id}`, group);
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/groups/${id}`);
  }

  getGroupWords(groupId: string): Observable<WordDto[]> {
    return this.http.get<WordDto[]>(`${this.baseUrl}/groups/${groupId}/words`);
  }

  addWordsToGroup(groupId: string, request: AddWordsToGroupRequest): Observable<{ added: number }> {
    return this.http.post<{ added: number }>(`${this.baseUrl}/groups/${groupId}/words`, request);
  }

  removeWordsFromGroup(groupId: string, wordIds: string[]): Observable<{ removed: number }> {
    return this.http.delete<{ removed: number }>(`${this.baseUrl}/groups/${groupId}/words`, { body: wordIds });
  }

  // Stats
  getStats(): Observable<UserStatsDto> {
    return this.http.get<UserStatsDto>(`${this.baseUrl}/stats`);
  }

  getWeeklyStats(): Observable<WeeklyStatsDto> {
    return this.http.get<WeeklyStatsDto>(`${this.baseUrl}/stats/weekly`);
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

export interface GroupDto {
  id: string;
  name: string;
  language: string;
  defaultDirection: string;
  wordCount: number;
  masteredWordCount: number;
  inProgressWordCount: number;
  createdAt: string;
}

export interface CreateGroupRequest {
  name: string;
  language: string;
  defaultDirection: string;
  fromNumber?: number;
  toNumber?: number;
}

export interface UpdateGroupRequest {
  name?: string;
  defaultDirection?: string;
}

export interface AddWordsToGroupRequest {
  wordIds?: string[];
  fromNumber?: number;
  toNumber?: number;
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
