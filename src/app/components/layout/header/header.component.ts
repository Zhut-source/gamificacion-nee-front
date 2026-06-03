import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {


  isLoggedIn$;
  isDyslexiaFont = false;
  isHighContrast = false;
  currentUser: any = null;

  constructor(private authService: AuthService, private router: Router) {
        this.isLoggedIn$ = this.authService.isLoggedIn$;

        this.isLoggedIn$.subscribe(loggedIn => {
          if (loggedIn) {
            this.currentUser = this.authService.getCurrentUser();
          } else {
            this.currentUser = null;
          }
        });
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleFont() {
    this.isDyslexiaFont = !this.isDyslexiaFont;

    document.body.classList.toggle(
      'accessible-font',
      this.isDyslexiaFont
    );
  }
  
  toggleHighContrast(): void {
    this.isHighContrast = !this.isHighContrast;

    if (this.isHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }
}
