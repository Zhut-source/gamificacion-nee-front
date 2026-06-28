import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import {
  ClassroomService,
  StudentClassStatus,
} from '@core/services/classroom.service';
import { ProgressService } from '@core/services/progress.service';
import { TtsService } from '@core/services/tts.service';
import { forkJoin, timer } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: any;
  currentClass: StudentClassStatus | null = null;
  isTTS = false;
  isLoading: boolean = true;
  isFadingOut: boolean = false;
  progressValue: number = 60;
  challenges: any[] = [];
  activeChallengeId: any = null;
  animatedProgress: number = 0;

  unlockedBadges: any[] = [];
  lockedBadges: any[] = [];

  showBadgeNotification: boolean = false;

  constructor(
    private authService: AuthService,
    private classroomService: ClassroomService,
    private progressService: ProgressService,
    public tts: TtsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.checkStudentClass();

    if (localStorage.getItem('newBadgeAlert') === 'true') {
      this.showBadgeNotification = true;
      localStorage.removeItem('newBadgeAlert');
    }
  }

  ngOnDestroy(): void {}

  checkStudentClass(): void {
    this.isLoading = true;
    this.isFadingOut = false;

    forkJoin({
      aula: this.classroomService.getStudentClass(this.user.id),
      delayMinimo: timer(800),
    }).subscribe({
      next: ({ aula }) => {
        this.currentClass = aula;

        if (aula) {
          this.loadChallenges();
        } else {
          this.isFadingOut = true;
          setTimeout(() => {
            this.isLoading = false;
            this.isFadingOut = false;
          }, 300);
        }
      },
      error: (err) => {
        console.error('Error al verificar el aula:', err);
        this.currentClass = null;
        this.isLoading = false;
      },
    });
  }

  loadChallenges() {
    this.progressService.getStudentChallenges(this.user.id).subscribe({
      next: (data) => {
        this.challenges = data;
        const completados = this.challenges.filter(
          (c) => c.status === 'completed',
        ).length;

        this.progressValue =
          this.challenges.length > 0
            ? (completados / this.challenges.length) * 100
            : 0;

        this.isFadingOut = true;
        setTimeout(() => {
          this.isLoading = false;
          this.isFadingOut = false;

          this.dispararAnimacionDeProgreso();
        }, 300);
      },
    });
    this.loadBadges();
  }

  loadBadges() {
    this.progressService.getStudentBadges(this.user.id).subscribe({
      next: (badges) => {
        this.unlockedBadges = badges.filter((b) => b.unlocked);
        this.lockedBadges = badges.filter((b) => !b.unlocked);
      },
    });
  }

  scrollToBadges() {
    const element = document.getElementById('unlocked-title');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.showBadgeNotification = false;
    }
  }

  private dispararAnimacionDeProgreso(): void {
    this.animatedProgress = 0;
    const valorObjetivo = this.progressValue;

    if (valorObjetivo === 0) return;

    const duracionAnimacion = 400;
    const fps = 60;
    const intervaloTiempo = 1000 / fps;
    const pasosTotales = duracionAnimacion / intervaloTiempo;
    const incrementoPorPaso = valorObjetivo / pasosTotales;

    const temporizador = setInterval(() => {
      this.animatedProgress += incrementoPorPaso;
      if (this.animatedProgress >= valorObjetivo) {
        this.animatedProgress = valorObjetivo;
        clearInterval(temporizador);
      }
    }, intervaloTiempo);
  }

  goToChallenge(challenge: any) {
    if (challenge.status === 'locked') {
      alert('Debes completar los niveles anteriores primero.');
      return;
    }
    this.router.navigate(['/student/challenge-view', challenge.id]);
  }

  goToJoinClass(): void {
    this.router.navigate(['/student/profile'], { fragment: 'class-code' });
  }

  leerNivel(challenge: any) {
    if (this.tts.isPlaying && this.activeChallengeId === challenge.id) {
      this.tts.stop();
      this.activeChallengeId = null;
      console.log('Audio detenido manualmente para el desafío:', challenge.id);
    } else {
      this.tts.stop();
      this.activeChallengeId = challenge.id;
      const texto = `Nivel ${challenge.nivel}. ${challenge.nombre}. ${challenge.descripcion_nivel}`;
      this.tts.speak(texto);
    }
  }

  getChallengeImagePath(nombre: string): string {
    if (!nombre) return 'assets/pictures/recursos/default.png';
    const nombreFormateado = nombre
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '-'); 
      
    return `assets/pictures/recursos/${nombreFormateado}.png`;
  }

  onImageError(event: any) {
    event.target.src = 'assets/pictures/recursos/default.png'; 
    
  }
}
