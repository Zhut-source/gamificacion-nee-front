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
  startPosition = { x: 0, y: 0 };
  correctPath: { x: number, y: number }[] = [];
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

  initGame(difficulty: 'easy' | 'medium' | 'hard') {
    this.difficulty = difficulty;
    this.playerSequence = [];
    this.gameStatus = 'idle';
    this.isPlaying = false;
    this.failureMessage = null;

    if (difficulty === 'easy') this.gridSize = 4;
    if (difficulty === 'medium') this.gridSize = 6;
    if (difficulty === 'hard') this.gridSize = 8;

    this.generateGuaranteedBoard();
  }

  resetAfterFailure() {
    this.playerPosition = { ...this.startPosition };
    this.failureMessage = null;
    this.gameStatus = 'idle';
    this.isDestroying = false;
    this.isPlaying = false;
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

    const maxIdx = this.gridSize - 1;

    const corners = [
      { startX: 0, startY: 0, goalX: maxIdx, goalY: maxIdx, stepX: 1, stepY: 1 }, 
      { startX: maxIdx, startY: 0, goalX: 0, goalY: maxIdx, stepX: -1, stepY: 1 }, 
      { startX: 0, startY: maxIdx, goalX: maxIdx, goalY: 0, stepX: 1, stepY: -1 }, 
      { startX: maxIdx, startY: maxIdx, goalX: 0, goalY: 0, stepX: -1, stepY: -1 }
    ];

    this.correctPath = [];
    const selectedCorner = corners[Math.floor(Math.random() * corners.length)];
    this.startPosition = { x: selectedCorner.startX, y: selectedCorner.startY };
    this.playerPosition = { ...this.startPosition };
    const goalPos = { x: selectedCorner.goalX, y: selectedCorner.goalY };

    const guaranteedPath = new Set<string>();
    let cx = this.startPosition.x;
    let cy = this.startPosition.y;
    guaranteedPath.add(`${cx},${cy}`);

    while (cx !== goalPos.x || cy !== goalPos.y) {
      if (cx === goalPos.x) {
        cy += selectedCorner.stepY;
      } else if (cy === goalPos.y) {
        cx += selectedCorner.stepX;
      } else {
        if (Math.random() > 0.5) cx += selectedCorner.stepX;
        else cy += selectedCorner.stepY;
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

    this.grid[this.startPosition.y][this.startPosition.x].type = 'start';
    this.grid[goalPos.y][goalPos.x].type = 'goal';
    this.correctPath.push({ x: cx, y: cy });
  }

  mostrarPista() {
    this.hintUsed.emit();

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x].isHint = false;
      }
    }

    let goalPos = { x: 0, y: 0 };
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.grid[y][x].type === 'goal') {
          goalPos = { x, y };
        }
      }
    }

    let currentX = this.startPosition.x;
    let currentY = this.startPosition.y;

    for (const cmd of this.playerSequence) {
      if (cmd === 'UP') currentY--;
      else if (cmd === 'DOWN') currentY++;
      else if (cmd === 'LEFT') currentX--;
      else if (cmd === 'RIGHT') currentX++;
    }

    if (
      currentX < 0 || currentX >= this.gridSize ||
      currentY < 0 || currentY >= this.gridSize ||
      this.grid[currentY][currentX].type === 'wall'
    ) {
      return;
    }

    const queue: { x: number, y: number, path: { x: number, y: number }[] }[] = [];
    queue.push({ x: currentX, y: currentY, path: [] });

    const visited = new Set<string>();
    visited.add(`${currentX},${currentY}`);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.x === goalPos.x && current.y === goalPos.y) {
        for (const point of current.path) {
          if (this.grid[point.y][point.x].type !== 'goal') {
            this.grid[point.y][point.x].isHint = true;
          }
        }

        setTimeout(() => {
          for (const point of current.path) {
            if (this.grid[point.y] && this.grid[point.y][point.x]) {
              this.grid[point.y][point.x].isHint = false;
            }
          }
        }, 3000);

        break;
      }

      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
          if (this.grid[ny][nx].type !== 'wall') {
            const posKey = `${nx},${ny}`;
            
            if (!visited.has(posKey)) {
              visited.add(posKey);
              queue.push({
                x: nx,
                y: ny,
                path: [...current.path, { x: nx, y: ny }]
              });
            }
          }
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
    if (this.gameStatus === 'running' || this.isPlaying) return;
    this.playerSequence.push(cmd);
  }

  removeCommand(index: number) {
    if (this.gameStatus === 'running' || this.isPlaying) return;
    this.playerSequence.splice(index, 1);
  }

  async runSequence() {
    if (this.playerSequence.length === 0) return;
    this.gameStatus = 'running';
    this.isPlaying = true;
    this.currentCommandIndex = -1;
    this.failureMessage = null;

    let currentX = this.startPosition.x;
    let currentY = this.startPosition.y;
    
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
    if (this.isPlaying || this.failureMessage) return;

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