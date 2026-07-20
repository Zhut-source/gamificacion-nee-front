import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccessibilityService } from '@core/services/accessibility.service';
import { AuthService } from '@core/services/auth.service';
import {
  ClassroomService,
  StudentClassStatus,
} from '@core/services/classroom.service';
import { NotificationService } from '@core/services/notification.service';
import { TtsService } from '@core/services/tts.service';
import { UserService } from '@core/services/user.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  user: any;
  isEditingName: boolean = false;
  infoForm!: FormGroup;
  passwordForm!: FormGroup;
  classForm!: FormGroup;
  currentClass: StudentClassStatus | null = null;
  isLoadingClass: boolean = true;
  isJoining: boolean = false;
  currentSpeed: string = 'normal';
  isDyslexiaActive = false;
  currentTheme = 'claro';
  private accessibilitySub = new Subscription();
  mensajito: any;

  isSpotlightActive: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private classroomService: ClassroomService,
    private userService: UserService,
    private route: ActivatedRoute,
    private accessibilityService: AccessibilityService,
    public tts: TtsService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit() {
    //this.loadMyClass();
    this.user = this.authService.getCurrentUser();

    this.currentSpeed = localStorage.getItem('ttsSpeed') || 'normal';

    // 2. Inicializar formulario de información
    this.infoForm = new FormGroup({
      name: new FormControl(
        { value: this.user?.name || '', disabled: true },
        Validators.required,
      ),
      email: new FormControl({ value: this.user?.email || '', disabled: true }),
    });

    //this.infoForm.get('email')?.disable();
    // 3. Inicializar formulario de contraseña
    this.passwordForm = new FormGroup({
      currentPassword: new FormControl('', Validators.required),
      newPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
      ]),
      confirmPassword: new FormControl('', Validators.required),
    });
    
    this.classForm = new FormGroup({
      code: new FormControl('', Validators.required),
    });

    this.route.fragment.subscribe((fragment) => {
      if (fragment === 'class-code') {
        setTimeout(() => {
          const targetElement = document.getElementById('class-code');
          if (targetElement) {
            this.isSpotlightActive = true;

            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
            const inputElement = targetElement.querySelector(
              'input#class-code',
            ) as HTMLInputElement;
            if (inputElement) {
              inputElement.focus();
            }
            const cardElement = targetElement.querySelector('.card.join-class');
            if (cardElement) {
              cardElement.classList.add('highlight-pulse');
              setTimeout(() => {
                cardElement.classList.remove('highlight-pulse');
              }, 2000);
            }
          }
        }, 300);
      }
    });

    this.accessibilitySub.add(
      this.accessibilityService.dyslexiaFont$.subscribe((enabled) => {
        this.isDyslexiaActive = enabled;
      }),
    );

    this.accessibilitySub.add(
      this.accessibilityService.highContrast$.subscribe((enabled) => {
        this.currentTheme = enabled ? 'oscuro' : 'claro';
      }),
    );

    this.loadMyClass();
  }

  clearSpotlight() {
    this.isSpotlightActive = false;
    this.router.navigate(['/student/profile'], { fragment: '' });
  }

  loadMyClass(): void {
    this.isLoadingClass = true;
    this.classroomService.getStudentClass(this.user.id).subscribe({
      next: (aula) => {
        // Si el backend envía datos, se guardan. Si envía null (200 OK), currentClass pasa a ser null de forma nativa.
        this.currentClass = aula;
        this.isLoadingClass = false;
      },
      error: (err) => {
        // Aquí solo entrará si verdaderamente el servidor se cayó (500) o no hay internet.
        console.error('Error real de red o servidor:', err);
        this.isLoadingClass = false;
      },
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

  onJoinClass() {
    if (this.classForm.invalid) return;

    this.classroomService
      .joinClass(this.user.id, this.classForm.value.code)
      .subscribe({
        next: (res) => {
          this.notificationService.showAlert(res.message, 'success');
          this.classForm.reset();
          this.loadMyClass();

          this.clearSpotlight();
          this.router.navigate(['/student/dashboard']);
        },
        error: (err) => {
          const mensajeError =
            err.error?.message ||
            'Error al unirse al aula. Verifica el código e inténtalo de nuevo.';
          this.notificationService.showAlert(mensajeError, 'error');
        },
      });
  }

  // --- MÉTODOS DE ACCESIBILIDAD (Lógica local) ---

  onToggleDyslexia(event: any) {
    const isEnabled = event.target.checked;
    this.accessibilityService.setDyslexiaFont(isEnabled);
  }

  onContrastChange(event: any) {
    const theme = event.target.value;
    this.accessibilityService.setHighContrast(theme === 'oscuro');
  }

  onChangeTtsSpeed(event: any) {
    const selectedSpeed = event.target.value;

    localStorage.setItem('ttsSpeed', selectedSpeed);
    this.currentSpeed = selectedSpeed;

    let fraseConfirmacion = 'Activaste el modo normal';
    if (selectedSpeed === 'lento') {
      fraseConfirmacion = 'Activaste el modo lento';
    } else if (selectedSpeed === 'rapido') {
      fraseConfirmacion = 'Activaste el modo rápido';
    }

    this.tts.speak(fraseConfirmacion);
  }

  volverAlDashboard() {
    this.router.navigate(['/student/dashboard']);
  }
}
