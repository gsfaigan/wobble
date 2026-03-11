export class UIManager {
  private scoreEl: HTMLElement;
  private overlayEl: HTMLElement;
  private reasonEl: HTMLElement;
  private gameOverScoreEl: HTMLElement;
  private restartBtn: HTMLButtonElement;
  private startOverlay: HTMLElement;
  private startBtn: HTMLButtonElement;
  private pauseOverlay: HTMLElement;
  private resumeBtn: HTMLButtonElement;
  private musicSlider: HTMLInputElement;
  private sfxSlider: HTMLInputElement;

  private currentScore: number = 0;

  constructor() {
    this.scoreEl         = document.getElementById('score-val')!;
    this.overlayEl       = document.getElementById('game-over-overlay')!;
    this.reasonEl        = document.getElementById('game-over-reason')!;
    this.gameOverScoreEl = document.getElementById('game-over-score-value')!;
    this.restartBtn      = document.getElementById('restart-btn') as HTMLButtonElement;
    this.startOverlay    = document.getElementById('start-overlay')!;
    this.startBtn        = document.getElementById('start-btn') as HTMLButtonElement;
    this.pauseOverlay    = document.getElementById('pause-overlay')!;
    this.resumeBtn       = document.getElementById('resume-btn') as HTMLButtonElement;
    this.musicSlider     = document.getElementById('music-vol') as HTMLInputElement;
    this.sfxSlider       = document.getElementById('sfx-vol') as HTMLInputElement;
  }

  onPause(onOpen: () => void, onClose: () => void,
          onMusicVol: (v: number) => void, onSfxVol: (v: number) => void): void {
    const open = () => { this.pauseOverlay.classList.add('visible'); onOpen(); };
    const close = () => { this.pauseOverlay.classList.remove('visible'); onClose(); };

    this.resumeBtn.addEventListener('click', close);
    this.musicSlider.addEventListener('input', () => onMusicVol(Number(this.musicSlider.value) / 100));
    this.sfxSlider.addEventListener('input', () => onSfxVol(Number(this.sfxSlider.value) / 100));

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.pauseOverlay.classList.contains('visible')) close(); else open();
      }
    });
  }

  isPaused(): boolean {
    return this.pauseOverlay.classList.contains('visible');
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
