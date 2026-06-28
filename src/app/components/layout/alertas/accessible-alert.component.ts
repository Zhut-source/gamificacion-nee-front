import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AlertData } from '@core/services/notification.service';
import { TtsService } from '@core/services/tts.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-accessible-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="alert" 
         class="custom-alert" 
         [ngClass]="alert.type"
         role="alert" 
         aria-live="assertive" 
         aria-atomic="true">
      
      <div class="alert-content">
        <span class="alert-icon" aria-hidden="true">⚠</span>
        <p class="alert-message">{{ alert.message }}</p>
      </div>

      <div class="alert-actions">
        <button type="button" 
                class="alert-btn read-btn" 
                (click)="escucharAlerta()" 
                [attr.aria-label]="'Escuchar mensaje: ' + alert.message"
                [class.speaking]="tts.isPlaying">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/>
            <path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>
          </svg>
        </button>

        <button type="button" 
                class="alert-btn close-btn" 
                (click)="cerrar()" 
                aria-label="Cerrar notificación">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="m 6 6 12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./accessible-alert.component.scss']
})
export class AccessibleAlertComponent implements OnInit, OnDestroy {
  alert: AlertData | null = null;
  private sub!: Subscription;

  constructor(
    private notificationService: NotificationService,
    public tts: TtsService
  ) {}

  ngOnInit() {
    this.sub = this.notificationService.alert$.subscribe(data => {
      this.alert = data;
    });
  }

  escucharAlerta() {
    if (this.alert) {
      if (this.tts.isPlaying) {
        this.tts.stop();
      } else {
        // Ejecuta tu servicio de texto a voz existente
        this.tts.speak(this.alert.message); 
      }
    }
  }

  cerrar() {
    this.tts.stop();
    this.notificationService.closeAlert();
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
    this.tts.stop();
  }
}