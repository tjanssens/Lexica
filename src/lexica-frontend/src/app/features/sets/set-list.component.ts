import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService, SetDto, PublicSetDto } from '../../core/services/api.service';
import { SetItemComponent } from '../../shared/components/set-item.component';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  selector: 'app-set-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SetItemComponent, LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Sets</h1>
        <a routerLink="/sets/new" class="add-btn"><i class="fa-solid fa-plus"></i></a>
      </header>

      <div class="tabs">
        <button [class.active]="tab === 'mine'" (click)="tab = 'mine'; loadSets()">Mijn sets</button>
        <button [class.active]="tab === 'discover'" (click)="tab = 'discover'; loadPublicSets()">Ontdek</button>
      </div>

      @if (tab === 'mine') {
        <div class="filter">
          <select [(ngModel)]="languageFilter" (change)="loadSets()">
            <option value="">Alle talen</option>
            <option value="Latin">Latijn</option>
            <option value="Greek">Grieks</option>
          </select>
        </div>

        @if (loading) {
          <app-loading message="Sets laden..."></app-loading>
        } @else {
          <div class="set-list">
            @for (set of sets; track set.id) {
              <app-set-item [set]="set"></app-set-item>
            } @empty {
              <div class="empty-state">
                <p>Nog geen sets.</p>
                <a routerLink="/sets/new">Maak je eerste set aan</a>
              </div>
            }
          </div>
        }
      }

      @if (tab === 'discover') {
        <div class="filter discover-filter">
          <select [(ngModel)]="discoverLanguage" (change)="loadPublicSets()">
            <option value="">Alle talen</option>
            <option value="Latin">Latijn</option>
            <option value="Greek">Grieks</option>
          </select>
          <input type="text" [(ngModel)]="searchQuery" (input)="loadPublicSets()" placeholder="Zoek sets..." class="search-input" />
        </div>

        @if (loading) {
          <app-loading message="Sets ontdekken..."></app-loading>
        } @else {
          <div class="set-list">
            @for (pset of publicSets; track pset.id) {
              <div class="public-set-item">
                <a [routerLink]="pset.isSubscribed ? ['/sets', pset.id] : null" class="public-set-info" [class.clickable]="pset.isSubscribed">
                  <span class="set-lang"><i class="fa-solid" [class.fa-landmark]="pset.language === 'Latin'" [class.fa-scroll]="pset.language !== 'Latin'"></i></span>
                  <div class="set-details">
                    <strong>{{ pset.name }}</strong>
                    @if (pset.description) {
                      <span class="set-desc">{{ pset.description }}</span>
                    }
                    <div class="set-meta">
                      <span class="owner">
                        @if (pset.ownerPictureUrl) {
                          <img [src]="api.resolveUrl(pset.ownerPictureUrl)" class="owner-avatar" />
                        }
                        {{ pset.ownerName }}
                      </span>
                      <span class="meta-sep">·</span>
                      <span>{{ pset.wordCount }} woorden</span>
                      @if (pset.subscriberCount > 0) {
                        <span class="meta-sep">·</span>
                        <span>{{ pset.subscriberCount }} abonnees</span>
                      }
                    </div>
                  </div>
                </a>
                <button class="subscribe-btn" [class.subscribed]="pset.isSubscribed" (click)="toggleSubscribe(pset)">
                  {{ pset.isSubscribed ? 'Uitschrijven' : 'Abonneren' }}
                </button>
              </div>
            } @empty {
              <div class="empty-state">
                <p>Geen publieke sets gevonden.</p>
              </div>
            }
          </div>
        }
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

    .back-btn, .add-btn { color: white; text-decoration: none; font-size: 1.5rem; width: 2rem; text-align: center; }
    h1 { flex: 1; font-size: 1.25rem; margin: 0; }

    .tabs {
      display: flex; padding: 0.75rem 1rem 0; gap: 0.25rem;
      button {
        flex: 1; padding: 0.6rem; border: none; border-radius: 8px 8px 0 0;
        font-size: 0.9rem; font-weight: 600; cursor: pointer;
        background: #e0e0e0; color: #888;
        &.active { background: white; color: #0f3460; }
      }
    }

    .filter { padding: 1rem; }
    .filter select {
      padding: 0.6rem 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 0.9rem;
      background: white;
    }

    .discover-filter {
      display: flex; gap: 0.5rem; align-items: center;
    }

    .search-input {
      flex: 1; padding: 0.6rem 0.75rem;
      border: 2px solid #e0e0e0; border-radius: 8px;
      font-size: 0.9rem; background: white;
      &:focus { outline: none; border-color: #0f3460; }
    }

    .set-list { padding: 0 1rem 1rem; }

    .public-set-item {
      display: flex; align-items: center; gap: 0.5rem;
      background: white; border-radius: 10px; padding: 1rem;
      margin-bottom: 0.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .public-set-info {
      flex: 1; display: flex; gap: 0.75rem; align-items: flex-start;
      text-decoration: none; color: inherit;
      &.clickable { cursor: pointer; }
    }

    .set-lang { font-size: 1.3rem; padding-top: 0.1rem; }

    .set-details {
      flex: 1; display: flex; flex-direction: column; gap: 0.15rem;
      strong { color: #1a1a2e; font-size: 0.9rem; }
    }

    .set-desc { font-size: 0.8rem; color: #666; }

    .set-meta {
      display: flex; align-items: center; gap: 0.35rem;
      font-size: 0.75rem; color: #888; margin-top: 0.15rem;
    }

    .meta-sep { color: #ccc; }

    .owner { display: flex; align-items: center; gap: 0.25rem; }

    .owner-avatar { width: 16px; height: 16px; border-radius: 50%; }

    .subscribe-btn {
      padding: 0.5rem 0.85rem; border: 2px solid #0f3460;
      border-radius: 8px; font-size: 0.8rem; font-weight: 600;
      cursor: pointer; background: #0f3460; color: white;
      white-space: nowrap; transition: all 0.2s;
      &:hover { background: #1a1a2e; border-color: #1a1a2e; }
      &.subscribed { background: white; color: #888; border-color: #e0e0e0; }
      &.subscribed:hover { border-color: #dc2626; color: #dc2626; }
    }

    .empty-state {
      text-align: center; padding: 3rem 1rem; color: #888;
      a { display: inline-block; margin-top: 0.75rem; color: #0f3460; font-weight: 600; text-decoration: none; }
    }
  `]
})
export class SetListComponent implements OnInit {
  sets: SetDto[] = [];
  publicSets: PublicSetDto[] = [];
  languageFilter = '';
  discoverLanguage = '';
  searchQuery = '';
  tab: 'mine' | 'discover' = 'mine';
  loading = true;

  constructor(
    public api: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Check for query parameter to open discover tab
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'discover') {
        this.tab = 'discover';
        this.loadPublicSets();
      } else {
        this.loadSets();
      }
    });
  }

  loadSets() {
    this.loading = true;
    this.api.getSets(this.languageFilter || undefined).subscribe(s => {
      this.sets = s;
      this.loading = false;
    });
  }

  loadPublicSets() {
    this.loading = true;
    this.api.getPublicSets(
      this.discoverLanguage || undefined,
      this.searchQuery || undefined
    ).subscribe(s => {
      this.publicSets = s;
      this.loading = false;
    });
  }

  toggleSubscribe(pset: PublicSetDto) {
    if (pset.isSubscribed) {
      this.api.unsubscribeFromSet(pset.id).subscribe(() => {
        pset.isSubscribed = false;
        pset.subscriberCount--;
      });
    } else {
      this.api.subscribeToSet(pset.id).subscribe(() => {
        pset.isSubscribed = true;
        pset.subscriberCount++;
      });
    }
  }
}
