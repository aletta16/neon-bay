// All sound is synthesised with WebAudio oscillators and noise buffers.
// One job: engine hum, siren, gunshots, pickups, jingles and a music loop.
// No audio files are loaded.
export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.engineOsc = null; this.engineGain = null;
    this.sirenOsc = null; this.sirenGain = null; this.musicTimer = null; this.musicStep = 0;
    this.enabled = true;
  }
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      // Engine: two detuned sawtooths through a lowpass.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 50;
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'square'; osc2.frequency.value = 25;
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
      this.engineOsc.connect(filt); osc2.connect(filt); filt.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start(); osc2.start();
      this.engineOsc2 = osc2;
      // Siren: sine that alternates 700/950 Hz.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine'; this.sirenOsc.frequency.value = 750;
      this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.startMusic();
    } catch (e) { /* audio unavailable — game stays silent */ }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setEngine(speed01, driving) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.06 : 0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(50 + speed01 * 140, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(25 + speed01 * 70, t, 0.1);
  }
  setSiren(on) {
    if (!this.ctx) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.2);
  }
  update(dt) {
    if (!this.ctx || !this.sirenGain) return;
    if (this.sirenGain.gain.value > 0.01) {
      this.sirenOsc.frequency.value = (Math.floor(this.ctx.currentTime * 2) % 2 === 0) ? 720 : 980;
    }
  }
  blip(freq, dur, type = 'sine', vol = 0.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  }
  noise(dur, vol = 0.3, lowpass = 1200) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  }
  gunshot() { this.noise(0.18, 0.5, 900); this.blip(120, 0.12, 'square', 0.25); }
  pickup() { this.blip(880, 0.1); setTimeout(() => this.blip(1320, 0.15), 90); }
  crash() { this.noise(0.35, 0.4, 500); }
  jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'triangle', 0.22), i * 120)); }
  fail() { [330, 262, 196].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.2), i * 150)); }
  startMusic() {
    // Laid-back synthwave bassline: Am – F – C – G roots, 8th notes at 100 BPM.
    const roots = [55, 43.65, 65.41, 49];
    const stepDur = 0.3;
    const tick = () => {
      if (!this.ctx) return;
      const bar = Math.floor(this.musicStep / 8) % 4;
      const root = roots[bar];
      const note = this.musicStep % 2 === 0 ? root : root * 1.5;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = note;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + stepDur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + stepDur);
      this.musicStep++;
    };
    this.musicTimer = setInterval(tick, stepDur * 1000);
  }
}
