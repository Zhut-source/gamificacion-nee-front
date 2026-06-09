import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { Classroom, ClassroomService } from '@core/services/classroom.service';
import { ProgressService, ClassroomMetricsResponse } from '@core/services/progress.service';
import { forkJoin, timer } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  user: any;
  classrooms: Classroom[] = [];

  selectedAulaId: number | null = null;
  metrics: ClassroomMetricsResponse | null = null;
  isLoadingMetrics: boolean = false;
  
  // Variables idénticas al estudiante para controlar el estado y el desvanecimiento
  isLoading: boolean = true;
  isFadingOut: boolean = false;

  constructor(
    private authService: AuthService,
    private classroomService: ClassroomService,
    private progressService: ProgressService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (this.user) {
      this.loadTeacherClassrooms();
    }
  }

  loadTeacherClassrooms(): void {
    this.isLoading = true;
    this.isFadingOut = false;

    forkJoin({
      aulas: this.classroomService.getTeacherClasses(this.user.id),
      delayMinimo: timer(800) 
    }).subscribe({
      next: ({ aulas }) => {
        this.classrooms = aulas;
        
        // Si tiene aulas, seleccionamos la primera y cargamos sus datos
        if (this.classrooms.length > 0) {
          this.selectedAulaId = this.classrooms[0].id!;
          this.loadMetrics(this.selectedAulaId);
        }

        this.isFadingOut = true; 
        setTimeout(() => {
          this.isLoading = false;
          this.isFadingOut = false;
        }, 300); 
      },
      error: (err) => {
        console.error('Error al cargar aulas:', err);
        this.isLoading = false;
      }
    });
  }

  // EVENTO: Cuando el maestro cambia el Dropdown de aulas en el HTML
  onAulaChange(event: any) {
    const aulaId = event.target.value;
    if (aulaId) {
      this.selectedAulaId = aulaId;
      this.loadMetrics(aulaId);
    }
  }

  // Consulta el backend para traer la tabla y los KPIs
  loadMetrics(aulaId: number) {
    this.isLoadingMetrics = true;
    this.progressService.getClassroomMetrics(aulaId).subscribe({
      next: (res) => {
        this.metrics = res;
        this.isLoadingMetrics = false;
      },
      error: (err) => {
        console.error('Error cargando métricas:', err);
        this.isLoadingMetrics = false;
      }
    });
  }

  goToCreateClass(): void {
    this.router.navigate(['/teacher/profile'], { fragment: 'create-class' });
  }

  viewStudentDetails(studentId: number) {
    // Redirige pasando el ID del estudiante por URL
    this.router.navigate(['/teacher/student-details', studentId]);
  }

}
