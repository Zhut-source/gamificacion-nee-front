import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, OnDestroy } from '@angular/core';
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
export class PatronesComponent implements OnInit, OnChanges, OnDestroy {
  
  @Input() difficultyLevel: 'easy' | 'medium' | 'hard' = 'easy';
  @Output() gameResult = new EventEmitter<{status: 'success' | 'failed', message: string}>();
  @Output() hintUsed = new EventEmitter<void>();

  difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  gridSize: number = 3; 
  grid: LightCell[][] = [];
  solutionMask: boolean[][] = []; 
  
  movesCount: number = 0;
  intentosCount: number = 0;
  maxIntentos: number = 3;
  maxMoves: number = 30;

  timeRemaining: number = 30;
  maxTime: number = 30;
  internalTimer: any;

  isPlaying: boolean = false;
  gameStatus: 'idle' | 'success' | 'failed' = 'idle';

  constructor(private audioService: AudioService) {}

  ngOnInit() {
    this.initGame(this.difficultyLevel);
  }

  ngOnDestroy() { 
    this.clearInternalTimer(); 
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['difficultyLevel'] && !changes['difficultyLevel'].firstChange) {
      this.initGame(this.difficultyLevel);
    }
  }

  initGame(difficulty: 'easy' | 'medium' | 'hard') {
    this.difficulty = difficulty;
    this.movesCount = 0;
    this.intentosCount = 0;
    this.gameStatus = 'idle';
    this.isPlaying = false;
    
    if (difficulty === 'easy') this.gridSize = 3;
    if (difficulty === 'medium') this.gridSize = 4;
    if (difficulty === 'hard') this.gridSize = 5;

    this.generateSolvableBoard();
  }

  startInternalTimer() {
    this.internalTimer = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        this.clearInternalTimer();
        this.triggerFailure('Se acabó el tiempo límite para este patrón. ¡Inténtalo de nuevo!');
      }
    }, 1000);
  }

  clearInternalTimer() {
    if (this.internalTimer) clearInterval(this.internalTimer);
  }

  generateSolvableBoard() {
    this.grid = [];
    this.solutionMask = [];

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

    const scrambleMoves = this.difficulty === 'easy' ? 4 : this.difficulty === 'medium' ? 7 : 12;
    
    for (let i = 0; i < scrambleMoves; i++) {
      const r = Math.floor(Math.random() * this.gridSize);
      const c = Math.floor(Math.random() * this.gridSize);
      
      this.toggleLogic(r, c);
      this.solutionMask[r][c] = !this.solutionMask[r][c];
    }
    
    if (this.checkWinCondition()) {
       this.generateSolvableBoard(); 
    }
  }

  onLightClick(r: number, c: number) {
    if (this.gameStatus === 'success' || this.isPlaying) return;

    this.audioService.playSound('switch');
    this.movesCount++;
    this.intentosCount = Math.floor(this.movesCount / 10);
    
    this.clearHints();
    this.toggleLogic(r, c);
    this.solutionMask[r][c] = !this.solutionMask[r][c];

    if (this.checkWinCondition()) {
      this.gameStatus = 'success';
      this.isPlaying = true;
      this.audioService.playSound('robot-cargando');
    
      setTimeout(() => {
        this.isPlaying = false;
        this.gameResult.emit({ 
          status: 'success', 
          message: `¡Patrón descifrado en ${this.movesCount} movimientos y ${this.intentosCount} intentos!` 
        });
      }, 1000);
      return;
    }

    if (this.intentosCount >= this.maxIntentos) {
      this.isPlaying = true;
      this.triggerFailure('Superaste el límite de 3 intentos permitidos. Reiniciando juego...');
      setTimeout(() => {
        this.initGame(this.difficulty);
      }, 2000);
    }
  }

  triggerFailure(msg: string) {
    this.gameStatus = 'failed';
    this.clearInternalTimer();
    this.audioService.playSound('fail');
    
    setTimeout(() => {
      this.gameResult.emit({ status: 'failed', message: msg });
    }, 1500);
  }

  private toggleLogic(r: number, c: number) {
    this.toggleCell(r, c);       
    this.toggleCell(r, c - 1);   
    this.toggleCell(r, c + 1);  
  }

  private toggleCell(r: number, c: number) {
    if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
      this.grid[r][c].isOn = !this.grid[r][c].isOn;
    }
  }

  private checkWinCondition(): boolean {
    return this.grid.every(row => row.every(cell => !cell.isOn));
  }

  mostrarPista() {
    if (this.gameStatus !== 'idle') return;

    this.hintUsed.emit();
    this.clearHints();

    const pendingHints: {r: number, c: number}[] = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.solutionMask[r][c] === true) {
          pendingHints.push({r, c});
        }
      }
    }

    if (pendingHints.length > 0) {
      const randomIndex = Math.floor(Math.random() * pendingHints.length);
      const target = pendingHints[randomIndex];
      
      this.grid[target.r][target.c].isHint = true;
      
      setTimeout(() => {
        if (this.grid[target.r] && this.grid[target.r][target.c]) {
          this.grid[target.r][target.c].isHint = false;
        }
      }, 3000);
    }
  }

  private clearHints() {
    this.grid.forEach(row => row.forEach(cell => cell.isHint = false));
  }
}