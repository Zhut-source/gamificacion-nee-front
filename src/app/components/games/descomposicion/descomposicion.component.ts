import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges, OnInit, OnChanges } from '@angular/core';
import { AudioService } from '@core/services/audio.service';

export interface ShikakuCell {
  r: number; c: number;
  targetNumber: number | null;
  areaId: number | null;
  solutionId: number | null; // El cerebro de la pista
  isSelected: boolean;
  isError: boolean;
  isHint: boolean; // Para iluminar la pista
  color: string | null;
}

@Component({
  selector: 'app-descomposicion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './descomposicion.component.html',
  styleUrl: './descomposicion.component.scss'
})
export class DescomposicionComponent implements OnInit, OnChanges {

  @Input() difficultyLevel: 'easy' | 'medium' | 'hard' = 'easy';
  @Output() gameResult = new EventEmitter<{status: 'success' | 'failed', message: string}>();
  @Output() hintUsed = new EventEmitter<void>();

  difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  gridSize: number = 4; 
  grid: ShikakuCell[][] = [];
  
  isPlaying: boolean = false;
  gameStatus: 'idle' | 'success' | 'failed' = 'idle';

  isDragging: boolean = false;
  startCell: { r: number, c: number } | null = null;
  currentCell: { r: number, c: number } | null = null;
  
  areaCounter: number = 0;
  destroyedCount: number = 0; // REGLA: Máximo 3 destrucciones
  
  colors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#2dd4bf', '#818cf8'];

  constructor(private audioService: AudioService) {}

  ngOnInit() { this.initGame(this.difficultyLevel); }
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

  // --- GENERACIÓN INFALIBLE (BSP - Binary Space Partitioning) ---
  generateProceduralLevel() {
    this.grid = [];
    for (let r = 0; r < this.gridSize; r++) {
      let row: ShikakuCell[] = [];
      for (let c = 0; c < this.gridSize; c++) {
        row.push({ r, c, targetNumber: null, areaId: null, solutionId: null, isSelected: false, isError: false, isHint: false, color: null });
      }
      this.grid.push(row);
    }

    // 1. Iniciamos con un solo rectángulo gigante que cubre todo el tablero
    let rects = [{ r1: 0, c1: 0, r2: this.gridSize - 1, c2: this.gridSize - 1 }];
    
    // 2. Definimos cuántos cortes (agrupaciones) haremos según la dificultad
    const cuts = this.difficulty === 'easy' ? 3 : (this.difficulty === 'medium' ? 5 : 8);

    for (let i = 0; i < cuts; i++) {
      // Ordenamos para cortar siempre el rectángulo más grande
      rects.sort((a,b) => ((b.r2-b.r1+1)*(b.c2-b.c1+1)) - ((a.r2-a.r1+1)*(a.c2-a.c1+1)));
      let toSplit = rects.shift()!;

      let w = toSplit.c2 - toSplit.c1 + 1;
      let h = toSplit.r2 - toSplit.r1 + 1;

      // Cortamos vertical u horizontalmente
      if (w > h && w > 1) {
        let splitPoint = toSplit.c1 + Math.floor(w / 2);
        rects.push({ r1: toSplit.r1, c1: toSplit.c1, r2: toSplit.r2, c2: splitPoint - 1 });
        rects.push({ r1: toSplit.r1, c1: splitPoint, r2: toSplit.r2, c2: toSplit.c2 });
      } else if (h > 1) {
        let splitPoint = toSplit.r1 + Math.floor(h / 2);
        rects.push({ r1: toSplit.r1, c1: toSplit.c1, r2: splitPoint - 1, c2: toSplit.c2 });
        rects.push({ r1: splitPoint, c1: toSplit.c1, r2: toSplit.r2, c2: toSplit.c2 });
      } else {
        rects.push(toSplit); // No se puede cortar más
      }
    }

    // 3. Pintar la solución en la matriz
    rects.forEach((rect, index) => {
      let areaSize = (rect.r2 - rect.r1 + 1) * (rect.c2 - rect.c1 + 1);
      
      // Elegir una celda al azar dentro del rectángulo para poner el número
      let randR = Math.floor(Math.random() * (rect.r2 - rect.r1 + 1)) + rect.r1;
      let randC = Math.floor(Math.random() * (rect.c2 - rect.c1 + 1)) + rect.c1;

      for (let r = rect.r1; r <= rect.r2; r++) {
        for (let c = rect.c1; c <= rect.c2; c++) {
          this.grid[r][c].solutionId = index + 1; // Asignamos el ID de la solución
        }
      }
      this.grid[randR][randC].targetNumber = areaSize; // Ponemos el número
    });
  }

  // --- LÓGICA DE SELECCIÓN ---
  startSelection(r: number, c: number) {
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
        const inBounds = r >= bounds.minR && r <= bounds.maxR && c >= bounds.minC && c <= bounds.maxC;
        this.grid[r][c].isSelected = inBounds;
      }
    }
  }

  private clearSelectionVisuals() {
    this.grid.forEach(row => row.forEach(cell => { cell.isSelected = false; cell.isError = false; }));
  }

  // --- VALIDACIÓN Y REGLA DE DESTRUCCIÓN ---
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

    // REGLA: Si pisa un área existente, la destruye
    if (overlappingAreaIds.size > 0) {
      this.destroyAreas(overlappingAreaIds);
      return; 
    }

    if (numbersFound.length !== 1) { this.showError(selectedCells); return; }

    const target = numbersFound[0];
    if (selectedCells.length !== target) { this.showError(selectedCells); return; }

    // ÉXITO: Crear área
    this.audioService.playSound('jump');
    this.areaCounter++;
    const areaColor = this.colors[this.areaCounter % this.colors.length];

    selectedCells.forEach(cell => {
      cell.areaId = this.areaCounter;
      cell.color = areaColor;
      cell.isHint = false; // Apagamos pista si la había
    });

    this.checkWinCondition();
  }

  private destroyAreas(areaIds: Set<number>) {
    this.destroyedCount++; // Sumamos a la regla de falla
    this.audioService.playSound('robot-off'); 
    
    this.grid.forEach(row => row.forEach(cell => {
      if (cell.areaId !== null && areaIds.has(cell.areaId)) {
        cell.areaId = null;
        cell.color = null;
      }
    }));

    // Evaluar fracaso por destrucción
    if (this.destroyedCount >= 3) {
      this.gameStatus = 'failed';
      this.isPlaying = true;
      setTimeout(() => {
        this.gameResult.emit({ status: 'failed', message: 'Has destruido agrupaciones 3 veces. ¡Cuidado al trazar!' });
      }, 500);
    }
  }

  private showError(cells: ShikakuCell[]) {
    this.audioService.playSound('fail');
    cells.forEach(c => c.isError = true);
    setTimeout(() => { cells.forEach(c => c.isError = false); }, 300);
  }

  private checkWinCondition() {
    const isComplete = this.grid.every(row => row.every(cell => cell.areaId !== null));
    if (isComplete) {
      this.gameStatus = 'success';
      this.isPlaying = true;
      this.audioService.playSound('robot-cargando');
      setTimeout(() => {
        this.gameResult.emit({ status: 'success', message: '¡Descomposición completada perfectamente!' });
      }, 500);
    }
  }

  // --- PISTA INTELIGENTE ---
  mostrarPista() {
    if (this.gameStatus !== 'idle') return;

    this.hintUsed.emit();

    // Buscar una solución que no esté pintada
    let targetSolutionId: number | null = null;

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        // Si encontramos una celda que NO tiene areaId (está libre) pero SÍ tiene solutionId
        if (this.grid[r][c].areaId === null && this.grid[r][c].solutionId !== null) {
          targetSolutionId = this.grid[r][c].solutionId;
          break;
        }
      }
      if (targetSolutionId !== null) break;
    }

    if (targetSolutionId !== null) {
      this.audioService.playSound('switch');
      // Iluminar todas las celdas que pertenecen a esta solución
      this.grid.forEach(row => row.forEach(cell => {
        if (cell.solutionId === targetSolutionId) cell.isHint = true;
      }));

      // Apagar pista después de 3 segundos
      setTimeout(() => {
        this.grid.forEach(row => row.forEach(cell => cell.isHint = false));
      }, 3000);
    }
  }

  getCompletionPercentage(): number {
    const total = this.gridSize * this.gridSize;
    let filled = 0;
    this.grid.forEach(row => row.forEach(cell => { if (cell.areaId !== null) filled++; }));
    return Math.round((filled / total) * 100);
  }
}