import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgressService, StudentDetailsResponse } from '@core/services/progress.service';

@Component({
  selector: 'app-student-details',
  imports: [CommonModule],
  templateUrl: './student-details.component.html',
  styleUrl: './student-details.component.scss'
})
export class StudentDetailsComponent implements OnInit {
  studentId: number = 0;
  details: StudentDetailsResponse | null = null;

  isLoading: boolean = true;
  isFadingOut: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private progressService: ProgressService
  ) {}

  ngOnInit() {
    // Capturar el ID de la URL (Ej: /teacher/student-details/5)
    this.route.paramMap.subscribe(params => {
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
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando detalles:', err);
        this.isLoading = false;
        alert('No se pudieron cargar los detalles del estudiante.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/teacher/dashboard']);
  }

  // Utilidad para formatear los segundos a "MM:SS min"
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')} min`;
  }
}
