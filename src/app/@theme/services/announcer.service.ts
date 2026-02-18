import { Injectable, inject } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AnnouncerService {
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly politeMessageSubject = new BehaviorSubject<string>('');
  private readonly assertiveMessageSubject = new BehaviorSubject<string>('');

  readonly politeMessage$ = this.politeMessageSubject.asObservable();
  readonly assertiveMessage$ = this.assertiveMessageSubject.asObservable();

  announcePolite(message: string): void {
    this.politeMessageSubject.next(message);
    this.liveAnnouncer.announce(message, 'polite');
  }

  announceAssertive(message: string): void {
    this.assertiveMessageSubject.next(message);
    this.liveAnnouncer.announce(message, 'assertive');
  }
}
