import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000'; // La URL de tu backend Node.js

  // Estado de autenticación
  private isLoggedIn$$ = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedIn$$.asObservable();

  constructor(private http: HttpClient) {
    // Cuando la app inicia, verificamos si hay un token guardado
    this.checkInitialToken();
  }

  private checkInitialToken() {
    const token = localStorage.getItem('token');
    if (token) {
      this.isLoggedIn$$.next(true);
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
      })
    );
  }

  // 3. Método de LOGOUT
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn$$.next(false); // Notificamos que se cerró sesión
  }

  // Método auxiliar para obtener el usuario actual en cualquier parte
  getCurrentUser() {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  }
}