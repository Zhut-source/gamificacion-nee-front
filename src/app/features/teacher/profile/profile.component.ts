import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { ClassroomService } from '@core/services/classroom.service';
import { UserService } from '@core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  user: any;
  classrooms: any[] = [];
  isEditingName: boolean = false;
  
  infoForm!: FormGroup;
  passwordForm!: FormGroup;
  createClassForm!: FormGroup;

  constructor(
    private authService: AuthService, 
    private classroomService: ClassroomService,
    private userService: UserService
   ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      console.error('🚨 CRÍTICO: No se encontró usuario en localStorage al recargar.');
      return; 
    }

    console.log('✅ Usuario cargado en perfil:', this.user);

    this.infoForm = new FormGroup({
      name: new FormControl({ value: this.user?.name || '', disabled: true }, Validators.required),
      email: new FormControl({ value: this.user?.email || '', disabled: true })
    });

    this.passwordForm = new FormGroup({
      currentPassword: new FormControl('', Validators.required),
      newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
      confirmPassword: new FormControl('', Validators.required)
    });

    this.createClassForm = new FormGroup({
      classroomName: new FormControl('', Validators.required)
    });

    if (this.user.id) {
      this.loadClassrooms();
    }
  }

  loadClassrooms() {
   console.log('🔍 Solicitando clases para el maestro con ID:', this.user.id);

    this.classroomService.getTeacherClasses(this.user.id).subscribe({
      next: (classes) => {
        this.classrooms = classes;
      },
      error: (err) => {
        console.error('Error del backend cargando clases:', err);
      }
    });
  }

  onCreateClass() {
    if (this.createClassForm.invalid) return;

    const className = this.createClassForm.value.classroomName;

    this.classroomService.createClass(this.user.id, className).subscribe({
      next: (res) => {
        alert('Aula generada con éxito');
        this.createClassForm.reset();
        this.loadClassrooms();
      },
      error: (err) => alert('Error al crear aula')
    });
  }

  onChangePassword() {
    if (this.passwordForm.invalid) return;
    
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    
    if (newPassword !== confirmPassword) {
      alert('Las contraseñas nuevas no coinciden');
      return;
    }

    const data = { id: this.user.id, currentPassword, newPassword };
    
    this.userService.changePassword(data).subscribe({
      next: () => {
        alert('Contraseña cambiada con éxito');
        this.passwordForm.reset();
      },
      error: (err) => alert(err.error.message)
    });
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      alert(`Código ${code} copiado al portapapeles.`);
    });
  }


  toggleEditName() {
    const nameControl = this.infoForm.get('name');
    
    if (!this.isEditingName) {
      // 1. PASAR A MODO EDICIÓN
      this.isEditingName = true;
      nameControl?.enable();
      
      // Hacemos el focus automático usando JavaScript nativo tras un leve delay 
      // para asegurar que Angular ya procesó el cambio de estado
      setTimeout(() => {
        const inputElement = document.querySelector('input[formControlName="name"]') as HTMLInputElement;
        inputElement?.focus();
      }, 50);

    } else {
      // 2. CANCELAR MODO EDICIÓN (Se arrepintió y volvió a presionar el lápiz)
      this.isEditingName = false;
      nameControl?.disable();
      
      // Restauramos el valor original que venía del objeto del usuario
      nameControl?.setValue(this.user?.name || '');
    }
  }

  onUpdateName() {
    if (this.infoForm.invalid) return;
    
    this.userService.updateProfile(this.user.id, this.infoForm.value.name).subscribe({
      next: (res) => {
        alert('Nombre actualizado correctamente');
        // Actualizar el usuario en el localStorage para que el Header también cambie
        const updatedUser = { ...this.user, name: res.user.name };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.user = updatedUser;
        
        this.isEditingName = false;
        this.infoForm.get('name')?.disable();
      },
      error: () => alert('Error al actualizar nombre')
    });
  }

  //METODOS DE ACCESIBILIDAD
  onToggleDyslexia(event: any) {
    const isEnabled = event.target.checked;
    if (isEnabled) {
      document.body.classList.toggle('accessible-font');
    } else {
      document.body.classList.remove('accessible-font');
    }
    localStorage.setItem('dyslexiaFont', isEnabled);
  }

  onContrastChange(event: any) {
    const theme = event.target.value;
    if (theme === 'oscuro') {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    localStorage.setItem('theme', theme);
  }
}
