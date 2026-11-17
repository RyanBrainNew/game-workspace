const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class RaceAudio {
  constructor() {
    this.initialized = false;
    this.muted = false;
    this.paused = false;
    this.volume = 0.55;
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.musicRunning = false;
  }

  async init() {
    if (this.initialized) {
      await this.unlock();
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.22;
    this.master.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.15);

    this.noiseBuffer = this._createNoiseBuffer(3);
    this._buildEngine();
    this._buildWind();
    this._buildDrift();
    this._buildBoost();
    this._buildMusic();

    this.initialized = true;
    await this.unlock();
  }

  async unlock() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Browsers may still block the resume until a later gesture.
      }
    }
  }

  _createNoiseBuffer(seconds = 2) {
    const length = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.82 + white * 0.18;
      data[i] = last;
    }
    return buffer;
  }

  _loopNoise() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    return source;
  }

  _buildEngine() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineFilter.Q.value = 3.6;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 48;
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 73;
    this.engineOsc2.detune.value = -7;
    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'sine';
    this.engineSub.frequency.value = 28;

    const oscGain1 = this.ctx.createGain();
    const oscGain2 = this.ctx.createGain();
    const subGain = this.ctx.createGain();
    oscGain1.gain.value = 0.33;
    oscGain2.gain.value = 0.14;
    subGain.gain.value = 0.3;

    this.engineOsc1.connect(oscGain1);
    this.engineOsc2.connect(oscGain2);
    this.engineSub.connect(subGain);
    oscGain1.connect(this.engineFilter);
    oscGain2.connect(this.engineFilter);
    subGain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSub.start();
  }

  _buildWind() {
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 950;
    this.windFilter.Q.value = 0.55;
    const wind = this._loopNoise();
    wind.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    wind.start();
  }

  _buildDrift() {
    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0;
    this.driftFilter = this.ctx.createBiquadFilter();
    this.driftFilter.type = 'highpass';
    this.driftFilter.frequency.value = 1750;
    this.driftFilter.Q.value = 1.4;
    this.driftTone = this.ctx.createOscillator();
    this.driftTone.type = 'sawtooth';
    this.driftTone.frequency.value = 440;
    this.driftToneGain = this.ctx.createGain();
    this.driftToneGain.gain.value = 0.04;
    const driftNoise = this._loopNoise();
    driftNoise.connect(this.driftFilter);
    this.driftFilter.connect(this.driftGain);
    this.driftTone.connect(this.driftToneGain);
    this.driftToneGain.connect(this.driftGain);
    this.driftGain.connect(this.master);
    driftNoise.start();
    this.driftTone.start();
  }

  _buildBoost() {
    this.boostGain = this.ctx.createGain();
    this.boostGain.gain.value = 0;
    this.boostFilter = this.ctx.createBiquadFilter();
    this.boostFilter.type = 'bandpass';
    this.boostFilter.frequency.value = 600;
    this.boostFilter.Q.value = 1.1;
    const boostNoise = this._loopNoise();
    boostNoise.connect(this.boostFilter);
    this.boostFilter.connect(this.boostGain);
    this.boostGain.connect(this.master);
    boostNoise.start();

    this.boostOsc = this.ctx.createOscillator();
    this.boostOsc.type = 'sawtooth';
    this.boostOsc.frequency.value = 90;
    this.boostOscGain = this.ctx.createGain();
    this.boostOscGain.gain.value = 0;
    this.boostOsc.connect(this.boostOscGain);
    this.boostOscGain.connect(this.master);
    this.boostOsc.start();
  }

  _buildMusic() {
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 2600;
    this.musicFilter.connect(this.musicGain);
  }

  setEngine({ speed = 0, throttle = 0, drifting = false, boosting = false } = {}) {
    if (!this.initialized || this.paused) return;
    const now = this.ctx.currentTime;
    const ratio = clamp(speed, 0, 1);
    const throttleMix = clamp(throttle, 0, 1);
    const base = 45 + ratio * 138;
    this.engineOsc1.frequency.setTargetAtTime(base, now, 0.055);
    this.engineOsc2.frequency.setTargetAtTime(base * 1.502 + ratio * 22, now, 0.055);
    this.engineSub.frequency.setTargetAtTime(base * 0.5, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(350 + ratio * 2450 + throttleMix * 290, now, 0.075);
    this.engineFilter.Q.setTargetAtTime(drifting ? 5.5 : 3.1 + ratio * 1.8, now, 0.09);
    const engineLevel = 0.022 + ratio * 0.085 + throttleMix * 0.035;
    this.engineGain.gain.setTargetAtTime(boosting ? engineLevel * 1.16 : engineLevel, now, 0.06);
    this.windGain.gain.setTargetAtTime(0.004 + ratio * 0.058, now, 0.1);
    this.windFilter.frequency.setTargetAtTime(700 + ratio * 1700, now, 0.12);
  }

  driftStart() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    this.driftGain.gain.cancelScheduledValues(now);
    this.driftGain.gain.setTargetAtTime(0.12, now, 0.07);
    this.driftFilter.frequency.setTargetAtTime(2100, now, 0.08);
    this.driftTone.frequency.setTargetAtTime(560, now, 0.1);
  }

  driftEnd() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    this.driftGain.gain.setTargetAtTime(0.0001, now, 0.11);
  }

  boostStart() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    this.boostGain.gain.cancelScheduledValues(now);
    this.boostGain.gain.setValueAtTime(0.0001, now);
    this.boostGain.gain.exponentialRampToValueAtTime(0.16, now + 0.14);
    this.boostGain.gain.setTargetAtTime(0.07, now + 0.3, 0.4);
    this.boostFilter.frequency.cancelScheduledValues(now);
    this.boostFilter.frequency.setValueAtTime(550, now);
    this.boostFilter.frequency.exponentialRampToValueAtTime(2700, now + 0.35);
    this.boostOsc.frequency.cancelScheduledValues(now);
    this.boostOsc.frequency.setValueAtTime(80, now);
    this.boostOsc.frequency.exponentialRampToValueAtTime(150, now + 0.28);
    this.boostOscGain.gain.setTargetAtTime(0.025, now, 0.06);
  }

  boostEnd() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    this.boostGain.gain.setTargetAtTime(0.0001, now, 0.3);
    this.boostOscGain.gain.setTargetAtTime(0.0001, now, 0.2);
  }

  _tone(frequency, duration = 0.1, gain = 0.07, type = 'sine', when = 0) {
    if (!this.initialized) return;
    const now = this.ctx.currentTime + when;
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  countdown(final = false) {
    this._tone(final ? 880 : 540, final ? 0.34 : 0.16, final ? 0.085 : 0.06, final ? 'sine' : 'square');
    if (final) {
      this._tone(1108, 0.4, 0.045, 'triangle', 0.01);
    }
  }

  go() {
    this._tone(392, 0.55, 0.05, 'triangle');
    this._tone(523.25, 0.65, 0.045, 'triangle', 0.03);
    this._tone(783.99, 0.75, 0.035, 'sine', 0.06);
    this._tone(1046.5, 0.8, 0.022, 'sine', 0.1);
  }

  hit() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(120, now);
    oscillator.frequency.exponentialRampToValueAtTime(44, now + 0.22);
    envelope.gain.setValueAtTime(0.11, now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  pickupBoost() {
    this._tone(740, 0.09, 0.035, 'sine');
    this._tone(1108, 0.15, 0.032, 'sine', 0.055);
  }

  finish(win = true) {
    if (!this.initialized) return;
    const notes = win ? [523.25, 659.25, 783.99, 1046.5] : [392, 466.16, 523.25, 659.25];
    notes.forEach((note, index) => this._tone(note, 0.42, 0.055, 'triangle', index * 0.12));
  }

  startMusic() {
    if (!this.initialized || this.musicRunning) return;
    this.musicRunning = true;
    this.musicStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.08;
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.8);
    this.musicTimer = window.setInterval(() => this._scheduleMusic(), 80);
    this._scheduleMusic();
  }

  stopMusic() {
    this.musicRunning = false;
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.initialized) {
      this.musicGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.35);
    }
  }

  _scheduleMusic() {
    if (!this.musicRunning || !this.initialized) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.18) {
      this._musicEvent(this.musicStep, this.nextNoteTime);
      this.nextNoteTime += 60 / 112 / 2;
      this.musicStep += 1;
    }
  }

  _musicEvent(step, time) {
    const event = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const bassNotes = [55, 55, 82.41, 55, 43.65, 43.65, 65.41, 43.65];
    const bassNote = bassNotes[(bar * 2 + (event % 2)) % bassNotes.length];
    if (event % 2 === 0) {
      this._musicTone(bassNote, time, 0.28, 0.035, 'sawtooth', 620);
    }
    if (event === 0 || event === 4 || event === 8 || event === 12) {
      this._kick(time);
    }
    if (event === 4 || event === 12) {
      this._musicNoise(time, 0.08, 0.02, 1700, 'highpass');
    }
    if (event === 7 || event === 15) {
      this._musicTone(bassNote * 4, time, 0.19, 0.014, 'triangle', 2400);
    }
    if (event % 8 === 0) {
      const chords = [
        [110, 130.81, 164.81],
        [98, 123.47, 146.83],
        [87.31, 110, 130.81],
        [98, 123.47, 164.81]
      ];
      chords[bar].forEach((note, index) => {
        this._musicTone(note, time, 1.7, 0.006, 'sawtooth', 1100 + index * 120, 0.3);
      });
    }
  }

  _musicTone(frequency, time, duration, gain, type, filterFrequency, attack = 0.02) {
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrequency, time);
    filter.Q.value = 1.1;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.linearRampToValueAtTime(gain, time + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.musicFilter);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }

  _musicNoise(time, duration, gain, frequency, type) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const envelope = this.ctx.createGain();
    filter.type = type;
    filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(gain, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.musicFilter);
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  _kick(time) {
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(145, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.16);
    envelope.gain.setValueAtTime(0.075, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
    oscillator.connect(envelope);
    envelope.connect(this.musicFilter);
    oscillator.start(time);
    oscillator.stop(time + 0.27);
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(paused ? 0.025 : this.volume, now, 0.12);
    if (paused) {
      this.driftEnd();
      this.boostEnd();
    }
  }

  setMasterVolume(value) {
    this.volume = clamp(value, 0, 1);
    this.muted = this.volume === 0;
    if (this.initialized && !this.paused) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
  }

  toggleMute() {
    if (this.muted || this.volume === 0) {
      this.setMasterVolume(0.55);
      return false;
    }
    this.setMasterVolume(0);
    return true;
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
