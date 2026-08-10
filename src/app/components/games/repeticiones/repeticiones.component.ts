import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AudioService } from '@core/services/audio.service';

export type Command = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Cell {
  x: number;
  y: number;
  type: 'empty' | 'wall' | 'start' | 'goal' | 'path';
  isHint?: boolean;
}

export interface CodeBlock {
  type: 'command' | 'loop';
  value?: Command;
  times?: number;
  commands?: Command[];
}

@Component({
  selector: 'app-repeticiones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './repeticiones.component.html',
  styleUrl: './repeticiones.component.scss',
})
export class RepeticionesComponent implements OnInit, OnChanges {
  @Input() difficultyLevel: 'easy' | 'medium' | 'hard' = 'easy';
  @Output() gameResult = new EventEmitter<{
    status: 'success' | 'failed';
    message: string;
  }>();
  @Output() hintUsed = new EventEmitter<void>();

  difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  gridSize: number = 5;
  grid: Cell[][] = [];

  playerPosition = { x: 0, y: 0 };
  startPosition = { x: 0, y: 0 };
  playerSequence: CodeBlock[] = [];

  maxBlocks: number = 1;
  isBuildingLoop: boolean = false;
  currentLoopCommands: Command[] = [];
  currentLoopTimes: number = 3;

  isPlaying: boolean = false;
  gameStatus: 'idle' | 'running' | 'success' | 'failed' = 'idle';
  isDestroying: boolean = false;

  activeHintBtn: string | null = null;
  isHintPlaying: boolean = false;
  solutionPattern: string[] = [];

  constructor(private audioService: AudioService) {}

  ngOnInit() {
    this.initGame(this.difficultyLevel);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['difficultyLevel'] && !changes['difficultyLevel'].firstChange) {
      this.initGame(this.difficultyLevel);
    }
  }

  get isMaxBlocksReached(): boolean {
    return this.playerSequence.length >= this.maxBlocks && !this.isBuildingLoop;
  }

  initGame(difficulty: 'easy' | 'medium' | 'hard') {
    this.difficulty = difficulty;
    this.playerSequence = [];
    this.isBuildingLoop = false;
    this.currentLoopCommands = [];
    this.gameStatus = 'idle';
    this.isPlaying = false;

    if (difficulty === 'easy') {
      this.gridSize = 5;
      this.maxBlocks = 1;
    }
    if (difficulty === 'medium') {
      this.gridSize = 7;
      this.maxBlocks = 2;
    }
    if (difficulty === 'hard') {
      this.gridSize = 8;
      this.maxBlocks = 2;
    }

    this.generatePatternBoard();
  }

  generatePatternBoard() {
    this.grid = [];
    for (let y = 0; y < this.gridSize; y++) {
      let row: Cell[] = [];
      for (let x = 0; x < this.gridSize; x++) {
        row.push({ x, y, type: 'wall' });
      }
      this.grid.push(row);
    }

    const maxIdx = this.gridSize - 1;

    const corners = [
      {
        x: 0,
        y: 0,
        dirX: 'RIGHT' as Command,
        dirY: 'DOWN' as Command,
        sX: 1,
        sY: 1,
      },
      {
        x: maxIdx,
        y: 0,
        dirX: 'LEFT' as Command,
        dirY: 'DOWN' as Command,
        sX: -1,
        sY: 1,
      },
      {
        x: 0,
        y: maxIdx,
        dirX: 'RIGHT' as Command,
        dirY: 'UP' as Command,
        sX: 1,
        sY: -1,
      },
      {
        x: maxIdx,
        y: maxIdx,
        dirX: 'LEFT' as Command,
        dirY: 'UP' as Command,
        sX: -1,
        sY: -1,
      },
    ];

    const selectedCorner = corners[Math.floor(Math.random() * corners.length)];

    const startX = selectedCorner.x;
    const startY = selectedCorner.y;
    const dX = selectedCorner.dirX;
    const dY = selectedCorner.dirY;
    const sX = selectedCorner.sX;
    const sY = selectedCorner.sY;

    this.startPosition = { x: startX, y: startY };
    this.playerPosition = { ...this.startPosition };
    this.grid[startY][startX].type = 'start';

    const guaranteedPath = new Set<string>();
    this.solutionPattern = [];

    if (this.difficulty === 'easy') {
      const chosenDirCmd = Math.random() > 0.5 ? dX : dY;
      const chosenStepSign = chosenDirCmd === dX ? sX : sY;
      const steps = 4;

      this.solutionPattern = [
        'LOOP_START',
        chosenDirCmd,
        'LOOP_TIMES',
        'LOOP_END',
      ];
      let cx = startX,
        cy = startY;

      for (let i = 0; i < steps; i++) {
        if (chosenDirCmd === dX) cx += chosenStepSign;
        else cy += chosenStepSign;
        this.grid[cy][cx].type = 'empty';
        guaranteedPath.add(`${cx},${cy}`);
      }
      this.grid[cy][cx].type = 'goal';
    } else if (this.difficulty === 'medium') {
      const steps = 3;
      this.solutionPattern = [
        'LOOP_START',
        dX,
        'LOOP_TIMES',
        'LOOP_END',
        'LOOP_START',
        dY,
        'LOOP_TIMES',
        'LOOP_END',
      ];
      let cx = startX,
        cy = startY;

      for (let i = 0; i < steps; i++) {
        cx += sX;
        this.grid[cy][cx].type = 'empty';
        guaranteedPath.add(`${cx},${cy}`);
      }
      for (let i = 0; i < steps; i++) {
        cy += sY;
        this.grid[cy][cx].type = 'empty';
        guaranteedPath.add(`${cx},${cy}`);
      }
      this.grid[cy][cx].type = 'goal';
    } else if (this.difficulty === 'hard') {
      const N = Math.floor(Math.random() * 3) + 5;
      this.solutionPattern = ['LOOP_START', dX, dY, 'LOOP_TIMES', 'LOOP_END'];

      let zx = startX,
        zy = startY;
      for (let i = 0; i < N; i++) {
        zx += sX;
        if (zx >= 0 && zx < this.gridSize) guaranteedPath.add(`${zx},${zy}`);
        zy += sY;
        if (zy >= 0 && zy < this.gridSize) guaranteedPath.add(`${zx},${zy}`);
      }

      let lx = startX,
        ly = startY;
      if (Math.random() > 0.5) {
        for (let i = 0; i < N; i++) {
          lx += sX;
          guaranteedPath.add(`${lx},${ly}`);
        }
        for (let i = 0; i < N; i++) {
          ly += sY;
          guaranteedPath.add(`${lx},${ly}`);
        }
      } else {
        for (let i = 0; i < N; i++) {
          ly += sY;
          guaranteedPath.add(`${lx},${ly}`);
        }
        for (let i = 0; i < N; i++) {
          lx += sX;
          guaranteedPath.add(`${lx},${ly}`);
        }
      }

      guaranteedPath.forEach((coord) => {
        const [x, y] = coord.split(',').map(Number);
        if ((x !== startX || y !== startY) && this.grid[y] && this.grid[y][x]) {
          this.grid[y][x].type = 'empty';
        }
      });

      const goalX = startX + N * sX;
      const goalY = startY + N * sY;
      this.grid[goalY][goalX].type = 'goal';
    }

    const noiseLevel = this.difficulty === 'easy' ? 0 : 4;
    let noiseAdded = 0;
    while (noiseAdded < noiseLevel) {
      const rx = Math.floor(Math.random() * this.gridSize);
      const ry = Math.floor(Math.random() * this.gridSize);
      if (
        !guaranteedPath.has(`${rx},${ry}`) &&
        (rx !== startX || ry !== startY) &&
        this.grid[ry][rx].type === 'wall'
      ) {
        this.grid[ry][rx].type = 'empty';
        noiseAdded++;
      }
    }
  }

  startLoop() {
    if (this.isMaxBlocksReached) return;
    this.isBuildingLoop = true;
    this.currentLoopCommands = [];

    if (this.difficulty === 'easy') this.currentLoopTimes = 4;
    else if (this.difficulty === 'medium') this.currentLoopTimes = 5;
    else if (this.difficulty === 'hard') this.currentLoopTimes = 6;
  }

  closeLoop() {
    if (this.currentLoopCommands.length === 0) {
      alert('El bucle está vacío. Añade flechas antes de cerrarlo.');
      return;
    }

    this.playerSequence.push({
      type: 'loop',
      times: Number(this.currentLoopTimes),
      commands: [...this.currentLoopCommands],
    });

    this.isBuildingLoop = false;
    this.currentLoopCommands = [];
  }

  addCommand(cmd: Command) {
    if (this.gameStatus === 'running') return;

    if (this.isBuildingLoop) {
      if (this.currentLoopCommands.length >= 2) {
        alert(
          'Límite del bucle: Solo 2 acciones por repetición para mantenerlo simple.',
        );
        return;
      }
      this.currentLoopCommands.push(cmd);
    } else {
      if (this.isMaxBlocksReached) {
        this.audioService.playSound('fail');
        alert(
          `Has alcanzado el límite de ${this.maxBlocks} bloque(s). ¡Piensa en usar un bucle!`,
        );
        return;
      }
      this.playerSequence.push({ type: 'command', value: cmd });
    }
  }

  removeBlock(index: number) {
    if (this.gameStatus === 'running') return;
    if (this.isBuildingLoop) return;
    this.playerSequence.splice(index, 1);
  }

  async runSequence() {
    if (this.playerSequence.length === 0) return;
    this.gameStatus = 'running';
    this.isPlaying = true;

    let flattenedCommands: Command[] = [];

    for (const block of this.playerSequence) {
      if (block.type === 'command' && block.value) {
        flattenedCommands.push(block.value);
      } else if (block.type === 'loop' && block.commands) {
        for (let t = 0; t < (block.times || 1); t++) {
          flattenedCommands.push(...block.commands);
        }
      }
    }

    let currentX = this.startPosition.x;
    let currentY = this.startPosition.y;

    for (let i = 0; i < flattenedCommands.length; i++) {
      const cmd = flattenedCommands[i];

      if (cmd === 'RIGHT') currentX++;
      if (cmd === 'LEFT') currentX--;
      if (cmd === 'DOWN') currentY++;
      if (cmd === 'UP') currentY--;

      this.audioService.playSound('jump');
      this.playerPosition = { x: currentX, y: currentY };

      if (
        this.isOutOfBounds(currentX, currentY) ||
        this.isWall(currentX, currentY)
      ) {
        await this.handleFailure(
          '¡Ups! Chocaste con el muro gris. El patrón del bucle no encaja.',
        );
        return;
      }
      await this.delay(400);
    }

    if (this.grid[currentY][currentX].type === 'goal') {
      this.gameStatus = 'success';
      this.audioService.playSound('robot-cargando');
      this.gameResult.emit({
        status: 'success',
        message: '¡Automatización perfecta! El bucle funcionó.',
      });
    } else {
      await this.handleFailure(
        'El código terminó, pero no llegaste a la bandera roja.',
      );
    }
    this.isPlaying = false;
  }

  async handleFailure(msg: string) {
    this.gameStatus = 'failed';
    this.audioService.playSound('robot-off');
    this.isPlaying = false;
    this.isDestroying = true;
    await this.delay(500);
    this.playerPosition = { ...this.startPosition };
    this.isDestroying = false;
    this.gameResult.emit({ status: 'failed', message: msg });
  }

  async mostrarPista() {
    if (this.gameStatus !== 'idle' || this.isHintPlaying) return;

    this.hintUsed.emit();
    this.isHintPlaying = true;

    for (let i = 0; i < this.solutionPattern.length; i++) {
      const btnToPress = this.solutionPattern[i];
      this.activeHintBtn = btnToPress;
      this.audioService.playSound('switch');
      await this.delay(1100);
      this.activeHintBtn = null;
      await this.delay(200);
    }

    this.isHintPlaying = false;
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
}
