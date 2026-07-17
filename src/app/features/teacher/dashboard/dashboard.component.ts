import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { Classroom, ClassroomService } from '@core/services/classroom.service';
import {
  ProgressService,
  ClassroomMetricsResponse,
} from '@core/services/progress.service';
import { forkJoin, timer } from 'rxjs';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
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
  selectedAulaCode: string = '';
  showRegisterModal: boolean = false;
  registerForm!: FormGroup;
  selectedAulaName: string = '';

  constructor(
    private authService: AuthService,
    private classroomService: ClassroomService,
    private progressService: ProgressService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (this.user) {
      this.loadTeacherClassrooms();
    }
    this.registerForm = new FormGroup({
      name: new FormControl('', Validators.required),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
      ]),
    });
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
          // --- NUEVA LÓGICA DE AUTO-SELECCIÓN DE AULA ---

          // 1. Verificamos si hay un ID guardado previamente en el navegador
          const savedAulaId = localStorage.getItem('lastSelectedAulaId');

          // 2. Buscamos si el aula guardada todavía existe en la lista del maestro
          const aulaExiste = this.classrooms.find(
            (c) => c.id === Number(savedAulaId),
          );

          if (savedAulaId && aulaExiste) {
            // Si existe, la seleccionamos
            this.selectedAulaId = Number(savedAulaId);
          } else {
            // Si es su primera vez o borraron el aula, seleccionamos la primera de la lista (que por SQL suele ser la más reciente creada)
            this.selectedAulaId = this.classrooms[0].id!;
          }

          // 3. Extraemos el código para mostrarlo en el panel
          const aulaSeleccionada = this.classrooms.find(
            (c) => c.id === this.selectedAulaId,
          );
          this.selectedAulaCode = aulaSeleccionada ? aulaSeleccionada.code : '';
          this.selectedAulaName = aulaSeleccionada ? aulaSeleccionada.name : '';

          // 4. Cargamos las métricas
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
    const aulaId = Number(event.target.value);
    if (aulaId) {
      this.selectedAulaId = aulaId;

      // Guardar la elección en el navegador
      localStorage.setItem('lastSelectedAulaId', aulaId.toString());

      const aulaSeleccionada = this.classrooms.find((c) => c.id === aulaId);
      this.selectedAulaCode = aulaSeleccionada ? aulaSeleccionada.code : '';
      this.selectedAulaName = aulaSeleccionada ? aulaSeleccionada.name : '';

      this.loadMetrics(aulaId);
    }
  }

  copyClassCode() {
  if (this.selectedAulaCode) {
    navigator.clipboard.writeText(this.selectedAulaCode)
      .then(() => {
        this.notificationService.showAlert(`Código ${this.selectedAulaCode} copiado al portapapeles.`, 'success');
      })
      .catch((err) => {
        console.error('Error al copiar al portapapeles:', err);
        this.notificationService.showAlert('No se pudo copiar el código automáticamente.', 'error');
      });
  }
}

  openRegisterModal() {
    if (!this.selectedAulaId) {
      this.notificationService.showAlert('Selecciona un aula activa primero para registrar al estudiante.', 'error');
      return;
    }
    this.registerForm.reset();
    this.showRegisterModal = true;
  }

  closeRegisterModal() {
    this.showRegisterModal = false;
  }

  onRegisterStudent() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    // Armar payload forzando el rol estudiante y el aula actual
    const userData = {
      name: this.registerForm.value.name,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password,
      role: 'estudiante',
      aula_id: this.selectedAulaId,
    };

    this.authService.register(userData).subscribe({
      next: () => {
        this.notificationService.showAlert('Estudiante registrado y añadido al aula con éxito.', 'success');
        this.closeRegisterModal();
        this.loadMetrics(this.selectedAulaId!);
      },
      error: (err) => {
        const mensajeError = err.error?.message || 'Error al registrar al estudiante. Inténtalo de nuevo.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
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
