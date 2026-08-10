import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '@core/services/admin.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit{
  
  isLoading: boolean = true;
  users: any[] = [];
  filteredUsers: any[] = [];
  
  searchTerm: string = '';
  roleFilter: string = 'all';

  // --- VARIABLES PARA EDICIÓN EN LÍNEA ---
  editingUserId: number | null = null;
  editForm!: FormGroup;

  // --- VARIABLES PARA MODAL DE CONTRASEÑA ---
  showPasswordModal: boolean = false;
  selectedUserForPassword: any = null;
  passwordForm!: FormGroup;

  constructor(
    private adminService: AdminService, 
    private router: Router
  ) {}

  ngOnInit() {
    this.initForms();
    this.loadUsers();
  }

  initForms() {
    this.editForm = new FormGroup({
      name: new FormControl('', Validators.required),
      email: new FormControl('', [Validators.required, Validators.email])
    });

    this.passwordForm = new FormGroup({
      newPassword: new FormControl('', [Validators.required, Validators.minLength(6)])
    });
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

  applyFilters() {
    this.filteredUsers = this.users.filter(user => {
      const matchRole = this.roleFilter === 'all' || user.role === this.roleFilter;
      const matchSearch = user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchRole && matchSearch;
    });
  }

  toggleStatus(user: any) {
    const newState = !user.is_active;
    const confirmMessage = newState 
      ? `¿Estás seguro de REACTIVAR a ${user.name}?`
      : `¿Estás seguro de INHABILITAR (Banear) a ${user.name}?`;

    if (!confirm(confirmMessage)) return;

    user.is_active = newState;
    this.adminService.toggleUserStatus(user.id, newState).subscribe({
      next: (res) => console.log(res.message),
      error: () => {
        user.is_active = !newState;
        alert('Error conectando con el servidor');
      }
    });
  }

  // ==========================================
  // LÓGICA DE EDICIÓN EN LÍNEA (INLINE EDIT)
  // ==========================================
  
  toggleEdit(user: any) {
    // Si hace clic en el mismo que ya está editando
    if (this.editingUserId === user.id) {
      // 1. Si hubo cambios válidos, GUARDAR
      if (this.editForm.dirty && this.editForm.valid) {
        this.saveUserEdit(user);
      } 
      // 2. Si no hubo cambios o es inválido, CANCELAR
      else {
        this.editingUserId = null;
      }
    } 
    // Si hace clic en un usuario nuevo para editar
    else {
      this.editingUserId = user.id;
      this.editForm.patchValue({
        name: user.name,
        email: user.email
      });
      // Importante: Marcar como "no tocado" para que muestre la X al inicio
      this.editForm.markAsPristine(); 
    }
  }

  saveUserEdit(user: any) {
    const updatedData = this.editForm.value;
    
    this.adminService.updateUserDetails(user.id, updatedData).subscribe({
      next: (res) => {
        // Actualizar datos en la tabla visualmente
        user.name = updatedData.name;
        user.email = updatedData.email;
        this.editingUserId = null; // Cerrar modo edición
      },
      error: (err) => {
        alert(err.error.message || 'Error al actualizar usuario');
      }
    });
  }

  // ==========================================
  // LÓGICA DE MODAL DE CONTRASEÑA
  // ==========================================

  openPasswordModal(user: any) {
    this.selectedUserForPassword = user;
    this.passwordForm.reset();
    this.showPasswordModal = true;
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.selectedUserForPassword = null;
  }

  onSaveNewPassword() {
    if (this.passwordForm.invalid || !this.selectedUserForPassword) return;

    const newPass = this.passwordForm.value.newPassword;
    const userId = this.selectedUserForPassword.id;

    this.adminService.forceUserPassword(userId, newPass).subscribe({
      next: () => {
        alert('Contraseña actualizada correctamente para el usuario.');
        this.closePasswordModal();
      },
      error: () => alert('Error al cambiar la contraseña.')
    });
  }

  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }
}