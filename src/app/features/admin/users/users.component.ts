import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '@core/services/admin.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit{
  
  isLoading: boolean = true;
  users: any[] = [];
  filteredUsers: any[] = [];
  
  // Filtros
  searchTerm: string = '';
  roleFilter: string = 'all';

  constructor(
    private adminService: AdminService, 
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.adminService.getAllUsers().subscribe({
      next: (data) => {
        
        this.users = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        alert('Error cargando la lista de usuarios');
        this.isLoading = false;
      }
    });
  }

  // --- FILTROS (Búsqueda en tiempo real Frontend) ---
  applyFilters() {
    this.filteredUsers = this.users.filter(user => {
      const matchRole = this.roleFilter === 'all' || user.role === this.roleFilter;
      const matchSearch = user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchRole && matchSearch;
    });
  }

  // --- ACCIÓN CRÍTICA: BANEO ---
  toggleStatus(user: any) {
    const newState = !user.is_active;
    const confirmMessage = newState 
      ? `¿Estás seguro de REACTIVAR a ${user.name}? Podrá volver a iniciar sesión.`
      : `¿Estás seguro de INHABILITAR (Banear) a ${user.name}? Se le denegará el acceso al sistema.`;

    if (!confirm(confirmMessage)) return;

    // Actualización optimista en la UI
    user.is_active = newState;

    this.adminService.toggleUserStatus(user.id, newState).subscribe({
      next: (res) => alert(res.message),
      error: (err) => {
        // Revertir si hubo error
        user.is_active = !newState;
        alert('Error conectando con el servidor');
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }

}
