import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';


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
  providedIn: 'root'
})
export class ProgressService {

  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  getClassroomMetrics(aulaId: number): Observable<ClassroomMetricsResponse> {
    return this.http.get<ClassroomMetricsResponse>(`${this.apiUrl}/teacher/classroom-metrics/${aulaId}`);
  }

  // Dashboard Estudiante
  getStudentChallenges(studentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/student/challenges/${studentId}`);
  }

  // NUEVO: Detalles del Estudiante (Para el Maestro)
  getStudentDetails(studentId: number): Observable<StudentDetailsResponse> {
    return this.http.get<StudentDetailsResponse>(`${this.apiUrl}/teacher/student-details/${studentId}`);
  }

  getChallengeDetail(studentId: number, nivel: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/student/challenge-detail/${studentId}/${nivel}`);
    }

    // Guardar el resultado de la partida
    saveAttempt(data: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/student/save-attempt`, data);
    }
}
