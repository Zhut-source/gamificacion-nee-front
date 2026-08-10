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
import { AudioService } from '@core/services/audio.service';

export interface Card {
  id: number;
  symbol: string;
  name: string;
  isConditional: boolean;
  isFlipped: boolean;
  isMatched: boolean;
  isHint: boolean;
}

export interface BucketItem {
  symbol: string;
  isConditional: boolean;
  guessedConditional: boolean;
}

@Component({
  selector: 'app-condicionales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './condicionales.component.html',
  styleUrl: './condicionales.component.scss',
})
export class CondicionalesComponent implements OnInit, OnChanges {
  @Input() difficultyLevel: 'easy' | 'medium' | 'hard' = 'easy';
  @Output() gameResult = new EventEmitter<{
    status: 'success' | 'failed';
    message: string;
  }>();
  @Output() hintUsed = new EventEmitter<void>();

  difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  cards: Card[] = [];
  gridColumns: number = 3;
  firstCard: Card | null = null;
  secondCard: Card | null = null;
  isProcessing: boolean = false;
  isPlaying: boolean = true;
  gameStatus: 'idle' | 'running' | 'success' | 'failed' = 'idle';
  movesCount: number = 0;
  activePairToClassify: Card | null = null;
  bucketList: BucketItem[] = [];
  isPreviewMode: boolean = true;

  conditionalOperators = [
    { symbol: '==', name: 'Igual A' },
    { symbol: '!=', name: 'Diferente De' },
    { symbol: '>', name: 'Mayor Que' },
    { symbol: '<', name: 'Menor Que' },
    { symbol: '>=', name: 'Mayor o Igual' },
    { symbol: '<=', name: 'Menor o Igual' },
    { symbol: '&&', name: 'Y (AND)' },
    { symbol: '||', name: 'O (OR)' },
  ];

  mathOperators = [
    { symbol: '+', name: 'Suma' },
    { symbol: '-', name: 'Resta' },
    { symbol: '*', name: 'Multiplicación' },
    { symbol: '/', name: 'División' },
    { symbol: '=', name: 'Asignación' },
    { symbol: '++', name: 'Incremento' },
    { symbol: '--', name: 'Decrementto' },
  ];

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
    this.movesCount = 0;
    this.bucketList = [];
    this.activePairToClassify = null;
    this.firstCard = null;
    this.secondCard = null;
    this.isProcessing = false;
    this.gameStatus = 'idle';
    this.isPlaying = false;
    this.isPreviewMode = true;
    let totalPairs = 2;
    this.gridColumns = 2;

    if (difficulty === 'medium') {
      totalPairs = 3;
      this.gridColumns = 3;
    }
    if (difficulty === 'hard') {
      totalPairs = 4;
      this.gridColumns = 4;
    }

    this.generateCards(totalPairs);
  }

  generateCards(totalPairs: number) {
    let selectedOperators: any[] = [];

    const condCount = Math.ceil(totalPairs / 2);
    const mathCount = totalPairs - condCount;

    const shuffledCond = [...this.conditionalOperators].sort(
      () => 0.5 - Math.random(),
    );
    const shuffledMath = [...this.mathOperators].sort(
      () => 0.5 - Math.random(),
    );

    for (let i = 0; i < condCount; i++)
      selectedOperators.push({ ...shuffledCond[i], isConditional: true });
    for (let i = 0; i < mathCount; i++)
      selectedOperators.push({ ...shuffledMath[i], isConditional: false });

    this.cards = [];
    let idCounter = 1;

    selectedOperators.forEach((op) => {
      this.cards.push({
        id: idCounter++,
        symbol: op.symbol,
        name: op.name,
        isConditional: op.isConditional,
        isFlipped: false,
        isMatched: false,
        isHint: false,
      });
      this.cards.push({
        id: idCounter++,
        symbol: op.symbol,
        name: op.name,
        isConditional: op.isConditional,
        isFlipped: false,
        isMatched: false,
        isHint: false,
      });
    });

    this.cards.sort(() => 0.5 - Math.random());
  }

  flipCard(card: Card) {
    if (
      this.isProcessing ||
      card.isFlipped ||
      card.isMatched ||
      this.activePairToClassify ||
      !this.isPlaying
    )
      return;

    this.audioService.playSound('switch');
    card.isFlipped = true;
    card.isHint = false;

    if (!this.firstCard) {
      this.firstCard = card;
    } else {
      this.secondCard = card;
      this.movesCount++;
      this.checkMatch();
    }
  }

  async startPreview() {
    this.isPreviewMode = false;
    this.isProcessing = true;
    this.audioService.playSound('jump');
    this.cards.forEach((card) => (card.isFlipped = true));

    let previewTime = 3000;
    if (this.difficulty === 'medium') previewTime = 5000;
    if (this.difficulty === 'hard') previewTime = 7000;

    await this.delay(previewTime);

    this.cards.forEach((card) => (card.isFlipped = false));

    this.isProcessing = false;
    this.isPlaying = true;
    this.gameStatus = 'running';
  }

  async checkMatch() {
    this.isProcessing = true;

    if (this.firstCard!.symbol === this.secondCard!.symbol) {
      this.firstCard!.isMatched = true;
      this.secondCard!.isMatched = true;
      this.audioService.playSound('jump');

      await this.delay(600);
      this.activePairToClassify = this.firstCard;
    } else {
      this.audioService.playSound('fail');
      await this.delay(1000);
      this.firstCard!.isFlipped = false;
      this.secondCard!.isFlipped = false;
    }

    this.firstCard = null;
    this.secondCard = null;
    this.isProcessing = false;
  }

  classifyPair(isConditional: boolean) {
    if (!this.activePairToClassify) return;

    this.bucketList.push({
      symbol: this.activePairToClassify.symbol,
      isConditional: this.activePairToClassify.isConditional,
      guessedConditional: isConditional,
    });

    this.activePairToClassify = null;

    if (this.cards.every((c) => c.isMatched)) {
      this.validateFinalResult();
    }
  }

  validateFinalResult() {
    this.isPlaying = false;

    let errors = 0;
    this.bucketList.forEach((item) => {
      if (item.isConditional !== item.guessedConditional) {
        errors++;
      }
    });

    if (errors === 0) {
      this.gameStatus = 'success';
      this.audioService.playSound('congratulations');
      this.gameResult.emit({
        status: 'success',
        message: `¡Clasificación perfecta! Has dominado las condicionales.`,
      });
    } else {
      this.gameStatus = 'failed';
      this.audioService.playSound('robot-off');
      this.gameResult.emit({
        status: 'failed',
        message: `Encontraste los pares, pero clasificaste ${errors} operador(es) incorrectamente. ¡Inténtalo de nuevo!`,
      });
    }
  }

  mostrarPista() {
    if (!this.isPlaying || this.activePairToClassify) return;

    this.hintUsed.emit();

    const hiddenCards = this.cards.filter((c) => !c.isMatched && !c.isFlipped);
    if (hiddenCards.length < 2) return;

    if (this.firstCard) {
      const pairCard = hiddenCards.find(
        (c) => c.symbol === this.firstCard!.symbol,
      );
      if (pairCard) {
        pairCard.isHint = true;
        this.audioService.playSound('switch');
        setTimeout(() => (pairCard.isHint = false), 2000);
      }
    } else {
      const targetSymbol = hiddenCards[0].symbol;
      const pair = hiddenCards.filter((c) => c.symbol === targetSymbol);

      pair.forEach((c) => (c.isHint = true));
      this.audioService.playSound('switch');
      setTimeout(() => pair.forEach((c) => (c.isHint = false)), 2000);
    }
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
