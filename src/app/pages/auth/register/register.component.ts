import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

interface RegisterPayload {
  name: string | null;
  email: string | null;
  password: string | null;
  role: string | null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = false;
  showScrollButton = false;
  isScrolledToBottom = false;

  private mainElement: HTMLElement | null = null;
  private scrollListener = () => this.checkScroll();

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
  ) {}

  registerForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/),
    ]),

    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern(/^[^'"]*$/),
    ]),

    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
    ]),

    confirmPassword: new FormControl('', [Validators.required]),

    role: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.mainElement = document.querySelector('main');

    if (this.mainElement) {
      this.mainElement.addEventListener('scroll', this.scrollListener);
    }

    setTimeout(() => this.checkScroll(), 100);
  }

  ngOnDestroy(): void {
    if (this.mainElement) {
      this.mainElement.removeEventListener('scroll', this.scrollListener);
    }
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

  selectRole(role: string): void {
    const current = this.registerForm.get('role')?.value;

    if (current === role) {
      this.registerForm.get('role')?.setValue('');
      return;
    }

    this.registerForm.get('role')?.setValue(role);
    this.registerForm.get('role')?.markAsTouched();
  }

  get nameValid() {
    const c = this.registerForm.get('name');
    return c?.touched && c.valid;
  }
  get emailValid() {
    const c = this.registerForm.get('email');
    return c?.touched && c.valid;
  }
  get passwordValid() {
    const c = this.registerForm.get('password');
    return c?.touched && c.valid;
  }
  get confirmPasswordValid() {
    const confirm = this.registerForm.get('confirmPassword');
    return confirm?.touched && !this.passwordMismatch;
  }
  get nameInvalid() {
    const c = this.registerForm.get('name');
    return c?.touched && c.invalid;
  }
  get emailInvalid() {
    const c = this.registerForm.get('email');
    return c?.touched && c.invalid;
  }
  get passwordInvalid() {
    const c = this.registerForm.get('password');
    return c?.touched && c.invalid;
  }
  get roleInvalid() {
    return (
      this.registerForm.get('role')?.touched &&
      !this.registerForm.get('role')?.value
    );
  }

  get passwordMismatch() {
    const password = this.registerForm.get('password')?.value;
    const confirm = this.registerForm.get('confirmPassword')?.value;
    const confirmControl = this.registerForm.get('confirmPassword');
    return confirmControl?.touched && password !== confirm;
  }

  onRegister(): void {
    if (this.registerForm.invalid || this.passwordMismatch) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const userData: RegisterPayload = {
      name: this.registerForm.value.name ?? '',
      email: this.registerForm.value.email ?? '',
      password: this.registerForm.value.password ?? '',
      role: this.registerForm.value.role ?? '',
    };

    this.authService.register(userData).subscribe({
      next: () => {
        this.notificationService.showAlert(
          'Cuenta creada exitosamente',
          'success',
        );
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error(err);
        const mensajeError = err.error?.message || 'Error al registrar';
        this.notificationService.showAlert(mensajeError, 'error');
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}