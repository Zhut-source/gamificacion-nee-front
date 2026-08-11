import { Injectable } from '@angular/core';
import { AudioService } from './audio.service';
import { TtsService } from './tts.service';

@Injectable({
  providedIn: 'root'
})
export class AudiosettingsService {

  constructor(
    private ttsService: TtsService,
    private audioService: AudioService
  ) { }
  setVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(100, volume));

    this.ttsService.setVolume(normalizedVolume / 100);
    this.audioService.setVolume(normalizedVolume / 100);

    localStorage.setItem(
      'masterVolume',
      String(normalizedVolume)
    );
  }

  getVolume(): number {
    const savedVolume = localStorage.getItem('masterVolume');

    if (savedVolume !== null) {
      return Number(savedVolume);
    }

    return 100;
  }
}
