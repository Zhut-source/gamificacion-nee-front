import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, fromEvent, merge, Observable, Subscription, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000'; // La URL de tu backend Node.js

  // Estado de autenticación
  private isLoggedIn$$ = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedIn$$.asObservable();

  private idleSubscription?: Subscription;
  private readonly TIMEOUT_INACTIVIDAD = 10 * 60 * 1000; // 10 minutos en milisegundos
  private timerId: any;
  

  constructor(
    private http: HttpClient, 
    private router: Router,
    private ngZone: NgZone
  ) {
    // Cuando la app inicia, verificamos si hay un token guardado
    this.checkInitialToken();
  }

  private checkInitialToken() {
    const token = localStorage.getItem('token');
    if (token) {
      this.isLoggedIn$$.next(true);
      this.initActivityTracker();
    }
  }

  // 1. Método de REGISTRO
  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  // 2. Método de LOGIN
  login(credentials: any): Observable<any> {
    // Usamos pipe(tap(...)) para interceptar la respuesta correcta ANTES de enviarla al componente
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        // Guardamos el token y los datos del usuario en la memoria del navegador
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // ¡Notificamos a toda la app (como al Header) que el usuario se logueó!
        this.isLoggedIn$$.next(true);
        this.initActivityTracker();
      })
    );
  }

  // 3. Método de LOGOUT
  logout() {
    this.initActivityTracker();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn$$.next(false);
    this.router.navigate(['/login']);
  }

  // Método auxiliar para obtener el usuario actual en cualquier parte
  getCurrentUser() {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  private initActivityTracker() {
    this.stopActivityTracker(); // Prevenir duplicación de listeners

    // Ejecutamos fuera de Angular Zone para que el detector no ralentice las animaciones de la interfaz
    this.ngZone.runOutsideAngular(() => {
      const mouseMove$ = fromEvent(document, 'mousemove');
      const clicks$ = fromEvent(document, 'click');
      const keypress$ = fromEvent(document, 'keypress');
      const scroll$ = fromEvent(document, 'scroll');

      // Unificamos todos los eventos posibles de interacción física
      const userActivity$ = merge(mouseMove$, clicks$, keypress$, scroll$);

      this.resetTimer(); // Iniciar primer conteo

      this.idleSubscription = userActivity$.subscribe(() => {
        this.resetTimer(); // Si hay señal de vida, reseteamos el reloj
      });
    });
  }

  private resetTimer() {
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      // Al cumplirse el plazo, reingresamos a la zona de Angular para actualizar la UI y redirigir
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