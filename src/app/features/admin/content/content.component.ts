import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '@core/services/admin.service';

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './content.component.html',
  styleUrl: './content.component.scss'
})
export class ContentComponent implements OnInit{
  
  challenges: any[] = [];
  selectedChallenge: any = null;
  isLoading: boolean = true;
  
  editForm!: FormGroup;

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit() {
    this.loadChallenges();
    this.initForm();
  }

  loadChallenges() {
    this.isLoading = true;
    this.adminService.getAllChallenges().subscribe({
      next: (data) => {
        this.challenges = data;
        this.isLoading = false;
      },
      error: () => {
        alert('Error cargando los desafíos');
        this.isLoading = false;
      }
    });
  }

  initForm() {
    this.editForm = new FormGroup({
      nombre: new FormControl('', Validators.required),
      descripcion_nivel: new FormControl('', Validators.required),
      descripcion_juego: new FormControl('', Validators.required),
      objetivos: new FormArray([]) // Array dinámico para las viñetas
    });
  }

  // --- LÓGICA DE SELECCIÓN Y EDICIÓN ---

  editChallenge(challenge: any) {
    this.selectedChallenge = challenge;
    
    // Rellenar campos de texto básicos
    this.editForm.patchValue({
      nombre: challenge.nombre,
      descripcion_nivel: challenge.descripcion_nivel,
      descripcion_juego: challenge.descripcion_juego
    });

    // Rellenar el FormArray de Objetivos (limpiando primero)
    this.objetivosArray.clear();
    const objetivos = challenge.objetivos || [];
    objetivos.forEach((obj: string) => {
      this.addObjective(obj);
    });
  }

  closeEdit() {
    this.selectedChallenge = null;
    this.editForm.reset();
    this.objetivosArray.clear();
  }

  // --- GETTERS Y MÉTODOS DEL FORMARRAY (OBJETIVOS) ---

  get objetivosArray() {
    return this.editForm.get('objetivos') as FormArray;
  }

  addObjective(value: string = '') {
    this.objetivosArray.push(new FormControl(value, Validators.required));
  }

  removeObjective(index: number) {
    this.objetivosArray.removeAt(index);
  }

  // --- GUARDADO ---

  onSave() {
    if (this.editForm.invalid) return;

    this.adminService.updateChallenge(this.selectedChallenge.id, this.editForm.value).subscribe({
      next: () => {
        alert('Contenido pedagógico actualizado correctamente.');
        this.loadChallenges(); // Refrescamos la lista de fondo
        this.closeEdit();      // Cerramos el panel
      },
      error: (err) => alert(err.error.message || 'Error al actualizar')
    });
  }

  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }

}
