import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '@core/services/admin.service';
import { AuthService } from '@core/services/auth.service';
import { forkJoin, timer } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit{
  adminUser: any;
  kpis: any = null;
  isLoading: boolean = true;
  isFadingOut: boolean = false;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.adminUser = this.authService.getCurrentUser();
    this.loadKpis();
  }

  loadKpis() {
    this.isLoading = true;
    this.isFadingOut = false;
    forkJoin({
      kpisData: this.adminService.getGlobalKpis(),
      delayMinimo: timer(800)
    }).subscribe({
      next: ({ kpisData }) => { 
        this.kpis = kpisData;
      
        this.isFadingOut = true;
        setTimeout(() => {
          this.isLoading = false;
          this.isFadingOut = false;
        }, 300);
      },
      error: (err) => {
        console.error('Error cargando KPIs:', err);
        this.isLoading = false;
        this.isFadingOut = false;
      }
    });
  }

  goToModule(moduleName: string) {
     this.router.navigate([`/admin/${moduleName}`]);
  }

}
