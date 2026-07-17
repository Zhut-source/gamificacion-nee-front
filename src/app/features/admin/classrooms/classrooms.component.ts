import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-classrooms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './classrooms.component.html',
  styleUrl: './classrooms.component.scss',
})
export class ClassroomsComponent implements OnInit {
  isLoading: boolean = true;
  classrooms: any[] = [];

  // Estado para la vista de detalle
  selectedClassroom: any = null;
  studentsInClass: any[] = [];
  isLoadingStudents: boolean = false;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.loadClassrooms();
  }

  loadClassrooms() {
    this.isLoading = true;
    this.adminService.getAllClassrooms().subscribe({
      next: (data) => {
        this.classrooms = data;
        this.isLoading = false;
      },
      error: (err) => {
        const mensajeError =
          err.error?.message || 'Error cargando la lista de aulas.';
        this.notificationService.showAlert(mensajeError, 'error');
        this.isLoading = false;
      },
    });
  }

  // --- ACCIONES DE AULA ---

  viewStudents(aula: any) {
    this.selectedClassroom = aula;
    this.isLoadingStudents = true;

    this.adminService.getStudentsByClassroom(aula.id).subscribe({
      next: (data) => {
        this.studentsInClass = data;
        this.isLoadingStudents = false;
      },
    });
  }

  closeDetails() {
    this.selectedClassroom = null;
    this.studentsInClass = [];
  }

  onDeleteClassroom(aulaId: number) {
    if (
      !confirm(
        '¿ESTÁS SEGURO? Eliminar un aula es irreversible. Los estudiantes asignados quedarán sin clase.',
      )
    )
      return;

    this.adminService.deleteClassroom(aulaId).subscribe({
      next: () => {
        this.notificationService.showAlert(
          'Aula eliminada correctamente.',
          'success',
        );
        this.loadClassrooms();
      },
      error: (err) => {
        const mensajeError =
          err.error?.message ||
          'No se pudo eliminar el aula. Inténtalo de nuevo.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  // --- ACCIONES DE ESTUDIANTE ---

  onUnlinkStudent(student: any) {
    if (
      !confirm(
        `¿Desvincular a ${student.name} de esta clase? Tendrá que ingresar un nuevo código para unirse a otra.`,
      )
    )
      return;

    this.adminService.unlinkStudent(student.id).subscribe({
      next: () => {
        this.notificationService.showAlert(
          `Se ha desvinculado a ${student.name} correctamente.`,
          'success',
        );
        this.viewStudents(this.selectedClassroom);
        this.loadClassrooms();
      },
      error: (err) => {
        const mensajeError =
          err.error?.message ||
          'No se pudo desvincular al estudiante. Inténtalo de nuevo.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }
}
