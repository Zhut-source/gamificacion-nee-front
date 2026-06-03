import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ClassroomService, StudentClassStatus } from '@core/services/classroom.service';
import { forkJoin, timer } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  
})
export class DashboardComponent implements OnInit {

  user: any;
  currentClass: StudentClassStatus | null = null;
  isLoading: boolean = true;
  isFadingOut: boolean = false;
  progressValue: number = 60;

  constructor(
    private authService: AuthService,
    private classroomService: ClassroomService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.checkStudentClass();
  }

  /**
   * Consulta el estado del aula del estudiante de manera síncrona/reactiva
   */
  checkStudentClass(): void {
    this.isLoading = true;
    this.isFadingOut = false;

    forkJoin({
      aula: this.classroomService.getStudentClass(this.user.id),
      delayMinimo: timer(800) 
    }).subscribe({
      next: ({ aula }) => {
        this.currentClass = aula;
        
        // 1. Activamos la animación de salida en el CSS
        this.isFadingOut = true; 
        
        // 2. Esperamos a que termine el fade-out (300ms) antes de destruir el nodo del DOM
        setTimeout(() => {
          this.isLoading = false;
          this.isFadingOut = false;
        }, 300); 
      },
      error: (err) => {
        console.error('Error al verificar el aula:', err);
        this.currentClass = null;
        this.isLoading = false;
      }
    });
  }

  /**
   * Redirige al perfil enviando un "ancla" o fragmento para el scroll automático
   */
  goToJoinClass(): void {
    this.router.navigate(['/student/profile'], { fragment: 'class-code' });
  }

}
