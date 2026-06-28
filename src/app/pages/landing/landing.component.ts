import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TtsService } from '@core/services/tts.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {

  @ViewChild('descripcion', { static: true }) descripcionElement!: ElementRef;

  constructor(
    private router: Router, 
    public tts: TtsService,
  ) {}


  goToLogin() {
    this.router.navigate(['/login']);
  }

  leerDescripcion() {

    if (this.tts.isPlaying) {
      this.tts.stop();
    } else {
      const texto = this.descripcionElement.nativeElement.textContent.trim() + ". Presiona comenzar para iniciar sesión o registrarte";
      this.tts.speak(texto);
    }
  }

  ngOnDestroy() {
  }
  
}
