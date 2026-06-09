import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si hay sesión activa
  if (authService.isAuthenticated()) {
    const user = authService.getCurrentUser();
    
    // Redirección inteligente según el rol que ya tiene asignado
    if (user?.role === 'maestro') {
      router.navigate(['/teacher/dashboard']);
    } else {
      router.navigate(['/student/dashboard']);
    }
    return false; // Bloquea el acceso a la Landing/Login/Register
  }

  return true; // Si no está logueado, le permite ver la parte pública libremente
};