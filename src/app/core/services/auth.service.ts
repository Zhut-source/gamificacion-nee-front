import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  fromEvent,
  merge,
  Observable,
  Subscription,
  tap,
} from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  private isLoggedIn$$ = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedIn$$.asObservable();

  private idleSubscription?: Subscription;
  private readonly TIMEOUT_INACTIVIDAD = 10 * 60 * 1000;
  private timerId: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
  ) {
    this.checkInitialToken();
  }

  private checkInitialToken() {
    const token = localStorage.getItem('token');
    if (token) {
      this.isLoggedIn$$.next(true);
      this.initActivityTracker();
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.isLoggedIn$$.next(true);
        this.initActivityTracker();
      }),
    );
  }

  logout() {
    this.initActivityTracker();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn$$.next(false);
    this.router.navigate(['/login']);
  }

  getCurrentUser() {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  private initActivityTracker() {
    this.stopActivityTracker();
    this.ngZone.runOutsideAngular(() => {
      const mouseMove$ = fromEvent(document, 'mousemove');
      const clicks$ = fromEvent(document, 'click');
      const keypress$ = fromEvent(document, 'keypress');
      const scroll$ = fromEvent(document, 'scroll');
      const userActivity$ = merge(mouseMove$, clicks$, keypress$, scroll$);
      this.resetTimer();
      this.idleSubscription = userActivity$.subscribe(() => {
        this.resetTimer();
      });
    });
  }

  private resetTimer() {
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.ngZone.run(() => {
        alert('Tu sesión ha expirado por inactividad.');
        this.logout();
      });
    }, this.TIMEOUT_INACTIVIDAD);
  }

  private stopActivityTracker() {
    clearTimeout(this.timerId);
    if (this.idleSubscription) {
      this.idleSubscription.unsubscribe();
    }
  }
}
