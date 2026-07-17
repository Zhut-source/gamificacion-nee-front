import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import {
  ClassroomService,
  StudentClassStatus,
} from '@core/services/classroom.service';
import { NotificationService } from '@core/services/notification.service';
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
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  user: any;
  currentClass: StudentClassStatus | null = null;
  isLoading: boolean = true;
  isFadingOut: boolean = false;
  progressValue: number = 0;
  animatedProgress: number = 0;
  challenges: any[] = [];
  activeChallengeId: any = null;
  unlockedBadges: any[] = [];
  lockedBadges: any[] = [];
  showBadgeNotification: boolean = false;

  activeSectionId: string = 'progress-section';
  private observer: IntersectionObserver | null = null;

  constructor(
    private authService: AuthService,
    private classroomService: ClassroomService,
    private progressService: ProgressService,
    public tts: TtsService,
    private router: Router,
    private notificationService: NotificationService,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.checkStudentClass();
    if (localStorage.getItem('newBadgeAlert') === 'true') {
      this.showBadgeNotification = true;
      localStorage.removeItem('newBadgeAlert');
    }
  }

  ngAfterViewInit(): void {
    this.setupScrollObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

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
          
          setTimeout(() => this.observeSections(), 100);
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
      this.notificationService.showAlert('Debes completar los niveles anteriores primero.', 'error');
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

  setupScrollObserver(): void {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5 
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.activeSectionId = entry.target.id;
        }
      });
    }, options);
  }

  observeSections(): void {
    if (!this.observer) return;
    const sections = this.el.nativeElement.querySelectorAll('.snap-section');
    sections.forEach((section: Element) => this.observer!.observe(section));
  }

  getTargetChallengeId(): string {
    if (!this.challenges || this.challenges.length === 0) return 'badges-section';
    const nextChallenge = this.challenges.find(c => c.status !== 'completed' && c.status !== 'locked');
    if (nextChallenge) return `challenge-${nextChallenge.id}`;
    const unlocked = this.challenges.filter(c => c.status !== 'locked');
    if (unlocked.length > 0) return `challenge-${unlocked[unlocked.length - 1].id}`;
    return `challenge-${this.challenges[0].id}`;
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.focus({ preventScroll: true }); 
    }
  }

  startOrContinueJourney(): void {
    const targetId = this.getTargetChallengeId();
    this.scrollToSection(targetId);
  }
}