import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { AudioService } from '@core/services/audio.service';

export interface LightCell {
  r: number;
  c: number;
  isOn: boolean;
  isHint: boolean;
}

@Component({
  selector: 'app-juego-patrones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patrones.component.html',
  styleUrl: './patrones.component.scss'
})
export class PatronesComponent implements OnInit, OnChanges {
  
  @Input() difficultyLevel: 'easy' | 'medium' | 'hard' = 'easy';
  @Output() gameResult = new EventEmitter<{status: 'success' | 'failed', message: string}>();

  difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  gridSize: number = 3; 
  grid: LightCell[][] = [];
  
  // El "Cerebro" matemático. Guarda qué casillas necesitan ser clickeadas para ganar.
  solutionMask: boolean[][] = []; 
  
  movesCount: number = 0;
  isPlaying: boolean = false;
  gameStatus: 'idle' | 'success' = 'idle';

  constructor(private audioService: AudioService) {}

  ngOnInit() {
    this.initGame(this.difficultyLevel);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['difficultyLevel'] && !changes['difficultyLevel'].firstChange) {
      this.initGame(this.difficultyLevel);
    }
  }

  // --- INICIALIZACIÓN ---

  initGame(difficulty: 'easy' | 'medium' | 'hard') {
    this.difficulty = difficulty;
    this.movesCount = 0;
    this.gameStatus = 'idle';
    this.isPlaying = false;

    // Tamaños amigables: Fácil (3x3), Medio (4x4), Difícil (5x5)
    if (difficulty === 'easy') this.gridSize = 3;
    if (difficulty === 'medium') this.gridSize = 4;
    if (difficulty === 'hard') this.gridSize = 5;

    this.generateSolvableBoard();
  }

  generateSolvableBoard() {
    this.grid = [];
    this.solutionMask = [];

    // 1. Inicializar tablero todo apagado y máscara de solución en false
    for (let r = 0; r < this.gridSize; r++) {
      let gridRow: LightCell[] = [];
      let maskRow: boolean[] = [];
      for (let c = 0; c < this.gridSize; c++) {
        gridRow.push({ r, c, isOn: false, isHint: false });
        maskRow.push(false);
      }
      this.grid.push(gridRow);
      this.solutionMask.push(maskRow);
    }

    // 2. Simular clics aleatorios para "desordenar" el tablero
    // Entre más clics, más revuelto. Pero siempre garantizamos que tiene solución.
    const scrambleMoves = this.difficulty === 'easy' ? 4 : this.difficulty === 'medium' ? 7 : 12;
    
    for (let i = 0; i < scrambleMoves; i++) {
      const r = Math.floor(Math.random() * this.gridSize);
      const c = Math.floor(Math.random() * this.gridSize);
      
      // Aplicar el cambio lógico (sin sonido ni contar movimientos)
      this.toggleLogic(r, c);
      // Registrar que hicimos este clic en la máscara de solución
      this.solutionMask[r][c] = !this.solutionMask[r][c];
    }
    
    // Validar que no se haya generado un tablero ya resuelto por azar
    if (this.checkWinCondition()) {
       this.generateSolvableBoard(); // Reintentar
    }
  }

  // --- LÓGICA CORE DEL JUEGO (LUCES) ---

  onLightClick(r: number, c: number) {
    if (this.gameStatus === 'success' || this.isPlaying) return;

    this.audioService.playSound('jump'); // O usa un sonido de "switch" si lo tienes
    this.movesCount++;
    
    // Apagar la pista si había una encendida
    this.clearHints();

    // 1. Aplicar los cambios visuales en el tablero
    this.toggleLogic(r, c);

    // 2. Actualizar el "Cerebro": Hacer clic invierte la necesidad de hacer clic ahí
    this.solutionMask[r][c] = !this.solutionMask[r][c];

    // 3. Validar victoria
    if (this.checkWinCondition()) {
      this.gameStatus = 'success';
      this.isPlaying = true; // Bloquea clics adicionales
      this.audioService.playSound('congratulations');
      
      // Emitir victoria después de una breve pausa para que vea que se apagó todo
      setTimeout(() => {
        this.gameResult.emit({ 
          status: 'success', 
          message: `¡Patrón descifrado en ${this.movesCount} movimientos!` 
        });
      }, 1000);
    }
  }

  // Cambia el estado de la celda central y sus 4 vecinos (arriba, abajo, izq, der)
  private toggleLogic(r: number, c: number) {
    this.toggleCell(r, c);       // Centro
    this.toggleCell(r - 1, c);   // Arriba
    this.toggleCell(r + 1, c);   // Abajo
    this.toggleCell(r, c - 1);   // Izquierda
    this.toggleCell(r, c + 1);   // Derecha
  }

  private toggleCell(r: number, c: number) {
    // Solo cambia si está dentro de los límites de la matriz
    if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
      this.grid[r][c].isOn = !this.grid[r][c].isOn;
    }
  }

  private checkWinCondition(): boolean {
    // Gana si TODAS las luces están apagadas (isOn === false)
    return this.grid.every(row => row.every(cell => !cell.isOn));
  }

  // --- SISTEMA INTELIGENTE DE PISTAS ---

  mostrarPista() {
    if (this.gameStatus === 'success') return;
    this.clearHints();

    // Gracias a la máscara de solución matemática, encontrar la pista es O(1)
    // Solo buscamos la primera celda en solutionMask que sea 'true'
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.solutionMask[r][c] === true) {
          
          this.grid[r][c].isHint = true; // Encendemos el CSS rojo parpadeante
          
          // Apagar automáticamente después de 3 segundos
          setTimeout(() => {
            if (this.grid[r] && this.grid[r][c]) {
              this.grid[r][c].isHint = false;
            }
          }, 3000);
          
          return; // Detenemos la búsqueda al encontrar la primera pista
        }
      }
    }
  }

  private clearHints() {
    this.grid.forEach(row => row.forEach(cell => cell.isHint = false));
  }
}