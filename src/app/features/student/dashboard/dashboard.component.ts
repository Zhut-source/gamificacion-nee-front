import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AudioService } from '@core/services/audio.service';
import { AuthService } from '@core/services/auth.service';
import { ClassroomService, StudentClassStatus } from '@core/services/classroom.service';
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
  newBadgesList: string[] = [];
  showBadgeNotification: boolean = false;
  activeSectionId: string = 'progress-section';
  selectedBadge: any = null;
  badgeTiltStyle: string = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
  
  private observer: IntersectionObserver | null = null;
  private badgeAudioInterval: any = null;

  constructor(
    private authService: AuthService,
    private classroomService: ClassroomService,
    private progressService: ProgressService,
    public tts: TtsService,
    private router: Router,
    private notificationService: NotificationService,
    private el: ElementRef,
    private audioService: AudioService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.checkStudentClass();
    this.checkNewBadges();
  }

  ngAfterViewInit(): void {
    this.setupScrollObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.tts.stop();
    this.stopBadgeAudio();
  }

  checkNewBadges(): void {
    let hasNewBadges = false;
    
    if (localStorage.getItem('newBadgeAlert') === 'true') {
      hasNewBadges = true;
      localStorage.removeItem('newBadgeAlert');
    }
    
    const newB = localStorage.getItem('newBadges');
    if (newB) {
      this.newBadgesList = JSON.parse(newB);
      hasNewBadges = true;
      localStorage.removeItem('newBadges');
    }

    if (hasNewBadges) {
      this.showBadgeNotification = true;
      this.playBadgeAudioLoop();
    }
  }

  playBadgeAudioLoop(): void {
    this.audioService.playSound('badge-notification');
    this.badgeAudioInterval = setInterval(() => {
      this.audioService.playSound('badge-notification');
    }, 3000); 
  }

  stopBadgeAudio(): void {
    if (this.badgeAudioInterval) {
      clearInterval(this.badgeAudioInterval);
      this.badgeAudioInterval = null;
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
        this.currentClass = null;
        this.isLoading = false;
      },
    });
  }

  loadChallenges(): void {
    this.progressService.getStudentChallenges(this.user.id).subscribe({
      next: (data) => {
        this.challenges = data;
        const completados = this.challenges.filter((c) => c.status === 'completed').length;
        this.progressValue = this.challenges.length > 0 ? (completados / this.challenges.length) * 100 : 0;
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

  loadBadges(): void {
    this.progressService.getStudentBadges(this.user.id).subscribe({
      next: (badges) => {
        this.unlockedBadges = badges.filter((b) => b.unlocked);
        this.lockedBadges = badges.filter((b) => !b.unlocked);
      },
    });
  }

  setupScrollObserver(): void {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
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

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.focus({ preventScroll: true });
    }
  }

  getTargetChallengeId(): string {
    if (!this.challenges || this.challenges.length === 0) return 'badges-section';
    const nextChallenge = this.challenges.find((c) => c.status !== 'completed' && c.status !== 'locked');
    if (nextChallenge) return `challenge-${nextChallenge.id}`;
    const unlocked = this.challenges.filter((c) => c.status !== 'locked');
    if (unlocked.length > 0) return `challenge-${unlocked[unlocked.length - 1].id}`;
    return `challenge-${this.challenges[0].id}`;
  }

  startOrContinueJourney(): void {
    const targetId = this.getTargetChallengeId();
    this.scrollToSection(targetId);
  }

  scrollToBadges(): void {
    const el = document.getElementById('unlocked-title');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.showBadgeNotification = false;
      this.stopBadgeAudio();
      setTimeout(() => {
        this.newBadgesList = [];
      }, 10000);
    }
  }

  goToChallenge(challenge: any): void {
    if (challenge.status === 'locked') {
      this.notificationService.showAlert('Debes completar los niveles anteriores primero.', 'error');
      return;
    }
    this.router.navigate(['/student/challenge-view', challenge.id]);
  }

  goToJoinClass(): void {
    this.router.navigate(['/student/profile'], { fragment: 'class-code' });
  }

  intentarDesbloquear(badge: any): void {
    this.closeBadgeModal();

    if (!badge || !this.challenges || this.challenges.length === 0) {
      setTimeout(() => this.scrollToSection(this.getTargetChallengeId()), 150);
      return;
    }

    let foundChallenge = this.challenges.find((c) => {
      if (badge.desafio_id && String(c.id) === String(badge.desafio_id)) return true;
      if (badge.challenge_id && String(c.id) === String(badge.challenge_id)) return true;
      if (badge.desafio && badge.desafio.id && String(c.id) === String(badge.desafio.id)) return true;
      if (badge.nivel && Number(c.nivel) === Number(badge.nivel)) return true;
      if (badge.desafio_nivel && Number(c.nivel) === Number(badge.desafio_nivel)) return true;
      if (badge.desafio && badge.desafio.nivel && Number(c.nivel) === Number(badge.desafio.nivel)) return true;
      return false;
    });

    if (!foundChallenge) {
      const textToSearch = `${badge.codigo || ''} ${badge.nombre || ''} ${badge.descripcion || ''}`.toLowerCase();
      
      foundChallenge = this.challenges.find((c) => {
        const nivelNum = c.nivel;
        if (nivelNum && (
          textToSearch.includes(`nivel ${nivelNum}`) || 
          textToSearch.includes(`nivel_${nivelNum}`) || 
          textToSearch.includes(`desafio ${nivelNum}`) ||
          textToSearch.includes(`desafio_${nivelNum}`) ||
          textToSearch.includes(`juego ${nivelNum}`) ||
          textToSearch.includes(`juego_${nivelNum}`) ||
          textToSearch.includes(`nivel-${nivelNum}`)
        )) {
          return true;
        }
        return false;
      });
    }

    const targetSection = foundChallenge ? `challenge-${foundChallenge.id}` : this.getTargetChallengeId();

    setTimeout(() => {
      this.scrollToSection(targetSection);
    }, 150);
  }

  leerNivel(challenge: any): void {
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

  isNewBadge(codigo: string): boolean {
    return this.newBadgesList.includes(codigo);
  }

  openBadgeModal(badge: any): void {
    this.selectedBadge = badge;
    this.badgeTiltStyle = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
  }

  closeBadgeModal(): void {
    this.selectedBadge = null;
    if (this.tts.isPlaying) {
      this.tts.stop();
    }
  }

  onBadgeMouseMove(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;

    this.badgeTiltStyle = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
  }

  onBadgeMouseLeave(): void {
    this.badgeTiltStyle = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
  }

  leerInsigniaModal(): void {
    if (this.tts.isPlaying) {
      this.tts.stop();
      return;
    }
    if (this.selectedBadge) {
      const estado = this.selectedBadge.unlocked ? 'Insignia ganada' : 'Insignia bloqueada';
      const texto = `${estado}. ${this.selectedBadge.nombre}. ${this.selectedBadge.descripcion}.`;
      this.tts.speak(texto);
    }
  }

  getChallengeImagePath(nombre: string): string {
    if (!nombre) return 'assets/pictures/recursos/default.png';
    const nombreFormateado = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    return `assets/pictures/recursos/${nombreFormateado}.png`;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/pictures/recursos/default.png';
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
}