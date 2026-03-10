export class UIManager {
  private scoreEl: HTMLElement;
  private turnsEl: HTMLElement;
  private messageEl: HTMLElement;
  private messageTextEl: HTMLElement;
  private restartBtn: HTMLButtonElement;

  constructor() {
    this.scoreEl = document.getElementById('score-val')!;
    this.turnsEl = document.getElementById('turns-val')!;
    this.messageEl = document.getElementById('message')!;
    this.messageTextEl = document.getElementById('message-text')!;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
  }

  updateScore(score: number): void {
    this.scoreEl.textContent = String(score);
  }

  updateTurns(turns: number): void {
    this.turnsEl.textContent = String(turns);
  }

  showGameOver(reason: string): void {
    const msg = reason === 'tilt'
      ? 'Platform tipped over!'
      : 'A block hit the ground!';
    this.messageTextEl.textContent = `Game Over. ${msg}`;
    this.messageEl.style.display = 'block';
    this.restartBtn.style.display = 'inline-block';
  }

  hideGameOver(): void {
    this.messageEl.style.display = 'none';
    this.restartBtn.style.display = 'none';
  }

  onRestart(cb: () => void): void {
    this.restartBtn.addEventListener('click', cb);
  }
}
