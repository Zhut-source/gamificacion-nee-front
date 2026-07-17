import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ClassroomService } from '@core/services/classroom.service';
import { NotificationService } from '@core/services/notification.service';
import { UserService } from '@core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  user: any;
  classrooms: any[] = [];
  isEditingName: boolean = false;
  infoForm!: FormGroup;
  passwordForm!: FormGroup;
  createClassForm!: FormGroup;
  horarios: any[] = [];
  periodos: any[] = [];
  carreras: any[] = [];
  todasMaterias: any[] = [];
  materiasFiltradas: any[] = [];
  niveles: number[] = Array.from({ length: 10 }, (_, i) => i + 1);
  aulasFisicas: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

  isSpotlightActive: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private classroomService: ClassroomService,
    private userService: UserService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      console.error(
        '🚨 CRÍTICO: No se encontró usuario en localStorage al recargar.',
      );
      return;
    }

    this.infoForm = new FormGroup({
      name: new FormControl(
        { value: this.user?.name || '', disabled: true },
        Validators.required,
      ),
      email: new FormControl({ value: this.user?.email || '', disabled: true }),
    });

    this.passwordForm = new FormGroup({
      currentPassword: new FormControl('', Validators.required),
      newPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
      ]),
      confirmPassword: new FormControl('', Validators.required),
    });

    if (this.user.id) {
      this.loadClassrooms();
    }

    this.createClassForm = new FormGroup({
      horarioId: new FormControl('', Validators.required),
      periodoId: new FormControl('', Validators.required),
      carreraId: new FormControl('', Validators.required),
      materiaId: new FormControl(
        { value: '', disabled: true },
        Validators.required,
      ),
      nivel: new FormControl('', Validators.required),
      aulaNum: new FormControl('', Validators.required),
    });

    this.loadCatalogs();

    this.route.fragment.subscribe((fragment) => {
      if (fragment === 'create-class') {
        // Retraso ligero para permitir que la vista se renderice primero
        setTimeout(() => {
          const targetElement = document.getElementById('create-class');
          if (targetElement) {
            this.isSpotlightActive = true;

            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
            const firstSelect = targetElement.querySelector(
              'select[formControlName="periodoId"]',
            ) as HTMLSelectElement;
            if (firstSelect) firstSelect.focus();
          }
        }, 300);
      }
    });
  }

  loadCatalogs() {
    this.classroomService.getCreationCatalogs().subscribe({
      next: (data) => {
        this.horarios = data.horarios;
        this.periodos = data.periodos;
        this.carreras = data.carreras;
        this.todasMaterias = data.materias;
      },
    });
  }

  clearSpotlight() {
    this.isSpotlightActive = false;
    this.router.navigate(['/teacher/profile'], { fragment: '' });
  }

  onCarreraChange(event: any) {
    const carreraId = Number(event.target.value);
    this.materiasFiltradas = this.todasMaterias.filter(
      (m) => m.carrera_id === carreraId,
    );

    this.createClassForm.get('materiaId')?.enable();
    this.createClassForm.get('materiaId')?.setValue('');
  }

  loadClassrooms() {
    this.classroomService.getTeacherClasses(this.user.id).subscribe({
      next: (classes) => {
        this.classrooms = classes;
      },
      error: (err) => {
        const mensajeError =
          err.error?.message || 'No se pudieron cargar las aulas del maestro.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  onCreateClass() {
    if (this.createClassForm.invalid) return;

    // 1. Extraemos los valores y los convertimos a números enteros
    const formValues = this.createClassForm.value;
    const payload = {
      horarioId: Number(formValues.horarioId),
      periodoId: Number(formValues.periodoId),
      carreraId: Number(formValues.carreraId),
      materiaId: Number(formValues.materiaId),
      nivel: Number(formValues.nivel),
      aulaNum: Number(formValues.aulaNum),
    };

    this.classroomService.createClass(this.user.id, payload).subscribe({
      next: (res) => {
        this.notificationService.showAlert(
          'Aula generada con éxito',
          'success',
        );
        this.createClassForm.reset();
        this.createClassForm.get('materiaId')?.disable();
        this.materiasFiltradas = [];
        this.loadClassrooms();

        // 3. APAGAR EL SPOTLIGHT AL TERMINAR CON ÉXITO
        this.clearSpotlight();
        this.router.navigate(['/teacher/dashboard']);
      },
      error: (err) => {
        const mensajeError =
          err.error?.message || 'Error al crear aula. Inténtalo de nuevo.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  onChangePassword() {
    if (this.passwordForm.invalid) return;

    const { currentPassword, newPassword, confirmPassword } =
      this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.notificationService.showAlert(
        'Las contraseñas nuevas no coinciden',
        'error',
      );
      return;
    }

    const data = { id: this.user.id, currentPassword, newPassword };

    this.userService.changePassword(data).subscribe({
      next: () => {
        this.notificationService.showAlert(
          'Contraseña cambiada con éxito',
          'success',
        );
        this.passwordForm.reset();
      },
      error: (err) => {
        const mensajeError =
          err.error?.message ||
          'No se pudo cambiar la contraseña. Inténtalo de nuevo.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.notificationService.showAlert(
        `Código ${code} copiado al portapapeles.`,
        'success',
      );
    });
  }

  toggleEditName() {
    const nameControl = this.infoForm.get('name');

    if (!this.isEditingName) {
      // 1. PASAR A MODO EDICIÓN
      this.isEditingName = true;
      nameControl?.enable();

      // Hacemos el focus automático usando JavaScript nativo tras un leve delay
      // para asegurar que Angular ya procesó el cambio de estado
      setTimeout(() => {
        const inputElement = document.querySelector(
          'input[formControlName="name"]',
        ) as HTMLInputElement;
        inputElement?.focus();
      }, 50);
    } else {
      // 2. CANCELAR MODO EDICIÓN (Se arrepintió y volvió a presionar el lápiz)
      this.isEditingName = false;
      nameControl?.disable();

      // Restauramos el valor original que venía del objeto del usuario
      nameControl?.setValue(this.user?.name || '');
    }
  }

  onUpdateName() {
    if (this.infoForm.invalid) return;

    this.userService
      .updateProfile(this.user.id, this.infoForm.value.name)
      .subscribe({
        next: (res) => {
          this.notificationService.showAlert(
            'Nombre actualizado correctamente',
            'success',
          );
          const updatedUser = { ...this.user, name: res.user.name };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.user = updatedUser;

          this.isEditingName = false;
          this.infoForm.get('name')?.disable();
        },
        error: (err) => {
          const mensajeError =
            err.error?.message ||
            'Error al actualizar el nombre. Inténtalo de nuevo.';
          this.notificationService.showAlert(mensajeError, 'error');
        },
      });
  }

  volverAlDashboard() {
    this.router.navigate(['/student/dashboard']);
  }

  //METODOS DE ACCESIBILIDAD
  onToggleDyslexia(event: any) {
    const isEnabled = event.target.checked;
    if (isEnabled) {
      document.body.classList.toggle('accessible-font');
    } else {
      document.body.classList.remove('accessible-font');
    }
    localStorage.setItem('dyslexiaFont', isEnabled);
  }

  onContrastChange(event: any) {
    const theme = event.target.value;
    if (theme === 'oscuro') {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    localStorage.setItem('theme', theme);
  }
}
