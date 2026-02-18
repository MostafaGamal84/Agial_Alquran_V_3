import { Injectable, inject, signal } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Injectable({ providedIn: 'root' })
export class AnnouncerService {
  private liveAnnouncer = inject(LiveAnnouncer);

  readonly politeMessage = signal('');
  readonly assertiveMessage = signal('');

  announcePolite(message: string): void {
    this.politeMessage.set('');
    setTimeout(() => this.politeMessage.set(message));
    this.liveAnnouncer.announce(message, 'polite');
  }

  announceAssertive(message: string): void {
    this.assertiveMessage.set('');
    setTimeout(() => this.assertiveMessage.set(message));
    this.liveAnnouncer.announce(message, 'assertive');
  }
}
