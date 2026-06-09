import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ProgressService } from '@core/services/progress.service';
import { SecuenciacionComponent } from 'src/app/components/games/secuenciacion/secuenciacion.component';

@Component({
  selector: 'app-challenge-view',
  standalone: true,
  imports: [CommonModule, SecuenciacionComponent, FormsModule],
  templateUrl: './challenge-view.component.html',
  styleUrl: './challenge-view.component.scss'
})
export class ChallengeViewComponent implements OnInit {
  
  @ViewChild(SecuenciacionComponent) gameComponent!: SecuenciacionComponent;

  userId: number = 0;
  challengeId: number = 0; // Este es el 'nivel' (1, 2, 3...)
  challengeData: any = null;

  currentView: 'intro' | 'video' | 'game' = 'intro';

  currentDifficulty: 'easy' | 'medium' | 'hard' = 'easy';
  isLevelFullyCompleted: boolean = false; // Solo se pone true al pasar 'hard'
  completedDifficulties: string[] = [];

  silentStartTime: number = 0;
  activeTimeInSeconds: number = 0;
  timerInterval: any;
  lastActivityTime: number = Date.now();
  pistasUsadas: number = 0;

  feedback = { show: false, status: 'success' as 'success' | 'failed', title: '', message: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private progressService: ProgressService
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.userId = user.id;

    this.route.paramMap.subscribe(params => {
      this.challengeId = Number(params.get('id'));
      this.loadChallengeData();
    });
  }
  // --- CONTROL DE FLUJO ---
  loadChallengeData() {
    this.progressService.getChallengeDetail(this.userId, this.challengeId).subscribe({
      next: (res) => {
        this.challengeData = res;
        this.completedDifficulties = res.dificultades_completadas;
        this.isLevelFullyCompleted = res.is_fully_completed;

        // Lógica: Si ya lo pasó todo, lo dejamos libre en 'easy'. 
        // Si no, determinamos qué le toca jugar.
        if (!this.isLevelFullyCompleted) {
          if (!this.completedDifficulties.includes('easy')) this.currentDifficulty = 'easy';
          else if (!this.completedDifficulties.includes('medium')) this.currentDifficulty = 'medium';
          else if (!this.completedDifficulties.includes('hard')) this.currentDifficulty = 'hard';
        }

        // Si ya lo pasó, mandarlo directo al juego, no obligarlo a ver el video
        if (this.isLevelFullyCompleted) {
           this.currentView = 'game';
           this.startSilentTimer();
        }
      }
    });
  }

  // --- CONTROL DE VISTAS ---
  startVideo() { this.currentView = 'video'; }
  
  startGame() { 
    this.currentView = 'game'; 
    this.startSilentTimer(); 
  }
  
  goBack() { this.router.navigate(['/student/dashboard']); }

  // --- LÓGICA DE DIFICULTAD (BOTONES) ---
  canPlayDifficulty(diff: string): boolean {
    if (this.isLevelFullyCompleted) return true; // Si ya pasó todo, puede jugar lo que sea
    if (diff === 'easy') return true;
    if (diff === 'medium') return this.completedDifficulties.includes('easy');
    if (diff === 'hard') return this.completedDifficulties.includes('medium');
    return false;
  }

  setDifficulty(diff: 'easy' | 'medium' | 'hard') {
    this.currentDifficulty = diff;
    this.pistasUsadas = 0; // Resetear pistas al cambiar nivel
    this.activeTimeInSeconds = 0; // Resetear tiempo
    this.lastActivityTime = Date.now();
  }

  // --- PISTAS ---
  usarPista() {
    // Si no está en la vista del juego, ignorar el clic
    if (this.currentView !== 'game') {
      alert('La pista solo está disponible cuando inicies el juego.');
      return; 
    }

    this.pistasUsadas++;
    if (this.gameComponent) {
      this.gameComponent.mostrarPista();
    }
  }

  // --- MOTOR DEL TIMER INVISIBLE ---
  startSilentTimer() {
    this.activeTimeInSeconds = 0;
    this.lastActivityTime = Date.now();
    this.timerInterval = setInterval(() => {
      if (Date.now() - this.lastActivityTime < 180000) { // 3 minutos AFK max
        this.activeTimeInSeconds++;
      }
    }, 1000);
  }

  

  /*HostListener('document:visibilitychange', ['$event'])
  onVisibilityChange() {
    if (!document.hidden) this.lastActivityTime = Date.now();
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  resetIdleTimer() {
    this.lastActivityTime = Date.now();
  }
  */
  // --- FIN DEL JUEGO (GUARDAR Y AVANZAR) ---
  onGameResult(result: {status: 'success' | 'failed', message: string}) {
    // 1. Mostrar mensaje en HTML
    this.feedback = {
      show: true, status: result.status, 
      title: result.status === 'success' ? '¡Nivel Superado!' : '¡Inténtalo de nuevo!',
      message: result.message
    };
    

    // 2. Guardar en Base de Datos para el Maestro
    const attemptData = {
      studentId: this.userId,
      nivel: this.challengeId,
      dificultad: this.currentDifficulty,
      estado: result.status === 'success' ? 'completado' : 'fallido',
      tiempo_segundos: this.activeTimeInSeconds,
      pistas_utilizadas: this.pistasUsadas
    };

    this.progressService.saveAttempt(attemptData).subscribe();

    // 3. Lógica de avance
    if (result.status === 'success') {
      
      // Registrar que lo pasó localmente para habilitar botones
      if (!this.completedDifficulties.includes(this.currentDifficulty)) {
        this.completedDifficulties.push(this.currentDifficulty);
      }

      setTimeout(() => {
        this.feedback.show = false;
        
        // Si no lo ha completado 100% y pasó la actual, avanzar a la siguiente
        if (!this.isLevelFullyCompleted) {
          if (this.currentDifficulty === 'easy') {
            this.setDifficulty('medium');
          } else if (this.currentDifficulty === 'medium') {
            this.setDifficulty('hard');
          } else if (this.currentDifficulty === 'hard') {
            this.isLevelFullyCompleted = true;
            alert('¡Has completado todas las dificultades de este nivel! Regresando al mapa...');
            clearInterval(this.timerInterval);
            this.goBack(); // Regresar al dashboard
          }
        }
      }, 3500);

    } else {
      setTimeout(() => this.feedback.show = false, 4000);
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}
