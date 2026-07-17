import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import {
  ProgressService,
  StudentDetailsResponse,
} from '@core/services/progress.service';

@Component({
  selector: 'app-student-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-details.component.html',
  styleUrl: './student-details.component.scss',
})
export class StudentDetailsComponent implements OnInit {
  studentId: number = 0;
  details: StudentDetailsResponse | null = null;

  isLoading: boolean = true;
  isFadingOut: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private progressService: ProgressService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.studentId = Number(params.get('id'));
      if (this.studentId) {
        this.loadDetails();
      }
    });
  }

  loadDetails() {
    this.isLoading = true;
    this.isFadingOut = false;

    this.progressService.getStudentDetails(this.studentId).subscribe({
      next: (res) => {
        this.details = res;
        this.isFadingOut = true;
        setTimeout(() => {
          this.isLoading = false;
          this.isFadingOut = false;
        }, 300);
      },
      error: (err) => {
        this.isLoading = false;
        const mensajeError =
          err.error?.message ||
          'No se pudieron cargar los detalles del estudiante.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  goBack() {
    this.router.navigate(['/teacher/dashboard']);
  }

  formatTime(seconds: number): string {
    if (!seconds) return '00:00 min';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')} min`;
  }
}
