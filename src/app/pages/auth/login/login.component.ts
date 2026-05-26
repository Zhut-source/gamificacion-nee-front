import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

     constructor(private router: Router, private authService: AuthService) {}

    loginForm = new FormGroup({
      email: new FormControl('', [
        Validators.required,
        Validators.email
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(6)
      ])
    });

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

    onLogin() {
      if (this.loginForm.invalid) {
        this.loginForm.markAllAsTouched();
        return;
      }

      const loginData = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.authService.login(loginData).subscribe({
        next: (response: any) => {
          console.log('1. Respuesta del backend:', response);
          console.log('2. El rol del usuario es:', response.user.role); 
          if (response.user.role === 'maestro') {
            console.log('3. Navegando a maestro...');
             this.router.navigate(['/teacher/dashboard']); 
          } else {
            console.log('3. Navegando a estudiante...');
             this.router.navigate(['/student/dashboard']); 
          }
        },
        error: (err) => {
          console.error(err);
          alert('Credenciales incorrectas');
        }
      });
    }

    goToRegister() {
      this.router.navigate(['/register']);
    }
}

