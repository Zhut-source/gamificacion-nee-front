import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';
import { forkJoin, timer } from 'rxjs';

@Component({
  selector: 'app-catalogs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalogs.component.html',
  styleUrl: './catalogs.component.scss',
})
export class CatalogsComponent implements OnInit {
  isLoading: boolean = true;
  isFadingOut: boolean = false;
  activeTab: 'carreras' | 'materias' | 'horarios' | 'periodos' = 'carreras';

  catalogs: any = {
    carreras: [],
    materias: [],
    horarios: [],
    periodos: [],
  };

  createForm!: FormGroup;

  get currentPlaceholder(): string {
    switch (this.activeTab) {
      case 'carreras':
        return 'Ej. Ingeniería en Desarrollo de Software';
      case 'materias':
        return 'Ej. Programación Orientada a Objetos';
      case 'horarios':
        return 'Ej. Matutino';
      case 'periodos':
        return 'Ej. Trimestral';
      default:
        return 'Ingrese el nombre del registro...';
    }
  }

  constructor(
    private adminService: AdminService,
    private router: Router,
    private notificationService: NotificationService,
  ) { }

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  initForm() {
    this.createForm = new FormGroup({
      nombre: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
      ]),
      carreraId: new FormControl(''),
    });
  }

  loadData() {
    this.isLoading = true;
    this.isFadingOut = false;

    forkJoin({
      catalogsData: this.adminService.getAllCatalogs(),
      delayMinimo: timer(800),
    }).subscribe({
      next: ({ catalogsData }) => {
        this.catalogs = catalogsData;

        this.isFadingOut = true;
        setTimeout(() => {
          this.isLoading = false;
          this.isFadingOut = false;
        }, 300);
      },
      error: (err) => {
        const mensajeError =
          err.error?.message || 'Error al cargar la información.';
        this.notificationService.showAlert(mensajeError, 'error');
        this.isLoading = false;
        this.isFadingOut = false;
      },
    });
  }

  deletingItemId: number | null = null;

  refreshSilentCatalogs(onComplete?: () => void) {
    this.adminService.getAllCatalogs().subscribe({
      next: (catalogsData) => {
        this.catalogs = catalogsData;
        if (onComplete) onComplete();
      },
      error: (err) => {
        const mensajeError = err.error?.message || 'Error al actualizar la lista.';
        this.notificationService.showAlert(mensajeError, 'error');
        if (onComplete) onComplete();
      }
    });
  }

  setTab(tabName: 'carreras' | 'materias' | 'horarios' | 'periodos') {
    this.activeTab = tabName;
    this.createForm.reset();

    if (tabName === 'materias') {
      this.createForm.get('carreraId')?.setValidators(Validators.required);
    } else {
      this.createForm.get('carreraId')?.clearValidators();
    }
    this.createForm.get('carreraId')?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.createForm.invalid) return;

    const tipoBackend = this.activeTab.slice(0, -1);

    this.adminService
      .createCatalogItem(tipoBackend, this.createForm.value)
      .subscribe({
        next: (res) => {
          this.createForm.reset();
          this.notificationService.showAlert('Registro creado exitosamente', 'success');
          this.refreshSilentCatalogs();
        },
        error: (err) => {
          const mensajeError =
            err.error?.message ||
            'No se pudo crear el elemento. Inténtalo de nuevo.';
          this.notificationService.showAlert(mensajeError, 'error');
        },
      });
  }

  showDeleteModal: boolean = false;
  itemToDelete: any = null;

  openDeleteModal(item: any) {
    this.itemToDelete = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  confirmDelete() {
    if (!this.itemToDelete) return;

    const id = this.itemToDelete.id;
    const tipoBackend = this.activeTab.slice(0, -1);
    
    this.closeDeleteModal();
    this.deletingItemId = id;

    setTimeout(() => {
      this.adminService.deleteCatalogItem(tipoBackend, id).subscribe({
        next: () => {
          this.deletingItemId = null;
          this.notificationService.showAlert('Registro eliminado exitosamente', 'success');
          this.refreshSilentCatalogs();
        },
        error: (err) => {
          this.deletingItemId = null;
          const mensajeError =
            err.error?.message ||
            'No se pudo eliminar el elemento. Inténtalo de nuevo.';
          this.notificationService.showAlert(mensajeError, 'error');
        },
      });
    }, 250);
  }

  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }
}