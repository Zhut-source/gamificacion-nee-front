import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.getCurrentUser();

    if (user?.role === 'maestro') {
      router.navigate(['/teacher/dashboard']);
    } else {
      router.navigate(['/student/dashboard']);
    }
    return false;
  }

  return true;
};
