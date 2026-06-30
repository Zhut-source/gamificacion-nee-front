import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ClassroomMetricsResponse {
  kpis: {
    totalEstudiantes: number;
    progresoPromedio: number;
    estudiantesConDificultad: number;
  };
  estudiantes: any[];
}

export interface StudentDetailsResponse {
  perfil: {
    nombre: string;
    email: string;
    progreso_total_porcentaje: number;
    desafios_completados_texto: string;
    ultima_actividad: string;
  };
  historial_niveles: any[];
}

@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getClassroomMetrics(aulaId: number): Observable<ClassroomMetricsResponse> {
    return this.http.get<ClassroomMetricsResponse>(
      `${this.apiUrl}/teacher/classroom-metrics/${aulaId}`,
    );
  }

  getStudentChallenges(studentId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/student/challenges/${studentId}`,
    );
  }

  getStudentDetails(studentId: number): Observable<StudentDetailsResponse> {
    return this.http.get<StudentDetailsResponse>(
      `${this.apiUrl}/teacher/student-details/${studentId}`,
    );
  }

  getChallengeDetail(studentId: number, nivel: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/student/challenge-detail/${studentId}/${nivel}`,
    );
  }

  saveAttempt(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/student/save-attempt`, data);
  }

  getStudentBadges(studentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/student/badges/${studentId}`);
  }

  awardBadge(studentId: number, badgeCode: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/student/award-badge`, {
      studentId,
      badgeCode,
    });
  }
}
