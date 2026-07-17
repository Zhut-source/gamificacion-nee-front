import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getGlobalKpis(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/global-kpis`);
  }


  //control catalogos 
  getAllCatalogs(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/catalogs`);
  }

  createCatalogItem(tipo: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/catalogs`, { tipo, ...data });
  }

  deleteCatalogItem(tipo: string, id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/admin/catalogs/${tipo}/${id}`);
  }

  //control aulas
  // Módulo de Aulas
  getAllClassrooms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/classrooms`);
  }

  getStudentsByClassroom(aulaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/classrooms/${aulaId}/students`);
  }

  unlinkStudent(studentId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/students/${studentId}/unlink`, {});
  }

  deleteClassroom(aulaId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/admin/classrooms/${aulaId}`);
  }

  // Módulo de Contenido Pedagógico
  getAllChallenges(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/challenges`);
  }

  updateChallenge(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/challenges/${id}`, data);
  }

  // Módulo de Usuarios
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/users`);
  }

  toggleUserStatus(userId: number, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/users/${userId}/toggle-status`, { isActive });
  }
}