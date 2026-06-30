import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private confirmState = new Subject<ConfirmData | null>();
  public confirmState$ = this.confirmState.asObservable();
  
  private resolveFn!: (value: boolean) => void;

  ask(data: ConfirmData): Promise<boolean> {
    this.confirmState.next(data);
    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  respond(result: boolean) {
    this.confirmState.next(null);
    if (this.resolveFn) {
      this.resolveFn(result);
    }
  }
}