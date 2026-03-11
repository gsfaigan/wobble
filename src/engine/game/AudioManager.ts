export class AudioManager {
  private audio: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  sfxVolume: number = 1;

  constructor(src: string) {
    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.volume = 0.5;
  }

  play(): void {
    if (!this.ctx) this.ctx = new AudioContext();
    this.audio.play().catch(() => {
      const resume = () => {
        this.audio.play();
        window.removeEventListener('click', resume);
        window.removeEventListener('keydown', resume);
      };
      window.addEventListener('click', resume);
      window.addEventListener('keydown', resume);
    });
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  setVolume(v: number): void {
    this.audio.volume = Math.max(0, Math.min(1, v));
  }

  // Short whoosh + click when a block is released
  playDrop(): void {
    const ctx = this._getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Dull thud when a block lands on something
  playHit(velocity: number): void {
    const ctx = this._getCtx();
    const now = ctx.currentTime;
    const volume = Math.min(0.4, velocity * 0.015) * this.sfxVolume;
    if (volume < 0.02) return; // ignore tiny bumps

    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }

  private _getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
}
