import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AudioService } from '@core/services/audio.service';
import { AuthService } from '@core/services/auth.service';
import { ProgressService } from '@core/services/progress.service';
import { TtsService } from '@core/services/tts.service';
import { PatronesComponent } from 'src/app/components/games/patrones/patrones.component';
import { SecuenciacionComponent } from 'src/app/components/games/secuenciacion/secuenciacion.component';

@Component({
  selector: 'app-challenge-view',
  standalone: true,
  imports: [CommonModule, SecuenciacionComponent, FormsModule, PatronesComponent],
  templateUrl: './challenge-view.component.html',
  styleUrl: './challenge-view.component.scss',
})
export class ChallengeViewComponent implements OnInit {
  @ViewChild(SecuenciacionComponent) gameComponent!: SecuenciacionComponent;

  userId: number = 0;
  challengeId: number = 0;
  challengeData: any = null;
  currentView: 'intro' | 'video' | 'game' = 'intro';
  currentDifficulty: 'easy' | 'medium' | 'hard' = 'easy';
  isLevelFullyCompleted: boolean = false;
  completedDifficulties: string[] = [];
  silentStartTime: number = 0;
  activeTimeInSeconds: number = 0;
  timerInterval: any;
  lastActivityTime: number = Date.now();
  pistasUsadas: number = 0;
  feedback = {
    show: false,
    status: 'success' as 'success' | 'failed',
    title: '',
    message: '',
  };
  isDataLoading: boolean = true;
  isGameLoading: boolean = true;
  isFadingOut: boolean = false;
  isSpeedrunMode: boolean = false;
  globalSpeedrunTimer: number = 0;
  globalSpeedrunInterval: any;
  globalAttemptsCount: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private progressService: ProgressService,
    public tts: TtsService,
    private audioService: AudioService,
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.userId = user.id;

    this.route.paramMap.subscribe((params) => {
      this.challengeId = Number(params.get('id'));
      this.loadChallengeData();
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.tts.stop();
  }

  loadChallengeData() {
    this.isDataLoading = true;
    this.progressService
      .getChallengeDetail(this.userId, this.challengeId)
      .subscribe({
        next: (res) => {
          this.challengeData = res;
          this.completedDifficulties = res.dificultades_completadas || [];
          this.isLevelFullyCompleted = res.is_fully_completed;
          this.isDataLoading = false;

          if (this.isLevelFullyCompleted) {
            // === FLUJO DE SELECCIÓN LIBRE (Ya completó las 3) ===
            this.currentView = 'game'; // Saltamos la intro y el video directo al juego
            this.currentDifficulty = 'easy'; // Por defecto inicia en fácil para libre elección
            this.startSilentTimer();
            this.inicializarTableroJuego();
          } else {
            // === FLUJO GUIADO (Primera vez de forma escalonada) ===
            if (!this.completedDifficulties.includes('easy')) {
              this.currentDifficulty = 'easy';
            } else if (!this.completedDifficulties.includes('medium')) {
              this.currentDifficulty = 'medium';
            } else if (!this.completedDifficulties.includes('hard')) {
              this.currentDifficulty = 'hard';
            }
          }
        },
      });
  }

  startVideo() {
    this.currentView = 'video';
  }

  startGame() {
    this.currentView = 'game';
    this.startSilentTimer();
    this.inicializarTableroJuego();
  }

  private inicializarTableroJuego() {
    this.isGameLoading = true;
    setTimeout(() => {
      this.isGameLoading = false;
    }, 1200);
  }

  goBack() {
    this.router.navigate(['/student/dashboard']);
  }

  canPlayDifficulty(diff: string): boolean {
    if (this.isLevelFullyCompleted) return true;
    if (diff === 'easy') return true;
    if (diff === 'medium') return this.completedDifficulties.includes('easy');
    if (diff === 'hard') return this.completedDifficulties.includes('medium');
    return false;
  }

  setDifficulty(diff: 'easy' | 'medium' | 'hard') {
    this.currentDifficulty = diff;
    this.pistasUsadas = 0;
    this.activeTimeInSeconds = 0;
    this.lastActivityTime = Date.now();
  }

  usarPista() {
    if (this.currentView !== 'game') {
      alert('La pista solo está disponible cuando inicies el juego.');
      return;
    }

    this.pistasUsadas++;
    if (this.gameComponent) {
      this.gameComponent.mostrarPista();
    }
  }

  startSilentTimer() {
    this.activeTimeInSeconds = 0;
    this.lastActivityTime = Date.now();
    this.timerInterval = setInterval(() => {
      if (Date.now() - this.lastActivityTime < 180000) {
        this.activeTimeInSeconds++;
      }
    }, 1000);
  }

  onGameResult(result: any) {
    if (this.isSpeedrunMode) {
      this.globalAttemptsCount++;
      console.log(
        `[Modo Carrera] Intento registrado. Totales: ${this.globalAttemptsCount}`,
      );
    }

    const attemptData = {
      studentId: this.userId,
      nivel: this.challengeId,
      dificultad: this.currentDifficulty,
      estado: result.status === 'success' ? 'completado' : 'fallido',
      tiempo_segundos: this.activeTimeInSeconds,
      pistas_utilizadas: this.pistasUsadas
    };

    this.progressService.saveAttempt(attemptData).subscribe({
      next: () => console.log('✅ Intento registrado en la BD con éxito.'),
      error: (err) => console.error('❌ Error registrando intento en la BD:', err)
    });

    this.feedback.status = result.status;
    this.feedback.title = result.title;
    this.feedback.message = result.message;
    this.feedback.show = true;

    if (result.status === 'success') {
      this.audioService.playSound('congratulations');

      if (!this.completedDifficulties.includes(this.currentDifficulty)) {
        this.completedDifficulties.push(this.currentDifficulty);
      }
      setTimeout(() => {
        this.feedback.show = false;

        if (this.isSpeedrunMode) {
          if (this.currentDifficulty === 'easy') {
            this.setDifficulty('medium');
          } else if (this.currentDifficulty === 'medium') {
            this.setDifficulty('hard');
          } else if (this.currentDifficulty === 'hard') {
            this.isLevelFullyCompleted = true;
            if (this.globalSpeedrunInterval) {
              clearInterval(this.globalSpeedrunInterval);
            }

            this.evaluarFuturasInsignias();
          }
        } else {
          if (!this.isLevelFullyCompleted) {
            if (this.currentDifficulty === 'easy') {
              this.setDifficulty('medium');
            } else if (this.currentDifficulty === 'medium') {
              this.setDifficulty('hard');
            } else if (this.currentDifficulty === 'hard') {
              this.isLevelFullyCompleted = true;
              this.progressService
                .awardBadge(this.userId, 'lvl1_complete')
                .subscribe();
              alert(
                '¡Has completado todas las dificultades de este nivel! Regresando al mapa...',
              );

              if (this.timerInterval) {
                clearInterval(this.timerInterval);
              }
              this.goBack();
            }
          }
        }
      }, 3500);
    } else {
      this.audioService.playSound('fail');
      setTimeout(() => {
        this.feedback.show = false;
      }, 4000);
    }
  }

  evaluarFuturasInsignias() {
    console.log('--- EVALUACIÓN DE INSIGNIAS ---');

    if (this.globalSpeedrunTimer <= 60) {
      this.progressService.awardBadge(this.userId, 'proTimer').subscribe();
      console.log(' ¡Insignia proTIMER Desbloqueada!');
    }
    if (this.globalAttemptsCount === 3) {
      this.progressService
        .awardBadge(this.userId, 'proSecuenciacion')
        .subscribe();
      console.log(' ¡Insignia proSecuenciacion Desbloqueada!');
    }
    if (this.globalSpeedrunTimer <= 60 && this.globalAttemptsCount === 3) {
      this.progressService
        .awardBadge(this.userId, 'masterSecuenciacion')
        .subscribe();
      console.log(' ¡DIAMANTE! Insignia masterSecuenciacion Desbloqueada!');
    }
    this.isSpeedrunMode = false;
  }

  leerInstrucciones() {
    if (this.tts.isPlaying) {
      this.tts.stop();
      return;
    }

    if (!this.challengeData) return;

    const nivelTexto = `Nivel ${this.challengeId}.`;
    const tituloTexto = `${this.challengeData.nombre || 'Cargando nivel'}.`;
    const descripcionTexto = `${this.challengeData.descripcion_juego || ''}.`;

    const objetivosArray = this.challengeData.objetivos || [];
    const objetivosTexto =
      objetivosArray.length > 0
        ? `Objetivos de este nivel: ${objetivosArray.join('. ')}.`
        : '';

    const juegoCompleto = `${nivelTexto} ${tituloTexto} ${descripcionTexto} ${objetivosTexto}`;

    this.tts.speak(juegoCompleto);
  }

  toggleSpeedrunMode() {
    if (this.isSpeedrunMode) {
      this.resetSpeedrunMetrics();
      alert(
        'Modo Carrera cancelado. Se han restaurado los controles normales.',
      );
    } else {
      this.isSpeedrunMode = true;
      this.globalSpeedrunTimer = 0;
      this.globalAttemptsCount = 0;

      this.currentDifficulty = 'easy';

      this.startGlobalSpeedrunTimer();

      if (this.gameComponent) {
        this.gameComponent.initGame('easy');
      }

      alert(
        '¡Modo Carrera Iniciado! Completa Fácil, Medio y Difícil de seguido. ¡El tiempo global está corriendo!',
      );
    }
  }
  startGlobalSpeedrunTimer() {
    if (this.globalSpeedrunInterval) clearInterval(this.globalSpeedrunInterval);

    this.globalSpeedrunInterval = setInterval(() => {
      this.globalSpeedrunTimer++;
      console.log(
        `[Speedrun] Tiempo acumulado: ${this.globalSpeedrunTimer}s | Intentos totales: ${this.globalAttemptsCount}`,
      );
    }, 1000);
  }

  resetSpeedrunMetrics() {
    this.isSpeedrunMode = false;
    if (this.globalSpeedrunInterval) clearInterval(this.globalSpeedrunInterval);
    this.globalSpeedrunTimer = 0;
    this.globalAttemptsCount = 0;
  }
}
