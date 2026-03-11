export class UIManager {
  private scoreEl: HTMLElement;
  private overlayEl: HTMLElement;
  private reasonEl: HTMLElement;
  private gameOverScoreEl: HTMLElement;
  private restartBtn: HTMLButtonElement;
  private startOverlay: HTMLElement;
  private startBtn: HTMLButtonElement;

  private currentScore: number = 0;

  constructor() {
    this.scoreEl         = document.getElementById('score-val')!;
    this.overlayEl       = document.getElementById('game-over-overlay')!;
    this.reasonEl        = document.getElementById('game-over-reason')!;
    this.gameOverScoreEl = document.getElementById('game-over-score-value')!;
    this.restartBtn      = document.getElementById('restart-btn') as HTMLButtonElement;
    this.startOverlay    = document.getElementById('start-overlay')!;
    this.startBtn        = document.getElementById('start-btn') as HTMLButtonElement;
  }

  onStart(cb: () => void): void {
    this.startBtn.addEventListener('click', () => {
      this.startOverlay.classList.add('hidden');
      cb();
    });
  }

  updateScore(score: number): void {
    this.currentScore = score;
    this.scoreEl.textContent = String(score);
  }

  showGameOver(reason: string): void {
    this.reasonEl.textContent = reason === 'tilt'
      ? 'The platform tipped over'
      : 'A block hit the ground';
    this.gameOverScoreEl.textContent = String(this.currentScore);
    this.overlayEl.classList.add('visible');
    this.restartBtn.style.display = 'inline-block';
  }

  hideGameOver(): void {
    this.overlayEl.classList.remove('visible');
    this.overlayEl.style.display = '';
    this.restartBtn.style.display = 'none';
  }

  onRestart(cb: () => void): void {
    this.restartBtn.addEventListener('click', cb);
  }
}
