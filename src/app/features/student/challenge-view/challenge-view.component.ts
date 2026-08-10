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
import { ConfirmService } from '@core/services/confirm.service';
import { NotificationService } from '@core/services/notification.service';
import { ProgressService } from '@core/services/progress.service';
import { TtsService } from '@core/services/tts.service';
import { CondicionalesComponent } from 'src/app/components/games/condicionales/condicionales.component';
import { DescomposicionComponent } from 'src/app/components/games/descomposicion/descomposicion.component';
import { PatronesComponent } from 'src/app/components/games/patrones/patrones.component';
import { RepeticionesComponent } from 'src/app/components/games/repeticiones/repeticiones.component';
import { SecuenciacionComponent } from 'src/app/components/games/secuenciacion/secuenciacion.component';

@Component({
  selector: 'app-challenge-view',
  standalone: true,
  imports: [
    CommonModule,
    SecuenciacionComponent,
    FormsModule,
    PatronesComponent,
    RepeticionesComponent,
    CondicionalesComponent,
    DescomposicionComponent,
  ],
  templateUrl: './challenge-view.component.html',
  styleUrl: './challenge-view.component.scss',
})
export class ChallengeViewComponent implements OnInit {
  @ViewChild(SecuenciacionComponent) gameComponent!: SecuenciacionComponent;
  @ViewChild(PatronesComponent) patGameComponent!: PatronesComponent;
  @ViewChild(RepeticionesComponent) repGameComponent!: RepeticionesComponent;
  @ViewChild(CondicionalesComponent) conGameComponent!: CondicionalesComponent;
  @ViewChild(DescomposicionComponent) desGameComponent!: DescomposicionComponent;

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
  videoUrl: string = 'assets/videos/videoplaybackweb.mp4';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private progressService: ProgressService,
    public tts: TtsService,
    private audioService: AudioService,
    private cdr: ChangeDetectorRef,
    private confirmService: ConfirmService,
    private notificationService: NotificationService,
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
          if (this.challengeData?.nombre) {
             const nombreLimpio = this.formatearNombreVideo(this.challengeData.nombre);
             this.videoUrl = `assets/videos/intro${nombreLimpio}.mp4`;
          }
          this.completedDifficulties = res.dificultades_completadas || [];
          this.isLevelFullyCompleted = res.is_fully_completed;
          this.isDataLoading = false;

          if (this.isLevelFullyCompleted) {
            this.currentView = 'game';
            this.currentDifficulty = 'easy';
            this.startSilentTimer();
            this.inicializarTableroJuego();
          } else {
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

  private formatearNombreVideo(nombre: string): string {
    if (!nombre) return '';
    let limpio = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return limpio
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  onVideoError() {
    console.warn(`Video dinámico no encontrado en: ${this.videoUrl}. Cargando video de respaldo...`);
    this.videoUrl = 'assets/videos/videoplaybackweb.mp4';
  }

  async startVideo() {
    if (this.currentView === 'game') {
      const confirmar = await this.confirmService.ask({
        title: '¿Pausar partida?',
        message:
          '¿Quieres pausar tu partida actual para volver a ver el video introductorio?',
        confirmText: 'Ver video',
        cancelText: 'Seguir jugando',
      });

      if (!confirmar) return;
    }

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.tts.stop();
    this.currentView = 'video';
    this.cdr.detectChanges();
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

  onHintUsed() {
    this.pistasUsadas++;
    console.log(`Pista utilizada. Total pistas en este intento: ${this.pistasUsadas}`);
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
      pistas_utilizadas: this.pistasUsadas,
    };

    this.progressService.saveAttempt(attemptData).subscribe({
      next: () => console.log('✅ Intento registrado en la BD con éxito.'),
      error: (err) =>
        console.error('❌ Error registrando intento en la BD:', err),
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
            // ¡FIN DEL MODO CARRERA!
            if (this.globalSpeedrunInterval) clearInterval(this.globalSpeedrunInterval);
            this.evaluarFuturasInsignias(); 
          }
        } else {
          // FLUJO NORMAL (Primera vez)
          if (!this.isLevelFullyCompleted) {
            if (this.currentDifficulty === 'easy') {
              this.setDifficulty('medium');
            } else if (this.currentDifficulty === 'medium') {
              this.setDifficulty('hard');
            } else if (this.currentDifficulty === 'hard') {
              this.isLevelFullyCompleted = true;

              const badgeCodigo = `lvl${this.challengeId}_complete`;
              this.progressService.awardBadge(this.userId, badgeCodigo).subscribe();
              localStorage.setItem('newBadges', JSON.stringify([badgeCodigo]));

              this.notificationService.showAlert('¡Nivel superado! Regresando al mapa...', 'success');
              if (this.timerInterval) clearInterval(this.timerInterval);
              this.limpiarRecursosYSalir();
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
    let newlyEarned: string[] = []; 

    let gameName = '';
    if (this.challengeId === 1) gameName = 'Secuenciacion';
    else if (this.challengeId === 2) gameName = 'Patrones';
    else if (this.challengeId === 3) gameName = 'Repeticiones';
    else if (this.challengeId === 4) gameName = 'Condicionales';
    else if (this.challengeId === 5) gameName = 'Descomposicion';

    const timerCode = `timer${gameName}`;
    const proCode = `pro${gameName}`;
    const masterCode = `master${gameName}`;

    if (this.globalSpeedrunTimer <= 60) {
      this.progressService.awardBadge(this.userId, timerCode).subscribe();
      newlyEarned.push(timerCode);
    }
    
    if (this.globalAttemptsCount === 3) {
      this.progressService.awardBadge(this.userId, proCode).subscribe();
      newlyEarned.push(proCode);
    }
    
    if (this.globalSpeedrunTimer <= 60 && this.globalAttemptsCount === 3) {
      this.progressService.awardBadge(this.userId, masterCode).subscribe();
      newlyEarned.push(masterCode);
    }
    
    this.isSpeedrunMode = false;

    if (newlyEarned.length > 0) {
      localStorage.setItem('newBadges', JSON.stringify(newlyEarned));
      this.notificationService.showAlert('¡Carrera completada con éxito! Regresando...', 'success');
    } else {
      this.notificationService.showAlert('Carrera terminada. No superaste los tiempos para una insignia, ¡sigue practicando!', 'info');
    }
    
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.limpiarRecursosYSalir();
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
      this.notificationService.showAlert(
        'Modo Carrera cancelado. Se han restaurado los controles normales.',
        'info',
      );
    } else {
      this.isSpeedrunMode = true;
      this.globalSpeedrunTimer = 0;
      this.globalAttemptsCount = 0;
      this.currentDifficulty = 'easy';
      this.pistasUsadas = 0;
      this.activeTimeInSeconds = 0;

      this.startGlobalSpeedrunTimer();
      this.reiniciarJuegoActivo();

      this.notificationService.showAlert(
        '¡Modo Carrera Iniciado! Completa Fácil, Medio y Difícil de seguido. ¡El tiempo global está corriendo!',
        'success',
      );
    }
  }

  private reiniciarJuegoActivo() {
    if (this.challengeId === 1 && this.gameComponent) {
      this.gameComponent.initGame('easy');
    } else if (this.challengeId === 2 && this.patGameComponent) {
      this.patGameComponent.initGame('easy');
    } else if (this.challengeId === 3 && this.repGameComponent) {
      this.repGameComponent.initGame('easy');
    } else if (this.challengeId === 4 && this.conGameComponent) {
      this.conGameComponent.initGame('easy');
    } else if (this.challengeId === 5 && this.desGameComponent) {
      this.desGameComponent.initGame('easy');
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

  async volverAlDashboard() {
    if (this.currentView === 'game') {
      const isSpeedrun = this.isSpeedrunMode;
      const title = isSpeedrun
        ? '¡Atención! Modo Carrera ⏱️'
        : '¿Abandonar partida?';
      const message = isSpeedrun
        ? 'Si sales ahora, perderás tu racha y tiempo actual. ¿Estás seguro de que deseas abandonar el nivel?'
        : 'Estás en medio de una partida. Si regresas al tablero, el progreso de este intento no se guardará.';

      const confirmarSalida = await this.confirmService.ask({
        title: title,
        message: message,
        confirmText: 'Sí, salir',
        cancelText: 'Mejor me quedo',
      });

      if (confirmarSalida) {
        this.limpiarRecursosYSalir();
      }
    } else {
      this.limpiarRecursosYSalir();
    }
  }

  private limpiarRecursosYSalir() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.globalSpeedrunInterval) clearInterval(this.globalSpeedrunInterval);
    this.tts.stop();
    this.router.navigate(['/student/dashboard']);
  }

  resetSpeedrunMetrics() {
    this.isSpeedrunMode = false;
    if (this.globalSpeedrunInterval) clearInterval(this.globalSpeedrunInterval);
    this.globalSpeedrunTimer = 0;
    this.globalAttemptsCount = 0;
  }

}
