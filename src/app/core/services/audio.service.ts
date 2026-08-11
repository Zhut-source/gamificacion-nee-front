import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private volume = 1;

  constructor() {
    const savedVolume = localStorage.getItem('soundVolume');

    if (savedVolume !== null) {
      this.volume = Number(savedVolume) / 100;
    }

    this.preloadSound(
      'congratulations',
      'assets/audio/alertas/congratulations.mp3',
    );
    this.preloadSound('fail', 'assets/audio/alertas/fail.mp3');

    this.preloadSound(
      'jump',
      'assets/audio/games/secuenciacion/jump-sound.mp3',
    );
    this.preloadSound(
      'robot-off',
      'assets/audio/games/secuenciacion/desactivate.mp3',
    );
    this.preloadSound(
      'robot-cargando',
      'assets/audio/games/secuenciacion/charging.mp3',
    );
    this.preloadSound(
      'switch',
      'assets/audio/games/patrones/light-switch-sound.mp3',
    );
    this.preloadSound(
      'badge-notification',
      'assets/audio/alertas/badge-notification.mp3',
    )
  }

  preloadSound(key: string, src: string) {
    if (!this.sounds[key]) {
      const audio = new Audio();

      audio.src = src;
      audio.volume = this.volume;
      audio.load();

      this.sounds[key] = audio;
    }
  }

  playSound(key: string) {
    const audio = this.sounds[key];
    if (audio) {
      audio.currentTime = 0;
      audio
        .play()
        .catch((err) =>
          console.log(
            'El audio no pudo reproducirse por políticas del navegador:',
            err,
          ),
        );
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    localStorage.setItem('soundVolume', String(Math.round(this.volume * 100)));

    Object.values(this.sounds).forEach((audio) => {
      audio.volume = this.volume;
    });
  }
}
