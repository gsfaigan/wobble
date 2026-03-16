const TIMER_CIRCUMFERENCE = 163.36; // 2π × r26

export interface LeaderboardEntry {
  name: string;
  score: number;
  rank: number;
}

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
  private timerCard: HTMLElement;
  private timerRing: SVGCircleElement;
  private timerVal: HTMLElement;
  private scoreSubmitSection: HTMLElement;
  private playerNameInput: HTMLInputElement;
  private submitScoreBtn: HTMLButtonElement;
  private submitStatus: HTMLElement;
  private leaderboardSection: HTMLElement;
  private leaderboardList: HTMLElement;

  private currentScore: number = 0;
  private _lastTimerSecs = -1;
  private _lastTimerColor = '';

  constructor() {
    const flashEl = document.createElement('div');
    flashEl.id = 'flash-overlay';
    flashEl.style.cssText = 'position:fixed;inset:0;background:#fff;pointer-events:none;opacity:0;z-index:50;';
    document.body.appendChild(flashEl);

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
    this.timerCard           = document.getElementById('timer-card')!;
    this.timerRing           = document.getElementById('timer-ring') as unknown as SVGCircleElement;
    this.timerVal            = document.getElementById('timer-val')!;
    this.scoreSubmitSection  = document.getElementById('score-submit-section')!;
    this.playerNameInput     = document.getElementById('player-name') as HTMLInputElement;
    this.submitScoreBtn      = document.getElementById('submit-score-btn') as HTMLButtonElement;
    this.submitStatus        = document.getElementById('submit-status')!;
    this.leaderboardSection  = document.getElementById('leaderboard-section')!;
    this.leaderboardList     = document.getElementById('leaderboard-list')!;
  }

  private _openPause!: () => void;
  private _closePause!: () => void;

  onPause(onOpen: () => void, onClose: () => void,
          onMusicVol: (v: number) => void, onSfxVol: (v: number) => void): void {
    this._openPause  = () => { this.pauseOverlay.classList.add('visible'); onOpen(); };
    this._closePause = () => { this.pauseOverlay.classList.remove('visible'); onClose(); };

    this.resumeBtn.addEventListener('click', this._closePause);
    this.musicSlider.addEventListener('input', () => onMusicVol(Number(this.musicSlider.value) / 100));
    this.sfxSlider.addEventListener('input', () => onSfxVol(Number(this.sfxSlider.value) / 100));

    document.getElementById('pause-btn')?.addEventListener('click', () => this.togglePause());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        this.togglePause();
      }
    });
  }

  togglePause(): void {
    if (this.pauseOverlay.classList.contains('visible')) this._closePause(); else this._openPause();
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

  showTimer(): void { this.timerCard.style.display = ''; }
  hideTimer(): void {
    this.timerCard.style.display = 'none';
    this._lastTimerSecs = -1;
    this._lastTimerColor = '';
  }

  /** Call every frame while game is active. timeLeftMs: remaining ms out of 20000. */
  updateTimer(timeLeftMs: number): void {
    const secs = Math.ceil(timeLeftMs / 1000);
    const subFraction = (timeLeftMs % 1000) / 1000;
    const offset = TIMER_CIRCUMFERENCE * (1 - subFraction);
    this.timerRing.setAttribute('stroke-dashoffset', String(offset));
    if (secs !== this._lastTimerSecs) {
      this.timerVal.textContent = String(secs);
      this._lastTimerSecs = secs;
    }
    const color = secs <= 3 ? '#ff4444' : secs <= 7 ? '#ffaa00' : '#ffffff';
    if (color !== this._lastTimerColor) {
      this.timerRing.setAttribute('stroke', color);
      this.timerVal.style.color = color;
      this._lastTimerColor = color;
    }
  }

  showGameOver(reason: string): void {
    this.reasonEl.textContent = reason === 'tilt'
      ? 'The platform tipped over'
      : reason === 'timeout'
      ? 'Too slow!'
      : 'A block hit the ground';
    this.gameOverScoreEl.textContent = String(this.currentScore);
    this.overlayEl.classList.add('visible');
    this.restartBtn.style.display = 'inline-block';
    this.scoreSubmitSection.style.display = '';
    this.leaderboardSection.style.display = 'none';
    this.submitStatus.textContent = '';
    this.playerNameInput.value = '';
    this.submitScoreBtn.disabled = false;
    setTimeout(() => this.playerNameInput.focus(), 50);
  }

  hideGameOver(): void {
    this.overlayEl.classList.remove('visible');
    this.overlayEl.style.display = '';
    this.restartBtn.style.display = 'none';
    this.scoreSubmitSection.style.display = 'none';
    this.leaderboardSection.style.display = 'none';
  }

  onSubmitScore(cb: (name: string) => void): void {
    const submit = () => {
      const name = this.playerNameInput.value.trim();
      if (!name) { this.playerNameInput.focus(); return; }
      this.submitScoreBtn.disabled = true;
      cb(name);
    };
    this.submitScoreBtn.addEventListener('click', submit);
    this.playerNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  }

  showSubmitStatus(msg: string): void {
    this.submitStatus.textContent = msg;
  }

  showLeaderboard(entries: LeaderboardEntry[], playerScore: number): void {
    this.scoreSubmitSection.style.display = 'none';
    this.leaderboardList.innerHTML = '';
    for (const e of entries) {
      const li = document.createElement('li');
      const isYou = e.score === playerScore;
      if (isYou) li.classList.add('you');
      li.innerHTML = `<span class="lb-rank">#${e.rank}</span><span class="lb-name">${escapeHtml(e.name)}${isYou ? ' ▶' : ''}</span><span class="lb-score">${e.score}</span>`;
      this.leaderboardList.appendChild(li);
    }
    this.leaderboardSection.style.display = '';
  }

  triggerFlash(): void {
    const el = document.getElementById('flash-overlay')!;
    el.style.transition = 'none';
    el.style.opacity = '0.85';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.45s ease-out';
      el.style.opacity = '0';
    });
  }

  onRestart(cb: () => void): void {
    this.restartBtn.addEventListener('click', cb);
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
