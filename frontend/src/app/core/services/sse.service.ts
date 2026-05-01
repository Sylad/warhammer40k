import { DestroyRef, Injectable, inject } from '@angular/core';
import { Observable, Subject, filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';

interface AppEvent<T = unknown> { type: string; data: T; }

@Injectable({ providedIn: 'root' })
export class SseService {
  private readonly subject$ = new Subject<AppEvent>();
  private source: EventSource | null = null;

  constructor() {
    this.connect();
    inject(DestroyRef).onDestroy(() => this.source?.close());
  }

  events$<T = unknown>(type: string): Observable<T> {
    return this.subject$.asObservable().pipe(
      filter((e) => e.type === type),
      map((e) => e.data as T),
    );
  }

  private connect(): void {
    this.source = new EventSource(`${environment.apiUrl}/events`);
    this.source.onmessage = (ev: MessageEvent) => {
      try {
        const parsed: AppEvent = JSON.parse(ev.data);
        this.subject$.next(parsed);
      } catch {
        // ignore malformed payloads
      }
    };
  }
}
