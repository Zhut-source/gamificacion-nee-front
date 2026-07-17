import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { AudioService } from '@core/services/audio.service';

export type Command = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Cell {
  x: number;
  y: number;
  type: 'empty' | 'wall' | 'start' | 'goal' | 'path';
  isHint?: boolean;
}

@Component({
  selector: 'app-secuenciacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './secuenciacion.component.html',
  styleUrl: './secuenciacion.component.scss',
})
export class SecuenciacionComponent implements OnInit, OnChanges {
  @Input() difficultyLevel: 'easy' | 'medium' | 'hard' = 'easy';
  @Output() gameResult = new EventEmitter<{
    status: 'success' | 'failed';
    message: string;
  }>();
  @Output() hintUsed = new EventEmitter<void>();

  difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  gridSize: number = 4;
  grid: Cell[][] = [];
  playerPosition = { x: 0, y: 0 };
  playerSequence: Command[] = [];
  isPlaying: boolean = false;
  gameStatus: 'idle' | 'running' | 'success' | 'failed' = 'idle';
  isDestroying: boolean = false;
  currentCommandIndex: number = -1;

  failureMessage: string | null = null;
  

  constructor(private audioService: AudioService) {}

  ngOnInit() {
    this.initGame(this.difficultyLevel);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['difficultyLevel'] && !changes['difficultyLevel'].firstChange) {
      this.initGame(this.difficultyLevel);
    }
  }

  // --- LÓGICA DE INICIALIZACIÓN ---

  initGame(difficulty: 'easy' | 'medium' | 'hard') {
    this.difficulty = difficulty;
    this.playerSequence = [];
    this.gameStatus = 'idle';
    this.isPlaying = false;

    if (difficulty === 'easy') this.gridSize = 4;
    if (difficulty === 'medium') this.gridSize = 6;
    if (difficulty === 'hard') this.gridSize = 8;

    this.generateGuaranteedBoard();
  }

  resetAfterFailure() {
    this.playerPosition = { x: 0, y: 0 };
    this.failureMessage = null;
    this.gameStatus = 'idle';
    this.isDestroying = false;
  }

  generateGuaranteedBoard() {
    this.grid = [];
    for (let y = 0; y < this.gridSize; y++) {
      let row: Cell[] = [];
      for (let x = 0; x < this.gridSize; x++) {
        row.push({ x, y, type: 'empty', isHint: false });
      }
      this.grid.push(row);
    }

    this.playerPosition = { x: 0, y: 0 };
    const goalPos = { x: this.gridSize - 1, y: this.gridSize - 1 };

    const guaranteedPath = new Set<string>();
    let cx = 0,
      cy = 0;
    guaranteedPath.add(`0,0`);

    while (cx !== goalPos.x || cy !== goalPos.y) {
      if (cx === goalPos.x) {
        cy++;
      } else if (cy === goalPos.y) {
        cx++;
      } else {
        if (Math.random() > 0.5) cx++;
        else cy++;
      }
      guaranteedPath.add(`${cx},${cy}`);
    }

    let numWalls = 0;
    if (this.difficulty === 'easy') numWalls = 2;
    else if (this.difficulty === 'medium') numWalls = this.gridSize;
    else if (this.difficulty === 'hard') numWalls = this.gridSize * 2;

    let wallsPlaced = 0;
    let attempts = 0;

    while (wallsPlaced < numWalls && attempts < 100) {
      const rx = Math.floor(Math.random() * this.gridSize);
      const ry = Math.floor(Math.random() * this.gridSize);
      const posKey = `${rx},${ry}`;

      if (!guaranteedPath.has(posKey) && this.grid[ry][rx].type === 'empty') {
        this.grid[ry][rx].type = 'wall';
        wallsPlaced++;
      }
      attempts++;
    }

    this.grid[0][0].type = 'start';
    this.grid[goalPos.y][goalPos.x].type = 'goal';
  }

  mostrarPista() {
    if (this.grid.some((row) => row.some((cell) => cell.isHint))) return;

    this.hintUsed.emit();

    const queue: { x: number; y: number; path: { x: number; y: number }[] }[] =
      [];
    const visited = new Set<string>();

    queue.push({
      x: this.playerPosition.x,
      y: this.playerPosition.y,
      path: [],
    });
    visited.add(`${this.playerPosition.x},${this.playerPosition.y}`);

    const goalX = this.gridSize - 1;
    const goalY = this.gridSize - 1;
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];

    while (queue.length > 0) {
      const curr = queue.shift()!;

      if (curr.x === goalX && curr.y === goalY) {
        this.dibujarPistaEnTablero(curr.path);
        return;
      }

      for (let [dx, dy] of dirs) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const posKey = `${nx},${ny}`;

        if (
          nx >= 0 &&
          nx < this.gridSize &&
          ny >= 0 &&
          ny < this.gridSize &&
          this.grid[ny][nx].type !== 'wall' &&
          !visited.has(posKey)
        ) {
          visited.add(posKey);
          const newPath = [...curr.path, { x: nx, y: ny }];
          queue.push({ x: nx, y: ny, path: newPath });
        }
      }
    }
  }

  dibujarPistaEnTablero(path: { x: number; y: number }[]) {
    for (let i = 0; i < path.length; i++) {
      const step = path[i];
      this.grid[step.y][step.x].isHint = true;
    }

    setTimeout(() => {
      this.grid.forEach((row) => row.forEach((cell) => (cell.isHint = false)));
    }, 3000);
  }

  addCommand(cmd: Command) {
    if (this.gameStatus === 'running') return;
    this.playerSequence.push(cmd);
  }

  removeCommand(index: number) {
    if (this.gameStatus === 'running') return;
    this.playerSequence.splice(index, 1);
  }

  async runSequence() {
    if (this.playerSequence.length === 0) return;
    this.gameStatus = 'running';
    this.isPlaying = true;
    this.currentCommandIndex = -1;
    this.failureMessage = null;

    let currentX = 0;
    let currentY = 0;
    for (let i = 0; i < this.playerSequence.length; i++) {
      this.currentCommandIndex = i;
      const cmd = this.playerSequence[i];

      if (cmd === 'RIGHT') currentX++;
      if (cmd === 'LEFT') currentX--;
      if (cmd === 'DOWN') currentY++;
      if (cmd === 'UP') currentY--;

      this.audioService.playSound('jump');
      this.playerPosition = { x: currentX, y: currentY };

      if (this.isOutOfBounds(currentX, currentY)) {
        this.gameStatus = 'failed';
        this.isPlaying = false;
        this.currentCommandIndex = -1;

        this.audioService.playSound('robot-off');
        this.isDestroying = true;

        await this.delay(400);
        
        this.isDestroying = false;
        this.failureMessage = 'La secuencia que usaste hizo que te salieras del mapa. ¡Haz clic aquí para reiniciar!';

        this.gameResult.emit({
          status: 'failed',
          message: '¡Cuidado! Te saliste del tablero.',
        });
        return;
      }

      if (this.isWall(currentX, currentY)) {
        this.gameStatus = 'failed';
        this.isPlaying = false;
        this.currentCommandIndex = -1;

        this.isDestroying = true;
        this.audioService.playSound('robot-off');

        await this.delay(400);

        this.isDestroying = false;
        this.failureMessage = '¡Ups! Chocaste con un obstáculo. ¡Haz clic aquí para reiniciar!';
        
        this.gameResult.emit({
          status: 'failed',
          message: '¡Ups! Chocaste. Revisa tu secuencia.',
        });
        return;
      }
      await this.delay(500);
    }
    this.currentCommandIndex = -1;

    if (this.grid[currentY][currentX].type === 'goal') {
      this.gameStatus = 'success';
      this.audioService.playSound('robot-cargando');
      this.gameResult.emit({ status: 'success', message: '¡Ruta perfecta!' });
    } else {
      this.gameStatus = 'failed';
      this.failureMessage = 'No llegaste a la meta con esa secuencia. ¡Haz clic aquí para reiniciar!';
      this.gameResult.emit({
        status: 'failed',
        message: 'Asegúrate de llegar a la bandera.',
      });
    }
    this.isPlaying = false;
  }

  isOutOfBounds(x: number, y: number): boolean {
    return x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize;
  }
  isWall(x: number, y: number): boolean {
    return this.grid[y][x].type === 'wall';
  }
  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isPlaying) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
        event.preventDefault();
        this.addCommand('UP');
        break;

      case 'ArrowDown':
      case 's':
        event.preventDefault();
        this.addCommand('DOWN');
        break;

      case 'ArrowLeft':
      case 'a':
        event.preventDefault();
        this.addCommand('LEFT');
        break;

      case 'ArrowRight':
      case 'd':
        event.preventDefault();
        this.addCommand('RIGHT');
        break;

      case 'Escape':
      case 'Backspace':
        if (this.playerSequence.length > 0) {
          event.preventDefault();
          this.removeCommand(this.playerSequence.length - 1);
        }
        break;

      case ' ':
        event.preventDefault();
        this.runSequence();
        break;
    }
  }
}
