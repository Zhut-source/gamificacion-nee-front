import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

interface LoginPayload {
  email: string | null;
  password: string | null;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = false;
  showScrollButton = false;
  isScrolledToBottom = false;

  private mainElement: HTMLElement | null = null;
  private scrollListener = () => this.checkScroll();

  loginForm = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern(/^[^'"]*$/),
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
    ]),
    remember: new FormControl(false),
  });

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      this.loginForm.patchValue({
        email: savedEmail,
        remember: true,
      });
    }
  }

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

  get emailInvalid() {
    const c = this.loginForm.get('email');
    return c?.touched && c.invalid;
  }

  get emailValid() {
    const c = this.loginForm.get('email');
    return c?.touched && c.valid;
  }

  get passwordInvalid() {
    const c = this.loginForm.get('password');
    return c?.touched && c.invalid;
  }

  get passwordValid() {
    const c = this.loginForm.get('password');
    return c?.touched && c.valid;
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const emailValue = this.loginForm.value.email ?? '';
    if (this.loginForm.value.remember) {
      localStorage.setItem('remembered_email', emailValue);
    } else {
      localStorage.removeItem('remembered_email');
    }

    const loginData = {
      email: emailValue,
      password: this.loginForm.value.password ?? '',
    };

    this.authService.login(loginData).subscribe({
      next: (response: any) => {
        if (response?.user?.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (response?.user?.role === 'maestro') {
          this.router.navigate(['/teacher/dashboard']);
        } else {
          this.router.navigate(['/student/dashboard']);
        }
      },
      error: (err) => {
        console.error(err);
        const mensajeError =
          err.error?.message || 'Credenciales incorrectas. Inténtalo de nuevo.';
        this.notificationService.showAlert(mensajeError, 'error');
        this.loginForm.get('password')?.reset();
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}