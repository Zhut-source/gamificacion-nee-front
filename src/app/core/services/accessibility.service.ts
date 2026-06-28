import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AccessibilityService {
  private dyslexiaFontSubject = new BehaviorSubject<boolean>(false);
  private highContrastSubject = new BehaviorSubject<boolean>(false);

  dyslexiaFont$ = this.dyslexiaFontSubject.asObservable();
  highContrast$ = this.highContrastSubject.asObservable();

  constructor() {
    this.loadInitialSettings();
  }

  private loadInitialSettings() {
    const dyslexiaSaved = localStorage.getItem('dyslexiaFont') === 'true';
    const themeSaved = localStorage.getItem('theme');

    const highContrastSaved = themeSaved === 'oscuro';

    this.setDyslexiaFont(dyslexiaSaved);
    this.setHighContrast(highContrastSaved);
  }

  setDyslexiaFont(enabled: boolean) {
    this.dyslexiaFontSubject.next(enabled);
    localStorage.setItem('dyslexiaFont', String(enabled));

    if (enabled) {
      document.body.classList.add('accessible-font');
    } else {
      document.body.classList.remove('accessible-font');
    }
  }

  setHighContrast(enabled: boolean) {
    this.highContrastSubject.next(enabled);
    localStorage.setItem('theme', enabled ? 'oscuro' : 'claro');

    if (enabled) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }
}
