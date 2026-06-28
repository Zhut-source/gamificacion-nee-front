import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private sounds: { [key: string]: HTMLAudioElement } = {};

  constructor() {
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
  }

  preloadSound(key: string, src: string) {
    if (!this.sounds[key]) {
      const audio = new Audio();
      audio.src = src;
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
}
