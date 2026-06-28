import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccessibilityService } from '@core/services/accessibility.service';
import { AuthService } from '@core/services/auth.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy{


  isLoggedIn$;
  isDyslexiaFont = false;
  isHighContrast = false;
  currentUser: any = null;
  private sub = new Subscription();

  constructor(
    private authService: AuthService, 
    private router: Router,
    private accessibilityService: AccessibilityService
  ) {
        this.isLoggedIn$ = this.authService.isLoggedIn$;
  }

  ngOnInit() {
    this.sub.add(
      this.isLoggedIn$.subscribe(loggedIn => {
        if (loggedIn) {
          this.currentUser = this.authService.getCurrentUser();
        } else {
          this.currentUser = null;
        }
      })
    );

    this.sub.add(
      this.accessibilityService.dyslexiaFont$.subscribe(enabled => {
        this.isDyslexiaFont = enabled;
      })
    );

    this.sub.add(
      this.accessibilityService.highContrast$.subscribe(enabled => {
        this.isHighContrast = enabled;
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleFont() {
    this.accessibilityService.setDyslexiaFont(!this.isDyslexiaFont);
  }
  
  toggleHighContrast(): void {
    this.accessibilityService.setHighContrast(!this.isHighContrast);
  }
}
