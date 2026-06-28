import { Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TtsService {
  private synth = window.speechSynthesis;
  public isPlaying = false;

  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private monitorInterval: any = null;

  constructor(private ngZone: NgZone) {}

  /**
   * Método principal para reproducir texto
   * @param text El texto que se va a leer
   */
  speak(text: string) {
    this.stop();

    if (!text || text.trim() === '') return;

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = 'es-ES';

    const speedSetting = localStorage.getItem('ttsSpeed') || 'normal';
    if (speedSetting === 'lento') this.currentUtterance.rate = 0.7;
    else if (speedSetting === 'rapido') this.currentUtterance.rate = 1.3;
    else this.currentUtterance.rate = 1.0;

    this.currentUtterance.onstart = () => {
      this.ngZone.run(() => (this.isPlaying = true));
    };

    this.currentUtterance.onend = () => this.cleanup();
    this.currentUtterance.onerror = () => this.cleanup();

    this.synth.speak(this.currentUtterance);

    this.ngZone.runOutsideAngular(() => {
      this.monitorInterval = setInterval(() => {
        if (!this.synth.speaking && this.isPlaying) {
          this.cleanup();
        }
      }, 500);
    });
  }

  stop() {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.currentUtterance = null;
    if (this.isPlaying) {
      this.ngZone.run(() => (this.isPlaying = false));
    }
  }
}
