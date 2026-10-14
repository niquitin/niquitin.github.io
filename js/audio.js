/**
 * Audio Engine using Web Audio API
 * Generates dynamic, realistic sound effects synthesised entirely in real-time
 * 100% offline, zero latency, no external mp3 files required!
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.vibrationEnabled = true;
        this.initContext();
    }

    initContext() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleSound() {
        this.enabled = !this.enabled;
        if (!this.enabled) this.stopContinuousAudio();
        return this.enabled;
    }

    stopContinuousAudio() {
        this.stopElectricHum();
    }

    toggleVibration() {
        this.vibrationEnabled = !this.vibrationEnabled;
        if (window.partyHaptics) window.partyHaptics.setEnabled(this.vibrationEnabled);
        return this.vibrationEnabled;
    }

    vibrate(pattern = [100]) {
        if (!this.vibrationEnabled) return;
        if (window.partyHaptics) {
            window.partyHaptics.play(pattern);
            return;
        }
        try {
            if ('vibrate' in navigator) navigator.vibrate(pattern);
        } catch (e) {}
    }

    // Standard UI Button Click
    playClick() {
        if (!this.enabled) return;
        this.resume();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.04);
        } catch (e) {}
    }

    // Lightweight aliases used by game result presenters. Keeping these
    // methods on the shared engine prevents a result animation from stopping
    // halfway when a rule requests a simple tick or chomp cue.
    playTick() {
        this.playBombTick(0.2);
    }

    playChomp() {
        this.playCrocodileChomp();
    }

    // Crocodile Tooth Safe Click
    playToothSafe() {
        if (!this.enabled) return;
        this.resume();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(780, this.ctx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.08);
        } catch (e) {}
    }

    // Crocodile Jaw Snapping Chomp + Savage Beast Growl!
    playCrocodileChomp() {
        this.vibrate([120, 30, 250, 40, 450]);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            
            // 1. Sharp Bone-Crunching Snap (High-impact noise transient)
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2200, now);
            filter.frequency.exponentialRampToValueAtTime(180, now + 0.3);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(1.2, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);

            // 2. Heavy Jaw Clamp Impact (Deep 50Hz sub-bass punch)
            const osc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(38, now + 0.45);

            subGain.gain.setValueAtTime(0.95, now);
            subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

            osc.connect(subGain);
            subGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.45);

            // 3. Low Beast Growl (Throat rumble)
            const growl = this.ctx.createOscillator();
            const growlGain = this.ctx.createGain();
            growl.type = 'triangle';
            growl.frequency.setValueAtTime(85, now);
            growl.frequency.linearRampToValueAtTime(45, now + 0.5);

            growlGain.gain.setValueAtTime(0.5, now);
            growlGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            growl.connect(growlGain);
            growlGain.connect(this.ctx.destination);
            growl.start(now);
            growl.stop(now + 0.5);
        } catch (e) {}
    }


    // Crocodile Jaw Reopen Mechanical Ratchet Click
    playJawOpen() {
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            [0, 0.05, 0.1].forEach((delay, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(420 + idx * 140, now + delay);
                osc.frequency.exponentialRampToValueAtTime(750 + idx * 100, now + delay + 0.035);
                gain.gain.setValueAtTime(0.3, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.035);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 0.035);
            });
        } catch (e) {}
    }

    // Wheel of Fortune clicking sound
    playWheelTick() {
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200 + Math.random() * 200, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.025);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.025);
        } catch (e) {}
    }

    // Electric Charging sound for Finger Chooser
    startElectricHum() {
        if (!this.enabled || this.chargingOsc) return;
        this.resume();
        try {
            this.chargingOsc = this.ctx.createOscillator();
            this.chargingGain = this.ctx.createGain();

            this.chargingOsc.type = 'sawtooth';
            this.chargingOsc.frequency.setValueAtTime(120, this.ctx.currentTime);
            this.chargingOsc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 3.0);

            this.chargingGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

            this.chargingOsc.connect(this.chargingGain);
            this.chargingGain.connect(this.ctx.destination);

            this.chargingOsc.start();
        } catch (e) {}
    }

    stopElectricHum() {
        if (this.chargingOsc) {
            try {
                this.chargingOsc.stop();
                this.chargingOsc.disconnect();
            } catch (e) {}
            this.chargingOsc = null;
            this.chargingGain = null;
        }
    }

    // Shock / Electric Zap impact
    playElectricShock() {
        this.vibrate([200, 50, 200, 50, 400]);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.35);

            // Tremolo / zap flutter
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.type = 'square';
            lfo.frequency.setValueAtTime(45, now);
            lfoGain.gain.setValueAtTime(300, now);
            lfo.connect(osc.frequency);
            lfo.start(now);
            lfo.stop(now + 0.35);

            gain.gain.setValueAtTime(0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) {}
    }

    // Bomb Ticking sound (pitch increases as time runs out)
    playBombTick(urgency = 1.0) {
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            const baseFreq = 600 + (urgency * 400);
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.03);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.03);
        } catch (e) {}
    }

    // Epic Bomb Explosion (Multi-layer cinema grade boom)
    playExplosion() {
        this.vibrate([150, 40, 250, 50, 400, 60, 600]);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            
            // 1. Initial High-Velocity Detonation Shockwave (White noise blast)
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.22));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.frequency.exponentialRampToValueAtTime(50, now + 0.9);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(1.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);

            // 2. Heavy 32Hz Sub-Bass Earthquake Boom
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sawtooth';
            sub.frequency.setValueAtTime(160, now);
            sub.frequency.exponentialRampToValueAtTime(30, now + 0.85);

            subGain.gain.setValueAtTime(1.1, now);
            subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

            sub.connect(subGain);
            subGain.connect(this.ctx.destination);
            sub.start(now);
            sub.stop(now + 0.85);

            // 3. Crackling Debris Tail (High frequency distortion sizzle)
            const sizzleBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.6), this.ctx.sampleRate);
            const sData = sizzleBuffer.getChannelData(0);
            for (let i = 0; i < sData.length; i++) {
                sData[i] = (Math.random() * 2 - 1) * (1 - i / sData.length);
            }
            const sizzle = this.ctx.createBufferSource();
            sizzle.buffer = sizzleBuffer;
            const sFilter = this.ctx.createBiquadFilter();
            sFilter.type = 'highpass';
            sFilter.frequency.setValueAtTime(800, now);
            const sGain = this.ctx.createGain();
            sGain.gain.setValueAtTime(0.4, now);
            sGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            sizzle.connect(sFilter);
            sFilter.connect(sGain);
            sGain.connect(this.ctx.destination);
            sizzle.start(now + 0.05);
        } catch (e) {}
    }


    // Celebration / Win Fanfare
    playWin() {
        this.vibrate([100, 50, 150]);
        if (!this.enabled) return;
        this.resume();
        try {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            const now = this.ctx.currentTime;
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const noteTime = now + idx * 0.08;

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.25, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.25);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(noteTime);
                osc.stop(noteTime + 0.25);
            });
        } catch (e) {}
    }

    // Pirate Sword Insertion: Metallic scrape and wooden lock click
    playSwordInsert() {
        this.vibrate(35);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Metallic scrape
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(450, now + 0.07);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);

            // Wood click
            const clickOsc = this.ctx.createOscillator();
            const clickGain = this.ctx.createGain();
            clickOsc.type = 'sine';
            clickOsc.frequency.setValueAtTime(220, now + 0.04);
            clickGain.gain.setValueAtTime(0.4, now + 0.04);
            clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

            clickOsc.connect(clickGain);
            clickGain.connect(this.ctx.destination);
            clickOsc.start(now + 0.04);
            clickOsc.stop(now + 0.09);
        } catch (e) {}
    }

    // Pirate Spring Pop Ejection: Cartoon spring "boing" + surprise whistle
    playPiratePop() {
        this.vibrate([100, 30, 180, 40, 300]);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Spring Boing
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(750, now + 0.18);
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.4);

            // High comedic whistle
            const whistle = this.ctx.createOscillator();
            const wGain = this.ctx.createGain();
            whistle.type = 'triangle';
            whistle.frequency.setValueAtTime(800, now + 0.08);
            whistle.frequency.exponentialRampToValueAtTime(1800, now + 0.3);
            wGain.gain.setValueAtTime(0.25, now + 0.08);
            wGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

            whistle.connect(wGain);
            wGain.connect(this.ctx.destination);
            whistle.start(now + 0.08);
            whistle.stop(now + 0.35);
        } catch (e) {}
    }

    // Dice Tumbling & Roll: wooden cup rattle + multiple bounces
    playDiceRoll() {
        this.vibrate([30, 20, 40, 20, 50]);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            // Generate 5 quick clicks with pitch variation
            for (let i = 0; i < 5; i++) {
                const t = now + i * 0.05 + Math.random() * 0.02;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(400 + Math.random() * 300, t);
                gain.gain.setValueAtTime(0.18, t);
                gain.gain.exponentialRampToValueAtTime(0.005, t + 0.035);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.035);
            }
        } catch (e) {}
    }

    // Card Flip: Crisp paper swoosh
    playCardFlip() {
        this.vibrate(25);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2200, now);
            filter.Q.setValueAtTime(3, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    // Bottle Spin: Whirring friction sound
    playBottleSpin() {
        this.vibrate([30, 40, 30]);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 1.2);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 1.2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 1.2);
        } catch (e) {}
    }

    // Bottle Cap Pop! Crisp cork/cap pop
    playBottlePop() {
        this.vibrate([60, 40, 100]);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    // Heartbeat for Number Bomb tension
    playHeartbeat(rate = 1.0) {
        this.vibrate([40, 60, 40]);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(65, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

            gain.gain.setValueAtTime(0.4 * rate, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }

    // Number Bomb Safe Guess Ding
    playNumberSafe() {
        this.vibrate(30);
        if (!this.enabled) return;
        this.resume();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }
}

// Global sound singleton
window.soundEngine = new SoundEngine();
