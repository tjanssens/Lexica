import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { ApiService, NotificationStatusDto } from './api.service';
import { environment } from '../../../environments/environment';

/**
 * Beheert Web Push: aan-/uitzetten (subscriben/unsubscriben), voorkeuren en testnotificatie.
 * De eigenlijke notificatie-weergave gebeurt door de Angular service worker (ngsw).
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  constructor(
    private swPush: SwPush,
    private api: ApiService,
    private router: Router
  ) {
    if (this.swPush.isEnabled) {
      // Klik op een notificatie → navigeer naar de meegegeven url.
      this.swPush.notificationClicks.subscribe(({ notification }) => {
        const url = (notification.data && notification.data.url) || '/';
        this.router.navigateByUrl(url);
      });
    }
  }

  /** Push bruikbaar: service worker actief, browser ondersteunt Notification, en VAPID-key aanwezig. */
  get supported(): boolean {
    return this.swPush.isEnabled && 'Notification' in window && !!environment.vapidPublicKey;
  }

  get permission(): NotificationPermission | 'unsupported' {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }

  status(): Observable<NotificationStatusDto> {
    return this.api.getNotificationStatus();
  }

  /** Vraag toestemming, subscribe in de browser en sla op bij de backend. */
  async enable(): Promise<void> {
    if (!this.supported) {
      throw new Error('Push wordt niet ondersteund in deze browser of is nog niet geconfigureerd.');
    }
    const sub = await this.swPush.requestSubscription({ serverPublicKey: environment.vapidPublicKey });
    const json = sub.toJSON();
    await firstValueFrom(this.api.subscribeToNotifications({
      endpoint: sub.endpoint,
      p256dh: json.keys?.['p256dh'] ?? '',
      auth: json.keys?.['auth'] ?? ''
    }));
  }

  /** Volledig uitzetten: browser-subscription opzeggen + bij backend verwijderen. */
  async disable(): Promise<void> {
    let endpoint: string | undefined;
    try {
      const sub = await firstValueFrom(this.swPush.subscription);
      endpoint = sub?.endpoint;
      if (sub) {
        await this.swPush.unsubscribe();
      }
    } catch {
      // negeer; we verwijderen hieronder hoe dan ook bij de backend
    }
    await firstValueFrom(this.api.unsubscribeFromNotifications(endpoint));
  }

  setPreferences(prefs: {
    dailyReminderEnabled: boolean;
    eveningNudgeEnabled: boolean;
    dailyReminderTime: string;
    eveningNudgeTime: string;
  }): Observable<NotificationStatusDto> {
    return this.api.updateNotificationPreferences(prefs);
  }

  sendTest(): Observable<void> {
    return this.api.sendTestNotification();
  }
}
