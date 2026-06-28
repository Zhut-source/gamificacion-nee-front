import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AlertData {
  message: string;
  type: 'error' | 'success' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private alertSource = new BehaviorSubject<AlertData | null>(null);
  alert$ = this.alertSource.asObservable();
  private timeoutId: any;

  showAlert(message: string, type: 'error' | 'success' | 'info' = 'error', duration: number = 6000) {
    if (this.timeoutId) clearTimeout(this.timeoutId);

    this.alertSource.next({ message, type });

    this.timeoutId = setTimeout(() => {
      this.closeAlert();
    }, duration);
  }

  closeAlert() {
    this.alertSource.next(null);
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}