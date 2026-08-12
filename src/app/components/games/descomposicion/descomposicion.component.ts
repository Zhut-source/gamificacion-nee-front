import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  OnInit,
  OnChanges,
} from '@angular/core';
import { AudioService } from '@core/services/audio.service';

export interface ShikakuCell {
  r: number;
  c: number;
  targetNumber: number | null;
  areaId: number | null;
  solutionId: number | null;
  isSelected: boolean;
  isError: boolean;
  isHint: boolean;
  color: string | null;
}

@Component({
  selector: 'app-descomposicion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './descomposicion.component.html',
  styleUrl: './descomposicion.component.scss',
})
export class DescomposicionComponent implements OnInit, OnChanges {
  @Input() difficultyLevel: 'easy' | 'medium' | 'hard' = 'easy';
  @Output() gameResult = new EventEmitter<{
    status: 'success' | 'failed';
    message: string;
  }>();
  @Output() hintUsed = new EventEmitter<void>();

  difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  gridSize: number = 4;
  grid: ShikakuCell[][] = [];
  isPlaying: boolean = false;
  gameStatus: 'idle' | 'success' | 'failed' = 'idle';
  isDragging: boolean = false;
  startCell: { r: number; c: number } | null = null;
  currentCell: { r: number; c: number } | null = null;
  areaCounter: number = 0;
  destroyedCount: number = 0;
  keyboardPos = { r: 0, c: 0 };
  isKeyboardSelecting: boolean = false;
  isKeyboardActive: boolean = false;
  colors = [
    '#f87171',
    '#60a5fa',
    '#34d399',
    '#fbbf24',
    '#a78bfa',
    '#f472b6',
    '#2dd4bf',
    '#818cf8',
  ];

  constructor(private audioService: AudioService) {}

  ngOnInit() {
    this.initGame(this.difficultyLevel);
    this.keyboardPos = { r: 0, c: 0 };
    this.isKeyboardActive = false;
    this.isKeyboardSelecting = false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['difficultyLevel'] && !changes['difficultyLevel'].firstChange) {
      this.initGame(this.difficultyLevel);
    }
  }

  initGame(difficulty: 'easy' | 'medium' | 'hard') {
    this.difficulty = difficulty;
    this.gameStatus = 'idle';
    this.isPlaying = false;
    this.areaCounter = 0;
    this.destroyedCount = 0;

    if (difficulty === 'easy') this.gridSize = 4;
    if (difficulty === 'medium') this.gridSize = 5;
    if (difficulty === 'hard') this.gridSize = 6;

    this.generateProceduralLevel();
  }

  toggleKeyboardMode() {
    this.isKeyboardActive = !this.isKeyboardActive;
    if (this.isKeyboardActive) {
      const gridEl = document.querySelector('.game-grid') as HTMLElement;
      gridEl?.focus();
    }
  }

  handleKeydown(event: KeyboardEvent) {
    if (this.gameStatus !== 'idle') return;

    const validKeys = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Enter',
      ' ',
      'Escape',
    ];
    if (validKeys.includes(event.key)) {
      this.isKeyboardActive = true;
    }

    switch (event.key) {
      case 'ArrowUp':
        this.keyboardPos.r = Math.max(0, this.keyboardPos.r - 1);
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.keyboardPos.r = Math.min(
          this.gridSize - 1,
          this.keyboardPos.r + 1,
        );
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.keyboardPos.c = Math.max(0, this.keyboardPos.c - 1);
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.keyboardPos.c = Math.min(
          this.gridSize - 1,
          this.keyboardPos.c + 1,
        );
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.isKeyboardSelecting) {
          this.isKeyboardSelecting = true;
          this.startSelection(this.keyboardPos.r, this.keyboardPos.c);
        } else {
          this.isKeyboardSelecting = false;
          this.endSelection();
        }
        break;
      case 'Escape':
        this.isKeyboardSelecting = false;
        this.cancelSelection();
        break;
    }

    if (this.isKeyboardSelecting) {
      this.updateSelection(this.keyboardPos.r, this.keyboardPos.c);
    }
  }

  onTouchStart(event: TouchEvent) {
    this.isKeyboardActive = false;
    if (this.gameStatus !== 'idle') return;
    const touch = event.touches[0];
    const element = document.elementFromPoint(
      touch.clientX,
      touch.clientY,
    ) as HTMLElement;
    if (element && element.classList.contains('grid-cell')) {
      const r = parseInt(element.getAttribute('data-r') || '-1', 10);
      const c = parseInt(element.getAttribute('data-c') || '-1', 10);
      if (r !== -1 && c !== -1) {
        this.startSelection(r, c);
      }
    }
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;
    event.preventDefault();
    const touch = event.touches[0];
    const element = document.elementFromPoint(
      touch.clientX,
      touch.clientY,
    ) as HTMLElement;
    if (element && element.classList.contains('grid-cell')) {
      const r = parseInt(element.getAttribute('data-r') || '-1', 10);
      const c = parseInt(element.getAttribute('data-c') || '-1', 10);
      if (r !== -1 && c !== -1) {
        this.updateSelection(r, c);
      }
    }
  }

  onTouchEnd() {
    this.endSelection();
  }

  generateProceduralLevel() {
    this.grid = [];
    for (let r = 0; r < this.gridSize; r++) {
      let row: ShikakuCell[] = [];
      for (let c = 0; c < this.gridSize; c++) {
        row.push({
          r,
          c,
          targetNumber: null,
          areaId: null,
          solutionId: null,
          isSelected: false,
          isError: false,
          isHint: false,
          color: null,
        });
      }
      this.grid.push(row);
    }

    let rects = [
      { r1: 0, c1: 0, r2: this.gridSize - 1, c2: this.gridSize - 1 },
    ];
    const cuts =
      this.difficulty === 'easy' ? 3 : this.difficulty === 'medium' ? 5 : 8;

    for (let i = 0; i < cuts; i++) {
      let splittable = rects.filter((r) => r.c2 - r.c1 > 0 || r.r2 - r.r1 > 0);
      if (splittable.length === 0) break;

      splittable.sort(
        (a, b) =>
          (b.r2 - b.r1 + 1) * (b.c2 - b.c1 + 1) -
          (a.r2 - a.r1 + 1) * (a.c2 - a.c1 + 1),
      );

      let indexToSplit = Math.floor(
        Math.random() * Math.min(2, splittable.length),
      );
      let toSplit = splittable[indexToSplit];

      rects = rects.filter((r) => r !== toSplit);

      let w = toSplit.c2 - toSplit.c1 + 1;
      let h = toSplit.r2 - toSplit.r1 + 1;
      let cutDirection =
        w > h ? 'V' : h > w ? 'H' : Math.random() > 0.5 ? 'V' : 'H';

      if (cutDirection === 'V' && w > 1) {
        let offset = Math.floor(Math.random() * (w - 1)) + 1;
        let splitPoint = toSplit.c1 + offset;
        rects.push({
          r1: toSplit.r1,
          c1: toSplit.c1,
          r2: toSplit.r2,
          c2: splitPoint - 1,
        });
        rects.push({
          r1: toSplit.r1,
          c1: splitPoint,
          r2: toSplit.r2,
          c2: toSplit.c2,
        });
      } else if (cutDirection === 'H' && h > 1) {
        let offset = Math.floor(Math.random() * (h - 1)) + 1;
        let splitPoint = toSplit.r1 + offset;
        rects.push({
          r1: toSplit.r1,
          c1: toSplit.c1,
          r2: splitPoint - 1,
          c2: toSplit.c2,
        });
        rects.push({
          r1: splitPoint,
          c1: toSplit.c1,
          r2: toSplit.r2,
          c2: toSplit.c2,
        });
      } else {
        rects.push(toSplit);
      }
    }

    rects.forEach((rect, index) => {
      let areaSize = (rect.r2 - rect.r1 + 1) * (rect.c2 - rect.c1 + 1);
      let randR = Math.floor(Math.random() * (rect.r2 - rect.r1 + 1)) + rect.r1;
      let randC = Math.floor(Math.random() * (rect.c2 - rect.c1 + 1)) + rect.c1;

      for (let r = rect.r1; r <= rect.r2; r++) {
        for (let c = rect.c1; c <= rect.c2; c++) {
          this.grid[r][c].solutionId = index + 1;
        }
      }
      this.grid[randR][randC].targetNumber = areaSize;
    });
  }

  startSelection(r: number, c: number) {
    this.isKeyboardActive = false;
    if (this.gameStatus !== 'idle') return;
    this.isDragging = true;
    this.startCell = { r, c };
    this.currentCell = { r, c };
    this.updateVisualSelection();
  }

  updateSelection(r: number, c: number) {
    if (!this.isDragging) return;
    this.currentCell = { r, c };
    this.updateVisualSelection();
  }

  endSelection() {
    if (!this.isDragging) return;
    this.isDragging = false;

    const bounds = this.getSelectionBounds();
    this.validateAndApplySelection(bounds);
    this.clearSelectionVisuals();
  }

  cancelSelection() {
    if (this.isDragging) {
      this.isDragging = false;
      this.clearSelectionVisuals();
    }
  }

  private getSelectionBounds() {
    if (!this.startCell || !this.currentCell) return null;
    return {
      minR: Math.min(this.startCell.r, this.currentCell.r),
      maxR: Math.max(this.startCell.r, this.currentCell.r),
      minC: Math.min(this.startCell.c, this.currentCell.c),
      maxC: Math.max(this.startCell.c, this.currentCell.c),
    };
  }

  private updateVisualSelection() {
    const bounds = this.getSelectionBounds();
    if (!bounds) return;

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const inBounds =
          r >= bounds.minR &&
          r <= bounds.maxR &&
          c >= bounds.minC &&
          c <= bounds.maxC;
        this.grid[r][c].isSelected = inBounds;
      }
    }
  }

  private clearSelectionVisuals() {
    this.grid.forEach((row) =>
      row.forEach((cell) => {
        cell.isSelected = false;
        cell.isError = false;
      }),
    );
  }

  private validateAndApplySelection(bounds: any) {
    if (!bounds) return;

    let selectedCells: ShikakuCell[] = [];
    let numbersFound: number[] = [];
    let overlappingAreaIds = new Set<number>();

    for (let r = bounds.minR; r <= bounds.maxR; r++) {
      for (let c = bounds.minC; c <= bounds.maxC; c++) {
        const cell = this.grid[r][c];
        selectedCells.push(cell);

        if (cell.targetNumber) numbersFound.push(cell.targetNumber);
        if (cell.areaId !== null) overlappingAreaIds.add(cell.areaId);
      }
    }

    if (overlappingAreaIds.size > 0) {
      this.destroyAreas(overlappingAreaIds);
      return;
    }

    if (numbersFound.length !== 1) {
      this.showError(selectedCells);
      return;
    }

    const target = numbersFound[0];
    if (selectedCells.length !== target) {
      this.showError(selectedCells);
      return;
    }

    this.audioService.playSound('water-fill');
    this.areaCounter++;
    const areaColor = this.colors[this.areaCounter % this.colors.length];

    selectedCells.forEach((cell) => {
      cell.areaId = this.areaCounter;
      cell.color = areaColor;
      cell.isHint = false;
    });

    this.checkWinCondition();
  }

  private destroyAreas(areaIds: Set<number>) {
    this.destroyedCount++;
    this.audioService.playSound('water-destroy');

    this.grid.forEach((row) =>
      row.forEach((cell) => {
        if (cell.areaId !== null && areaIds.has(cell.areaId)) {
          cell.areaId = null;
          cell.color = null;
        }
      }),
    );

    if (this.destroyedCount >= 3) {
      this.gameStatus = 'failed';
      this.isPlaying = true;
      setTimeout(() => {
        this.gameResult.emit({
          status: 'failed',
          message: 'Has destruido agrupaciones 3 veces. ¡Cuidado al trazar!',
        });
      }, 500);
    }
  }

  private showError(cells: ShikakuCell[]) {
    this.audioService.playSound('water-error');
    cells.forEach((c) => (c.isError = true));
    setTimeout(() => {
      cells.forEach((c) => (c.isError = false));
    }, 300);
  }

  private checkWinCondition() {
    const isComplete = this.grid.every((row) =>
      row.every((cell) => cell.areaId !== null),
    );
    if (isComplete) {
      this.gameStatus = 'success';
      this.isPlaying = true;
      this.audioService.playSound('level-win');
      setTimeout(() => {
        this.gameResult.emit({
          status: 'success',
          message: '¡Descomposición completada perfectamente!',
        });
      }, 500);
    }
  }

  mostrarPista() {
    if (this.gameStatus !== 'idle') return;

    this.hintUsed.emit();

    let targetSolutionId: number | null = null;

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (
          this.grid[r][c].areaId === null &&
          this.grid[r][c].solutionId !== null
        ) {
          targetSolutionId = this.grid[r][c].solutionId;
          break;
        }
      }
      if (targetSolutionId !== null) break;
    }

    if (targetSolutionId !== null) {
      this.audioService.playSound('water-fill');
      this.grid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.solutionId === targetSolutionId) cell.isHint = true;
        }),
      );

      setTimeout(() => {
        this.grid.forEach((row) =>
          row.forEach((cell) => (cell.isHint = false)),
        );
      }, 3000);
    }
  }

  getCompletionPercentage(): number {
    const total = this.gridSize * this.gridSize;
    let filled = 0;
    this.grid.forEach((row) =>
      row.forEach((cell) => {
        if (cell.areaId !== null) filled++;
      }),
    );
    return Math.round((filled / total) * 100);
  }
}