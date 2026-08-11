import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccessibilityService } from '@core/services/accessibility.service';
import { AudiosettingsService } from '@core/services/audiosettings.service';
import { AuthService } from '@core/services/auth.service';
import { ClassroomService } from '@core/services/classroom.service';
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
export class ProfileComponent implements OnInit, AfterViewInit {
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
  currentSpeed: string = 'normal';
  currentVolume: number = 45;
  isDyslexiaActive = false;
  currentTheme = 'claro';
  currentTtsSection: string | null = null;
  private accessibilitySub = new Subscription();
  isSpotlightActive: boolean = false;
  showScrollButton = false;
  isScrolledToBottom = false;
  private mainElement: HTMLElement | null = null;
  private scrollListener = () => this.checkScroll();

  constructor(
    private authService: AuthService,
    private router: Router,
    private classroomService: ClassroomService,
    private userService: UserService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private accessibilityService: AccessibilityService,
    public tts: TtsService,
    private audioSettingsService: AudiosettingsService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) return;

    this.currentSpeed = localStorage.getItem('ttsSpeed') || 'normal';
    this.currentVolume = Number(localStorage.getItem('ttsVolume') ?? 100);

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
        setTimeout(() => {
          const targetElement = document.getElementById('create-class');
          if (targetElement) {
            this.isSpotlightActive = true;
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const firstSelect = targetElement.querySelector('select[formControlName="periodoId"]') as HTMLSelectElement;
            if (firstSelect) firstSelect.focus();
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
  }

  ngAfterViewInit(): void {
    this.mainElement = document.querySelector('main');

    if (this.mainElement) {
      this.mainElement.addEventListener('scroll', this.scrollListener);
    }

    setTimeout(() => this.checkScroll(), 100);
  }

  checkScroll(): void {
    if (!this.mainElement) return;

    const scrollHeight = this.mainElement.scrollHeight;
    const clientHeight = this.mainElement.clientHeight;
    const scrollTop = this.mainElement.scrollTop;

    this.showScrollButton = scrollHeight > clientHeight;
    this.isScrolledToBottom =
      Math.ceil(scrollTop + clientHeight) >= scrollHeight - 10;
  }

  toggleScroll(): void {
    if (!this.mainElement) return;

    if (this.isScrolledToBottom) {
      this.mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.mainElement.scrollTo({
        top: this.mainElement.scrollHeight,
        behavior: 'smooth',
      });
    }
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
    this.materiasFiltradas = this.todasMaterias.filter((m) => m.carrera_id === carreraId);
    this.createClassForm.get('materiaId')?.enable();
    this.createClassForm.get('materiaId')?.setValue('');
  }

  loadClassrooms() {
    this.classroomService.getTeacherClasses(this.user.id).subscribe({
      next: (classes) => {
        this.classrooms = classes;
      },
      error: (err) => {
        const mensajeError = err.error?.message || 'No se pudieron cargar las aulas del maestro.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  onCreateClass() {
    if (this.createClassForm.invalid) return;

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
      next: () => {
        this.notificationService.showAlert('Aula generada con éxito', 'success');
        this.createClassForm.reset();
        this.createClassForm.get('materiaId')?.disable();
        this.materiasFiltradas = [];
        this.loadClassrooms();
        this.clearSpotlight();
        this.router.navigate(['/teacher/dashboard']);
      },
      error: (err) => {
        const mensajeError = err.error?.message || 'Error al crear aula. Inténtalo de nuevo.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  onChangePassword() {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.notificationService.showAlert('Las contraseñas nuevas no coinciden', 'error');
      return;
    }

    const data = { id: this.user.id, currentPassword, newPassword };
    this.userService.changePassword(data).subscribe({
      next: () => {
        this.notificationService.showAlert('Contraseña cambiada con éxito', 'success');
        this.passwordForm.reset();
      },
      error: (err) => {
        const mensajeError = err.error?.message || 'No se pudo cambiar la contraseña. Inténtalo de nuevo.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.notificationService.showAlert(`Código ${code} copiado al portapapeles.`, 'success');
    });
  }

  toggleEditName() {
    const nameControl = this.infoForm.get('name');
    if (!this.isEditingName) {
      this.isEditingName = true;
      nameControl?.enable();
      setTimeout(() => {
        const inputElement = document.querySelector('input[formControlName="name"]') as HTMLInputElement;
        inputElement?.focus();
      }, 50);
    } else {
      this.isEditingName = false;
      nameControl?.disable();
      nameControl?.setValue(this.user?.name || '');
    }
  }

  onUpdateName() {
    if (this.infoForm.invalid) return;
    this.userService.updateProfile(this.user.id, this.infoForm.value.name).subscribe({
      next: (res) => {
        this.notificationService.showAlert('Nombre actualizado correctamente', 'success');
        const updatedUser = { ...this.user, name: res.user.name };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.user = updatedUser;
        this.isEditingName = false;
        this.infoForm.get('name')?.disable();
      },
      error: (err) => {
        const mensajeError = err.error?.message || 'Error al actualizar el nombre. Inténtalo de nuevo.';
        this.notificationService.showAlert(mensajeError, 'error');
      },
    });
  }

  volverAlDashboard() {
    this.router.navigate(['/student/dashboard']);
  }

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
    if (selectedSpeed === 'lento') fraseConfirmacion = 'Activaste el modo lento';
    else if (selectedSpeed === 'rapido') fraseConfirmacion = 'Activaste el modo rápido';
    this.tts.speak(fraseConfirmacion);
  }

  onChangeVolume(event: any) {
    const selectedVolume = Number((event.target as HTMLInputElement).value);
    this.currentVolume = selectedVolume;
    this.audioSettingsService.setVolume(selectedVolume);
  }

  leerSeccion(seccionId: string, texto: string) {
    if (this.tts.isPlaying && this.currentTtsSection === seccionId) {
      this.tts.stop();
      this.currentTtsSection = null;
    } else {
      this.tts.stop();
      this.currentTtsSection = seccionId;
      this.tts.speak(texto);
    }
  }
}