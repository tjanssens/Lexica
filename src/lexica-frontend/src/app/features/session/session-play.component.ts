import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface SessionWord {
  wordId: string;
  term: string;
  translation: string;
  partOfSpeech?: string;
  notes?: string;
  isNew: boolean;
}

@Component({
  selector: 'app-session-play',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    @if (completed) {
      <div class="completed-screen">
        <div class="completed-card">
          <h1>Sessie voltooid!</h1>
          <div class="stats-grid">
            <div class="stat">
              <span class="stat-val">{{ totalWords }}</span>
              <span class="stat-lbl">Totaal</span>
            </div>
            <div class="stat known">
              <span class="stat-val">{{ knownCount }}</span>
              <span class="stat-lbl">Gekend</span>
            </div>
            <div class="stat easy">
              <span class="stat-val">{{ easyCount }}</span>
              <span class="stat-lbl">Moeiteloos</span>
            </div>
            <div class="stat unknown">
              <span class="stat-val">{{ unknownCount }}</span>
              <span class="stat-lbl">Niet gekend</span>
            </div>
          </div>
          <div class="xp-earned">+{{ totalXp }} XP</div>
          <div class="accuracy">{{ accuracy }}% nauwkeurigheid</div>
          <div class="completed-actions">
            <a routerLink="/" class="btn-primary">Naar home</a>
            <a routerLink="/session" class="btn-secondary">Nieuwe sessie</a>
          </div>
        </div>
      </div>
    } @else if (currentWord) {
      <div class="session-screen">
        <div class="session-top-bar">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPercent"></div>
          </div>
          <button class="close-btn" (click)="pauseSession()" title="Pauzeer sessie">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="flashcard-container"
          (touchstart)="onTouchStart($event)"
          (touchend)="onTouchEnd($event)"
          (click)="flipCard()">

          <div class="flashcard" [class.flipped]="flipped"
            [class.swipe-left]="swipeClass === 'left'"
            [class.swipe-right]="swipeClass === 'right'"
            [class.swipe-up]="swipeClass === 'up'">

            <div class="card-front">
              <div class="card-content">
                @if (currentWord.isNew) {
                  <span class="new-badge">Nieuw</span>
                }
                <span class="card-text">{{ frontText }}</span>
                <span class="tap-hint">Tik om te draaien</span>
              </div>
            </div>

            <div class="card-back">
              <div class="card-content">
                <span class="card-text">{{ backText }}</span>
                @if (currentWord.partOfSpeech) {
                  <span class="card-meta">{{ currentWord.partOfSpeech }}</span>
                }
                @if (currentWord.notes) {
                  <span class="card-notes">{{ currentWord.notes }}</span>
                }
              </div>
              <button class="note-icon-btn" (click)="openNoteModal($event)" title="Notitie toevoegen">
                <i class="fa-solid" [class.fa-pen-to-square]="currentWord.notes" [class.fa-note-sticky]="!currentWord.notes"></i>
              </button>
            </div>
          </div>
        </div>

        @if (flipped) {
          <div class="action-buttons">
            <button class="action-btn unknown" (click)="answer('Unknown')">
              <span class="btn-icon"><i class="fa-solid fa-xmark"></i></span>
              <span>Niet gekend</span>
            </button>
            <button class="action-btn easy" (click)="answer('Easy')">
              <span class="btn-icon"><i class="fa-solid fa-star"></i></span>
              <span>Moeiteloos</span>
            </button>
            <button class="action-btn known" (click)="answer('Known')">
              <span class="btn-icon"><i class="fa-solid fa-check"></i></span>
              <span>Gekend</span>
            </button>
          </div>
        }
      </div>

    @if (noteModalOpen && currentWord) {
      <div class="modal-overlay" (click)="closeNoteModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Notitie</h3>
          <textarea
            [(ngModel)]="noteText"
            placeholder="Voeg een notitie toe..."
            rows="4"
          ></textarea>
          <div class="modal-actions">
            <button class="modal-btn cancel" (click)="closeNoteModal()">Annuleer</button>
            <button class="modal-btn save" (click)="saveNote()">Bewaren</button>
          </div>
        </div>
      </div>
    }
    } @else {
      <div class="loading">Sessie laden...</div>
    }
  `,
  styles: [`
    .session-screen { min-height: 100vh; background: #1a1a2e; display: flex; flex-direction: column; }

    .session-top-bar {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem 0;
    }

    .progress-bar {
      flex: 1;
      height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px;
      .progress-fill { height: 100%; background: #f59e0b; transition: width 0.3s; border-radius: 2px; }
    }

    .close-btn {
      background: rgba(255,255,255,0.15); border: none; color: white;
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; cursor: pointer; flex-shrink: 0;
      transition: background 0.2s;
      &:hover { background: rgba(255,255,255,0.3); }
    }

    .session-info {
      display: flex; justify-content: space-between; padding: 0.75rem 1.5rem;
      color: rgba(255,255,255,0.6); font-size: 0.85rem;
    }

    .flashcard-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      perspective: 1000px;
    }

    .flashcard {
      width: 100%;
      max-width: 350px;
      height: 300px;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.5s;
      cursor: pointer;

      &.flipped { transform: rotateY(180deg); }

      &.swipe-left { animation: slideLeft 0.3s; }
      &.swipe-right { animation: slideRight 0.3s; }
      &.swipe-up { animation: slideUp 0.3s; }
    }

    .card-front, .card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-front { background: white; }
    .card-back { background: #f0f4ff; transform: rotateY(180deg); position: relative; }

    .card-content {
      text-align: center;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .new-badge {
      background: #f59e0b;
      color: white;
      padding: 0.2rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .card-text { font-size: 1.75rem; font-weight: 700; color: #1a1a2e; }
    .card-meta { font-size: 0.9rem; color: #666; font-style: italic; }
    .card-notes { font-size: 0.8rem; color: #888; margin-top: auto; padding-top: 0.5rem; }
    .tap-hint { font-size: 0.75rem; color: #ccc; margin-top: 1rem; }

    .note-icon-btn {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(0,0,0,0.08);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #666;
      font-size: 0.85rem;
      transition: background 0.2s, color 0.2s;
      transform: rotateY(180deg);
      &:hover { background: rgba(0,0,0,0.15); color: #333; }
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1.5rem;
    }

    .modal-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      width: 100%;
      max-width: 360px;

      h3 { margin: 0 0 1rem; font-size: 1.1rem; color: #1a1a2e; }

      textarea {
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 0.75rem;
        font-size: 0.95rem;
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
        &:focus { outline: none; border-color: #0f3460; }
      }
    }

    .modal-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      justify-content: flex-end;
    }

    .modal-btn {
      padding: 0.6rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }

    .modal-btn.cancel { background: #e0e0e0; color: #333; }
    .modal-btn.save { background: #0f3460; color: white; }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
      padding: 0 1.5rem 2rem;
    }

    .action-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      padding: 1rem 0.5rem;
      border: none;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s;

      &:hover { transform: scale(1.05); }

      .btn-icon { font-size: 1.5rem; }
    }

    .action-btn.unknown { background: #fee2e2; color: #dc2626; }
    .action-btn.known { background: #d4edda; color: #155724; }
    .action-btn.easy { background: #fef3c7; color: #b45309; }

    .completed-screen {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e, #0f3460);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .completed-card {
      background: white;
      border-radius: 20px;
      padding: 2.5rem;
      width: 100%;
      max-width: 400px;
      text-align: center;

      h1 { font-size: 1.5rem; color: #155724; margin: 0 0 1.5rem; }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .stat {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1rem;
    }

    .stat-val { display: block; font-size: 1.75rem; font-weight: 700; }
    .stat-lbl { font-size: 0.8rem; color: #666; }
    .stat.known .stat-val { color: #155724; }
    .stat.easy .stat-val { color: #b45309; }
    .stat.unknown .stat-val { color: #dc2626; }

    .xp-earned {
      font-size: 2rem;
      font-weight: 700;
      color: #f59e0b;
      margin-bottom: 0.25rem;
    }

    .accuracy {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }

    .completed-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .btn-primary, .btn-secondary {
      display: block;
      padding: 0.85rem;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1rem;
      text-align: center;
    }

    .btn-primary { background: #0f3460; color: white; }
    .btn-secondary { background: #e0e0e0; color: #333; }

    .loading {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      background: #1a1a2e;
    }

    @keyframes slideLeft { 0% { transform: translateX(0) rotateY(180deg); } 100% { transform: translateX(-100px) rotateY(180deg); opacity: 0; } }
    @keyframes slideRight { 0% { transform: translateX(0) rotateY(180deg); } 100% { transform: translateX(100px) rotateY(180deg); opacity: 0; } }
    @keyframes slideUp { 0% { transform: translateY(0) rotateY(180deg); } 100% { transform: translateY(-100px) rotateY(180deg); opacity: 0; } }
  `]
})
export class SessionPlayComponent implements OnInit {
  stack: SessionWord[] = [];
  reviewed = new Set<string>();
  currentWord: SessionWord | null = null;
  currentIndex = 0;
  flipped = false;
  swipeClass = '';
  direction = 'NlToTarget';
  completed = false;

  // Stats
  totalWords = 0;
  knownCount = 0;
  unknownCount = 0;
  easyCount = 0;
  totalXp = 0;
  firstAttempts = new Map<string, string>(); // wordId -> first result

  // Notes modal
  noteModalOpen = false;
  noteText = '';

  // Touch
  private startX = 0;
  private startY = 0;
  private threshold = 50;

  private readonly baseUrl = `${environment.apiUrl}/sessions`;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    // Check for a paused session first
    const pausedStr = sessionStorage.getItem('session_paused');
    if (pausedStr) {
      const paused = JSON.parse(pausedStr);
      this.stack = paused.stack;
      this.reviewed = new Set<string>(paused.reviewed);
      this.direction = paused.direction;
      this.totalWords = paused.totalWords;
      this.knownCount = paused.knownCount;
      this.unknownCount = paused.unknownCount;
      this.easyCount = paused.easyCount;
      this.totalXp = paused.totalXp;
      this.firstAttempts = new Map<string, string>(paused.firstAttempts);
      sessionStorage.removeItem('session_paused');
      this.showNext();
      return;
    }

    const configStr = sessionStorage.getItem('session_config');
    if (!configStr) {
      this.router.navigate(['/session']);
      return;
    }

    const config = JSON.parse(configStr);
    this.direction = config.direction;

    this.http.post<SessionWord[]>(`${this.baseUrl}/next`, {
      setIds: config.setIds,
      direction: config.direction,
      sessionSize: config.sessionSize
    }).subscribe({
      next: (words) => {
        this.stack = this.shuffle([...words]);
        this.totalWords = words.length;
        this.showNext();
      },
      error: () => this.router.navigate(['/session'])
    });
  }

  get frontText(): string {
    if (!this.currentWord) return '';
    return this.direction === 'NlToTarget' ? this.currentWord.translation : this.currentWord.term;
  }

  get backText(): string {
    if (!this.currentWord) return '';
    return this.direction === 'NlToTarget' ? this.currentWord.term : this.currentWord.translation;
  }

  get progressPercent(): number {
    if (this.totalWords === 0) return 0;
    return (this.reviewed.size / this.totalWords) * 100;
  }

  get accuracy(): number {
    const total = this.firstAttempts.size;
    if (total === 0) return 0;
    const correct = Array.from(this.firstAttempts.values()).filter(r => r !== 'Unknown').length;
    return Math.round((correct / total) * 100);
  }

  flipCard() {
    this.flipped = !this.flipped;
  }

  answer(result: 'Unknown' | 'Known' | 'Easy') {
    if (!this.currentWord) return;

    const wordId = this.currentWord.wordId;

    // Track first attempt
    if (!this.firstAttempts.has(wordId)) {
      this.firstAttempts.set(wordId, result);

      // Send SM-2 update only on first attempt
      this.http.post<any>(`${this.baseUrl}/review`, {
        wordId,
        direction: this.direction,
        result
      }).subscribe(res => {
        this.totalXp += res.xpEarned;
      });
    }

    // Update counters
    if (result === 'Unknown') {
      this.unknownCount++;
      // Put back in stack
      this.stack.push(this.currentWord);
    } else if (result === 'Known') {
      this.knownCount++;
      this.reviewed.add(wordId);
    } else {
      this.easyCount++;
      this.reviewed.add(wordId);
    }

    // Animate and show next
    this.swipeClass = result === 'Unknown' ? 'left' : result === 'Easy' ? 'up' : 'right';
    setTimeout(() => {
      this.swipeClass = '';
      this.flipped = false;
      this.showNext();
    }, 300);
  }

  showNext() {
    if (this.stack.length === 0) {
      this.completed = true;
      sessionStorage.removeItem('session_paused');
      return;
    }
    this.currentWord = this.stack.shift()!;
    this.currentIndex++;
  }

  pauseSession() {
    // Save current word back to the front of the stack
    if (this.currentWord) {
      this.stack.unshift(this.currentWord);
    }

    const pausedState = {
      stack: this.stack,
      reviewed: Array.from(this.reviewed),
      direction: this.direction,
      totalWords: this.totalWords,
      knownCount: this.knownCount,
      unknownCount: this.unknownCount,
      easyCount: this.easyCount,
      totalXp: this.totalXp,
      firstAttempts: Array.from(this.firstAttempts.entries())
    };

    sessionStorage.setItem('session_paused', JSON.stringify(pausedState));
    this.router.navigate(['/']);
  }

  onTouchStart(event: TouchEvent) {
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
  }

  onTouchEnd(event: TouchEvent) {
    if (!this.flipped) return;

    const deltaX = event.changedTouches[0].clientX - this.startX;
    const deltaY = event.changedTouches[0].clientY - this.startY;

    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -this.threshold) {
      this.answer('Easy');
    } else if (deltaX > this.threshold) {
      this.answer('Known');
    } else if (deltaX < -this.threshold) {
      this.answer('Unknown');
    }
  }

  openNoteModal(event: Event) {
    event.stopPropagation();
    if (!this.currentWord) return;
    this.noteText = this.currentWord.notes || '';
    this.noteModalOpen = true;
  }

  closeNoteModal() {
    this.noteModalOpen = false;
  }

  saveNote() {
    if (!this.currentWord) return;
    const wordId = this.currentWord.wordId;
    const notes = this.noteText.trim() || undefined;

    this.http.put<any>(`${environment.apiUrl}/words/${wordId}`, { notes: notes ?? '' }).subscribe({
      next: () => {
        if (this.currentWord && this.currentWord.wordId === wordId) {
          this.currentWord.notes = notes;
        }
        // Also update in the stack for paused sessions
        const inStack = this.stack.find(w => w.wordId === wordId);
        if (inStack) inStack.notes = notes;
      }
    });

    this.noteModalOpen = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.noteModalOpen) {
        this.closeNoteModal();
      } else {
        this.pauseSession();
      }
      return;
    }

    if (this.noteModalOpen) return;

    if (!this.currentWord) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!this.flipped) this.flipCard();
    } else if (this.flipped) {
      if (event.key === 'ArrowLeft' || event.key === '1') this.answer('Unknown');
      else if (event.key === 'ArrowRight' || event.key === '2') this.answer('Known');
      else if (event.key === 'ArrowUp' || event.key === '3') this.answer('Easy');
    }
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
