/* ユグドラ幻想戦記 — SE / 状況別BGM（Web Audio） */

const BGM_TRACKS = {
  title: {
    bpm: 68,
    melody: [74, 0, 77, 0, 81, 0, 77, 0, 74, 0, 72, 0, 69, 0, 72, 0],
    bass:   [50, 0,  0, 0, 53, 0,  0, 0, 50, 0,  0, 0, 48, 0,  0, 0],
    hat:    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    wave: 'triangle',
    bassWave: 'sine',
    gain: 0.045
  },
  story: {
    bpm: 60,
    melody: [69, 0, 0, 0, 72, 0, 0, 0, 74, 0, 0, 0, 72, 0, 0, 0],
    bass:   [45, 0, 0, 0,  0, 0, 0, 0, 48, 0, 0, 0,  0, 0, 0, 0],
    hat:    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    wave: 'sine',
    bassWave: 'sine',
    gain: 0.035
  },
  battle: {
    bpm: 108,
    melody: [64, 0, 67, 0, 64, 67, 71, 0, 69, 0, 67, 0, 64, 0, 62, 0],
    bass:   [40, 40, 0, 40, 43, 43, 0, 43, 40, 40, 0, 40, 38, 38, 0, 38],
    hat:    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
    kick:   [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0],
    wave: 'triangle',
    bassWave: 'square',
    gain: 0.04
  },
  battleMid: {
    bpm: 120,
    melody: [67, 0, 70, 67, 0, 72, 70, 0, 67, 63, 0, 67, 70, 0, 65, 0],
    bass:   [43, 43, 43, 0, 39, 39, 0, 39, 43, 43, 0, 43, 41, 41, 0, 38],
    hat:    [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
    kick:   [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
    wave: 'sawtooth',
    bassWave: 'square',
    gain: 0.038
  },
  boss: {
    bpm: 132,
    melody: [55, 0, 58, 0, 55, 0, 51, 0, 55, 58, 62, 0, 58, 0, 51, 0],
    bass:   [31, 0, 31, 31, 34, 0, 34, 0, 31, 0, 31, 31, 27, 0, 27, 27],
    hat:    [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0],
    kick:   [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1],
    wave: 'sawtooth',
    bassWave: 'square',
    gain: 0.042
  },
  danger: {
    bpm: 148,
    melody: [60, 61, 60, 61, 60, 0, 56, 0, 60, 61, 63, 61, 60, 0, 56, 0],
    bass:   [36, 36, 0, 36, 36, 36, 0, 32, 36, 36, 0, 36, 32, 32, 0, 32],
    hat:    [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
    kick:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    wave: 'square',
    bassWave: 'square',
    gain: 0.04
  },
  shop: {
    bpm: 92,
    melody: [67, 0, 64, 0, 62, 0, 64, 0, 67, 69, 67, 0, 64, 0, 62, 0],
    bass:   [48, 0,  0, 0, 45, 0,  0, 0, 43, 0,  0, 0, 45, 0,  0, 0],
    hat:    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    wave: 'triangle',
    bassWave: 'sine',
    gain: 0.038
  },
  win: {
    bpm: 100,
    melody: [72, 76, 79, 84, 79, 76, 72, 0, 74, 76, 79, 0, 72, 0, 67, 0],
    bass:   [48,  0, 52,  0, 55,  0, 48, 0, 50,  0, 52, 0, 48, 0, 43, 0],
    hat:    [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0],
    wave: 'triangle',
    bassWave: 'sine',
    gain: 0.045
  },
  lose: {
    bpm: 56,
    melody: [60, 0, 0, 0, 58, 0, 0, 0, 55, 0, 0, 0, 52, 0, 0, 0],
    bass:   [36, 0, 0, 0, 34, 0, 0, 0, 31, 0, 0, 0, 28, 0, 0, 0],
    hat:    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    wave: 'sine',
    bassWave: 'sine',
    gain: 0.04
  }
};

const synth = {
  ctx: null,
  muted: false,
  trackId: null,
  step: 0,
  nextTime: 0,
  timer: null,
  noise: null,
  bgmGain: null,
  seGain: null,
  resultLose: false,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.bgmGain = this.ctx.createGain();
    this.seGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.9;
    this.seGain.gain.value = 1;
    this.bgmGain.connect(this.ctx.destination);
    this.seGain.connect(this.ctx.destination);
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.unlock();
  },

  unlock() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMuted(muted) {
    this.muted = muted;
    if (muted) this.stopBgm(false);
    else this.playBgm(this.trackId || pickBgmId(), true);
  },

  midi(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  },

  tone(freq, when, dur, type, gain, dest) {
    if (!this.ctx || !freq) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g);
    g.connect(dest || this.seGain);
    osc.start(when);
    osc.stop(when + dur);
  },

  noiseHit(when, dur, gain) {
    if (!this.ctx || !this.noise) return;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    src.buffer = this.noise;
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bgmGain);
    src.start(when);
    src.stop(when + dur);
  },

  beep(freq, dur, type, gain) {
    if (this.muted || !this.ctx) return;
    this.tone(freq, this.ctx.currentTime, dur, type, gain || 0.05, this.seGain);
  },

  play(kind) {
    if (this.muted) return;
    this.unlock();
    if (kind === 'attack') this.beep(220, 0.12, 'sawtooth', 0.06);
    else if (kind === 'hit') this.beep(140, 0.16, 'triangle', 0.05);
    else if (kind === 'move') this.beep(420, 0.06, 'square', 0.03);
    else if (kind === 'gold') this.beep(660, 0.1, 'square', 0.04);
    else if (kind === 'buy') { this.beep(520, 0.08, 'square', 0.04); this.beep(780, 0.12, 'square', 0.04); }
    else if (kind === 'break') this.beep(90, 0.25, 'sawtooth', 0.07);
    else if (kind === 'levelup') { this.beep(440, 0.1, 'square', 0.05); this.beep(660, 0.14, 'square', 0.05); }
    else if (kind === 'win') this.beep(523, 0.2, 'triangle', 0.05);
    else if (kind === 'tap') this.beep(880, 0.04, 'square', 0.02);
  },

  playStep(track, step, when) {
    const g = track.gain;
    const note = track.melody[step] || 0;
    const bass = track.bass[step] || 0;
    if (note) this.tone(this.midi(note), when, 0.18, track.wave, g, this.bgmGain);
    if (bass) this.tone(this.midi(bass), when, 0.22, track.bassWave, g * 0.7, this.bgmGain);
    if (track.hat && track.hat[step]) this.noiseHit(when, 0.05, g * 0.22);
    if (track.kick && track.kick[step]) this.tone(70, when, 0.12, 'sine', g * 0.9, this.bgmGain);
  },

  tick() {
    if (this.muted || !this.ctx || !this.trackId) return;
    const track = BGM_TRACKS[this.trackId];
    if (!track) return;
    const stepDur = 60 / track.bpm / 4;
    const horizon = this.ctx.currentTime + 0.12;
    while (this.nextTime < horizon) {
      this.playStep(track, this.step, this.nextTime);
      this.step = (this.step + 1) % track.melody.length;
      this.nextTime += stepDur;
    }
    this.timer = setTimeout(() => this.tick(), 25);
  },

  playBgm(id, force) {
    if (!id || !BGM_TRACKS[id]) return;
    if (!force && this.trackId === id && this.timer) return;
    this.stopScheduler();
    this.trackId = id;
    if (this.muted) return;
    this.init();
    this.unlock();
    if (!this.ctx) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.tick();
  },

  stopScheduler() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  },

  stopBgm(clearId) {
    this.stopScheduler();
    if (clearId) this.trackId = null;
  },

  suspend() {
    this.stopScheduler();
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  },

  resumeBgm() {
    this.unlock();
    if (!this.muted && this.trackId) this.playBgm(this.trackId, true);
  }
};

function pickBgmId() {
  const screen = game.currentScreen;
  if (screen === 'title') return 'title';
  if (screen === 'story') return 'story';
  if (screen === 'shop' || screen === 'album') return 'shop';
  if (screen === 'result') return synth.resultLose ? 'lose' : 'win';
  if (screen === 'battle') {
    const p = game.units.player;
    const ratio = p.maxHp > 0 ? p.hp / p.maxHp : 1;
    const inDanger = ratio <= 0.3 || (synth.trackId === 'danger' && ratio <= 0.38);
    if (inDanger) return 'danger';
    const bossAlive = game.units.enemies.some((e) => e.hp > 0 && (e.type === 'behemoth' || e.type === 'yggbehemoth' || e.size > 1));
    if (game.currentStage >= 8 || bossAlive) return 'boss';
    if (game.currentStage >= 5) return 'battleMid';
    return 'battle';
  }
  return 'title';
}

function syncBgm() {
  synth.playBgm(pickBgmId());
}
