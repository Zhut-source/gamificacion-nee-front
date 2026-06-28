import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { Classroom, ClassroomService } from '@core/services/classroom.service';
import {
  ProgressService,
  ClassroomMetricsResponse,
} from '@core/services/progress.service';
import { forkJoin, timer } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  user: any;
  classrooms: Classroom[] = [];
  selectedAulaId: number | null = null;
  metrics: ClassroomMetricsResponse | null = null;
  isLoadingMetrics: boolean = false;
  isLoading: boolean = true;
  isFadingOut: boolean = false;

  constructor(
    private authService: AuthService,
    private classroomService: ClassroomService,
    private progressService: ProgressService,
    private router: Router,
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
      delayMinimo: timer(800),
    }).subscribe({
      next: ({ aulas }) => {
        this.classrooms = aulas;

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
      },
    });
  }

  onAulaChange(event: any) {
    const aulaId = event.target.value;
    if (aulaId) {
      this.selectedAulaId = aulaId;
      this.loadMetrics(aulaId);
    }
  }

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
      },
    });
  }

  goToCreateClass(): void {
    this.router.navigate(['/teacher/profile'], { fragment: 'create-class' });
  }

  viewStudentDetails(studentId: number) {
    this.router.navigate(['/teacher/student-details', studentId]);
  }
}
