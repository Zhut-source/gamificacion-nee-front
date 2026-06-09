import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

// Tipos de comandos disponibles
export type Command = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Interfaz para cada celda de la cuadrícula
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
  styleUrl: './secuenciacion.component.scss'
})
export class SecuenciacionComponent implements OnInit, OnChanges {

  @Input() difficultyLevel: 'easy' | 'medium' | 'hard' = 'easy';
  @Output() gameResult = new EventEmitter<{status: 'success' | 'failed', message: string}>();

  difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  gridSize: number = 4; 
  grid: Cell[][] = [];
  playerPosition = { x: 0, y: 0 };
  playerSequence: Command[] = [];
  isPlaying: boolean = false;
  gameStatus: 'idle' | 'running' | 'success' | 'failed' = 'idle';

  

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

    // Ajustar tamaños según dificultad
    if (difficulty === 'easy') this.gridSize = 4;
    if (difficulty === 'medium') this.gridSize = 6;
    if (difficulty === 'hard') this.gridSize = 8;

    this.generateGuaranteedBoard();
  }

  generateGuaranteedBoard() {
    // 1. Crear matriz vacía
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
    
    // 2. Trazar un camino "Intocable" (Asegura que siempre se puede ganar)
    const guaranteedPath = new Set<string>();
    let cx = 0, cy = 0;
    guaranteedPath.add(`0,0`);

    // Hacemos que el camino avance hacia abajo o derecha aleatoriamente hasta llegar a la meta
    while (cx !== goalPos.x || cy !== goalPos.y) {
      if (cx === goalPos.x) { cy++; } // Solo puede bajar
      else if (cy === goalPos.y) { cx++; } // Solo puede ir derecha
      else {
        // 50% de probabilidad de ir derecha, 50% de ir abajo
        if (Math.random() > 0.5) cx++; else cy++;
      }
      guaranteedPath.add(`${cx},${cy}`);
    }

    let numWalls = 0;
    if (this.difficulty === 'easy') numWalls = 2; 
    else if (this.difficulty === 'medium') numWalls = this.gridSize;
    else if (this.difficulty === 'hard') numWalls = this.gridSize * 2; 

    let wallsPlaced = 0;
    let attempts = 0; // Prevenir bucle infinito

    while (wallsPlaced < numWalls && attempts < 100) {
      const rx = Math.floor(Math.random() * this.gridSize);
      const ry = Math.floor(Math.random() * this.gridSize);
      const posKey = `${rx},${ry}`;

      // Si no es el camino intocable y está vacío, ponemos el muro
      if (!guaranteedPath.has(posKey) && this.grid[ry][rx].type === 'empty') {
        this.grid[ry][rx].type = 'wall';
        wallsPlaced++;
      }
      attempts++;
    }

    // 4. Setear colores de Inicio y Meta
    this.grid[0][0].type = 'start';
    this.grid[goalPos.y][goalPos.x].type = 'goal';
  }

  // --- EL CEREBRO DE LAS PISTAS (Algoritmo BFS para encontrar la ruta más corta) ---
  mostrarPista() {
    // Si ya le dimos la pista, no recalculamos
    if (this.grid.some(row => row.some(cell => cell.isHint))) return;

    // 1. Configurar BFS
    // Cada elemento en la cola guardará su posición actual y el "camino" (array) que recorrió para llegar ahí.
    const queue: { x: number, y: number, path: {x: number, y: number}[] }[] = [];
    const visited = new Set<string>();
    
    // Iniciar desde donde está parado el jugador AHORA MISMO
    queue.push({ x: this.playerPosition.x, y: this.playerPosition.y, path: [] });
    visited.add(`${this.playerPosition.x},${this.playerPosition.y}`);

    const goalX = this.gridSize - 1;
    const goalY = this.gridSize - 1;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Derecha, Izquierda, Abajo, Arriba

    // 2. Ejecutar búsqueda
    while (queue.length > 0) {
      const curr = queue.shift()!;

      // Si encontramos la meta, ¡bingo! 'curr.path' contiene la ruta perfecta.
      if (curr.x === goalX && curr.y === goalY) {
        this.dibujarPistaEnTablero(curr.path);
        return;
      }

      for (let [dx, dy] of dirs) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const posKey = `${nx},${ny}`;

        if (
          nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize &&
          this.grid[ny][nx].type !== 'wall' && !visited.has(posKey)
        ) {
          visited.add(posKey);
          // Clonamos el camino recorrido y le añadimos este nuevo paso
          const newPath = [...curr.path, {x: nx, y: ny}];
          queue.push({ x: nx, y: ny, path: newPath });
        }
      }
    }
  }

  dibujarPistaEnTablero(path: {x: number, y: number}[]) {
    // Coloreamos TODO el camino sugerido
    for (let i = 0; i < path.length; i++) {
      const step = path[i];
      this.grid[step.y][step.x].isHint = true;
    }
    
    // Las apagamos automáticamente después de 3 segundos
    setTimeout(() => {
      this.grid.forEach(row => row.forEach(cell => cell.isHint = false));
    }, 3000);
  }

  // --- LÓGICA DE INTERACCIÓN Y EJECUCIÓN (Se mantiene igual) ---
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
    
    let currentX = 0; let currentY = 0; 
    for (let i = 0; i < this.playerSequence.length; i++) {
      const cmd = this.playerSequence[i];
      
      if (cmd === 'RIGHT') currentX++;
      if (cmd === 'LEFT') currentX--;
      if (cmd === 'DOWN') currentY++;
      if (cmd === 'UP') currentY--;

      this.playerPosition = { x: currentX, y: currentY };

      if (this.isOutOfBounds(currentX, currentY)) {
        this.gameStatus = 'failed';
        this.isPlaying = false;
        this.gameResult.emit({ status: 'failed', message: '¡Cuidado! Te saliste del tablero.' });
        return;
      }

      if (this.isWall(currentX, currentY)) {
        this.gameStatus = 'failed';
        this.isPlaying = false;
        this.gameResult.emit({ status: 'failed', message: '¡Ups! Chocaste. Revisa tu secuencia.' });
        return;
      }
      await this.delay(500);
    }

    if (this.grid[currentY][currentX].type === 'goal') {
       this.gameStatus = 'success';
       this.gameResult.emit({ status: 'success', message: '¡Ruta perfecta!' });
    } else {
       this.gameStatus = 'failed';
       this.gameResult.emit({ status: 'failed', message: 'Asegúrate de llegar a la bandera.' });
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  
}
