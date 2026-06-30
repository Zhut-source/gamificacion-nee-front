import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = environment.apiUrl; 
  constructor(private http: HttpClient) {}
  updateProfile(id: number, name: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-profile`, { id, name });
  }
  changePassword(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/change-password`, data);
  }
}
