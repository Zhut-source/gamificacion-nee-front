import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  const expectedRoles = route.data['roles'] as Array<string>;

  if (expectedRoles && expectedRoles.includes(currentUser.role)) {
    return true;
  }


  if(currentUser.role === 'admin'){
    router.navigate(['/admin/dashboard']);
  } else if (currentUser.role === 'maestro') {
    router.navigate(['/teacher/dashboard']);
  } else {
    router.navigate(['/student/dashboard']);
  }

  return false;
};
