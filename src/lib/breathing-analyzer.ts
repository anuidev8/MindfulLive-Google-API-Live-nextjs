import { EventEmitter } from 'eventemitter3';

export interface BreathingData {
  rate: number;           // breaths per minute
  quality: number;        // 0-1, quality of breathing pattern
  stressIndicator: number; // 0-1, stress level based on breathing
  pattern: 'normal' | 'fast' | 'slow' | 'irregular';
  timestamp: number;
}

export class BreathingAnalyzer extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private isRecording = false;
  private breathingBuffer: number[] = [];
  private lastBreathTime = 0;
  private breathCount = 0;
  private sessionStartTime = 0;

  constructor() {
    super();
  }

  async start(): Promise<void> {
    try {
      if (this.isRecording) return;

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.isRecording = true;
      this.sessionStartTime = Date.now();
      this.breathingBuffer = [];
      this.breathCount = 0;
      this.lastBreathTime = 0;

      this.startBreathingAnalysis();
      console.log('🫁 Breathing analysis started');
    } catch (error) {
      console.error('❌ Failed to start breathing analysis:', error);
      throw error;
    }
  }

  stop(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.microphone = null;
    this.analyser = null;
    console.log('🫁 Breathing analysis stopped');
  }

  private startBreathingAnalysis(): void {
    if (!this.analyser || !this.isRecording) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeData = new Float32Array(bufferLength);

    const analyzeBreathing = () => {
      if (!this.isRecording) return;

      this.analyser!.getByteFrequencyData(dataArray);
      this.analyser!.getFloatTimeDomainData(timeData);

      // Analyze breathing patterns
      const breathingData = this.analyzeBreathingPattern(dataArray, timeData);
      
      if (breathingData) {
        this.emit('breathing', breathingData);
      }

      requestAnimationFrame(analyzeBreathing);
    };

    analyzeBreathing();
  }

  private analyzeBreathingPattern(frequencyData: Uint8Array, timeData: Float32Array): BreathingData | null {
    const now = Date.now();
    
    // Calculate average frequency in the breathing range (0.1-0.5 Hz)
    const breathingFreqRange = this.getBreathingFrequencyRange(frequencyData);
    
    // Detect breath cycles using amplitude changes
    const breathDetected = this.detectBreathCycle(timeData);
    
    if (breathDetected) {
      this.breathCount++;
      this.lastBreathTime = now;
      
      // Calculate breathing rate (breaths per minute)
      const sessionDuration = (now - this.sessionStartTime) / 1000 / 60; // minutes
      const currentRate = sessionDuration > 0 ? this.breathCount / sessionDuration : 0;
      
      // Add to buffer for smoothing
      this.breathingBuffer.push(currentRate);
      if (this.breathingBuffer.length > 10) {
        this.breathingBuffer.shift();
      }
      
      // Calculate smoothed breathing rate
      const smoothedRate = this.breathingBuffer.reduce((a, b) => a + b, 0) / this.breathingBuffer.length;
      
      // Analyze breathing quality and stress indicators
      const quality = this.calculateBreathingQuality(breathingFreqRange, timeData);
      const stressIndicator = this.calculateStressIndicator(smoothedRate, quality);
      const pattern = this.classifyBreathingPattern(smoothedRate);
      
      return {
        rate: Math.round(smoothedRate * 10) / 10,
        quality,
        stressIndicator,
        pattern,
        timestamp: now
      };
    }
    
    return null;
  }

  private getBreathingFrequencyRange(frequencyData: Uint8Array): number {
    // Focus on low frequencies where breathing occurs
    const lowFreqStart = Math.floor(frequencyData.length * 0.1);
    const lowFreqEnd = Math.floor(frequencyData.length * 0.3);
    
    let sum = 0;
    let count = 0;
    
    for (let i = lowFreqStart; i < lowFreqEnd; i++) {
      sum += frequencyData[i];
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }

  private detectBreathCycle(timeData: Float32Array): boolean {
    // Calculate RMS (Root Mean Square) of the audio signal
    let rms = 0;
    for (let i = 0; i < timeData.length; i++) {
      rms += timeData[i] * timeData[i];
    }
    rms = Math.sqrt(rms / timeData.length);
    
    // Detect significant amplitude changes that indicate breathing
    const threshold = 0.01; // Adjustable threshold
    const significantChange = rms > threshold;
    
    // Debounce to avoid multiple detections of the same breath
    const timeSinceLastBreath = Date.now() - this.lastBreathTime;
    const minBreathInterval = 1000; // Minimum 1 second between breaths
    
    return significantChange && timeSinceLastBreath > minBreathInterval;
  }

  private calculateBreathingQuality(frequencyData: number, timeData: Float32Array): number {
    // Calculate breathing quality based on signal consistency and noise
    const rms = this.calculateRMS(timeData);
    const signalToNoiseRatio = frequencyData / (rms + 0.001);
    
    // Normalize to 0-1 range
    return Math.min(Math.max(signalToNoiseRatio / 100, 0), 1);
  }

  private calculateRMS(timeData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i] * timeData[i];
    }
    return Math.sqrt(sum / timeData.length);
  }

  private calculateStressIndicator(breathingRate: number, quality: number): number {
    // Stress indicators based on breathing patterns
    let stressScore = 0;
    
    // Fast breathing indicates stress
    if (breathingRate > 20) {
      stressScore += 0.4;
    } else if (breathingRate > 16) {
      stressScore += 0.2;
    }
    
    // Irregular breathing indicates stress
    if (quality < 0.3) {
      stressScore += 0.3;
    } else if (quality < 0.6) {
      stressScore += 0.15;
    }
    
    // Very slow breathing can also indicate stress
    if (breathingRate < 8) {
      stressScore += 0.2;
    }
    
    // Normalize to 0-1 range
    return Math.min(Math.max(stressScore, 0), 1);
  }

  private classifyBreathingPattern(rate: number): 'normal' | 'fast' | 'slow' | 'irregular' {
    if (rate > 20) return 'fast';
    if (rate < 10) return 'slow';
    if (rate >= 10 && rate <= 20) return 'normal';
    return 'irregular';
  }

  // Public methods for external access
  getCurrentBreathingRate(): number {
    if (this.breathingBuffer.length === 0) return 0;
    return this.breathingBuffer[this.breathingBuffer.length - 1];
  }

  getBreathingQuality(): number {
    // Return average quality over recent samples
    return this.breathingBuffer.length > 0 ? 0.7 : 0; // Placeholder
  }

  getStressLevel(): number {
    const rate = this.getCurrentBreathingRate();
    const quality = this.getBreathingQuality();
    return this.calculateStressIndicator(rate, quality);
  }

  // Reset session data
  resetSession(): void {
    this.breathCount = 0;
    this.sessionStartTime = Date.now();
    this.breathingBuffer = [];
    this.lastBreathTime = 0;
  }
}
