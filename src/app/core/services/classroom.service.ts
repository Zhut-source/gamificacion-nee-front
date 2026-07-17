import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Classroom {
  id?: number;
  name: string;
  code: string;
  teacher_id: number;
}

export interface StudentClassStatus {
  aula_name: string;
  code: string;
  teacher_name: string;
}

@Injectable({
  providedIn: 'root',
})
export class ClassroomService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createClass(teacherId: number, data: any) {
    const payload = {
      teacherId: teacherId,
      horarioId: data.horarioId,
      periodoId: data.periodoId,
      carreraId: data.carreraId, 
      materiaId: data.materiaId,
      nivel: data.nivel,         
      aulaNum: data.aulaNum      
    };
    return this.http.post(`${this.apiUrl}/create-class`, payload);
  }

  getTeacherClasses(teacherId: number): Observable<Classroom[]> {
    return this.http.get<Classroom[]>(
      `${this.apiUrl}/teacher-classes/${teacherId}`,
    );
  }

  getStudentClass(studentId: number): Observable<StudentClassStatus | null> {
    return this.http.get<StudentClassStatus | null>(
      `${this.apiUrl}/student-class/${studentId}`,
    );
  }

  joinClass(
    studentId: number,
    code: string,
  ): Observable<{ message: string; aula: any }> {
    return this.http.post<{ message: string; aula: any }>(
      `${this.apiUrl}/join-class`,
      { studentId, code },
    );
  }

  getCreationCatalogs(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogs/creation-data`);
  }
}
