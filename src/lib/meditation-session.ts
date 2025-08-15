export interface MeditationSessionConfig {
  type: 'breathing' | 'mindfulness' | 'relaxation' | 'posture' | 'exercise';
  duration: number; // seconds
  phases: MeditationPhase[];
}

export interface MeditationPhase {
  name: string;
  duration: number; // seconds
  description: string;
  guidance: string;
}

export class MeditationSession {
  private currentSession: MeditationSessionConfig | null = null;
  private currentPhaseIndex = 0;
  private phaseStartTime = 0;
  private sessionStartTime = 0;
  private isActive = false;
  private phaseTimer: NodeJS.Timeout | null = null;

  // Predefined meditation session configurations
  private sessionConfigs: Record<string, MeditationSessionConfig> = {
    breathing: {
      type: 'breathing',
      duration: 300, // 5 minutes
      phases: [
        {
          name: 'Preparation',
          duration: 30,
          description: 'Find a comfortable position and begin to settle in',
          guidance: 'Take a moment to find a comfortable seated position. Close your eyes gently and begin to notice your natural breathing.'
        },
        {
          name: 'Breathing Awareness',
          duration: 120,
          description: 'Focus on natural breathing patterns',
          guidance: 'Simply observe your breath as it naturally flows in and out. Don\'t try to change it, just notice the rhythm.'
        },
        {
          name: 'Guided Breathing',
          duration: 90,
          description: 'Follow guided breathing exercises',
          guidance: 'Now let\'s take a few deeper breaths together. Inhale slowly through your nose, and exhale gently through your mouth.'
        },
        {
          name: 'Integration',
          duration: 60,
          description: 'Return to natural breathing and prepare to close',
          guidance: 'Return to your natural breathing pattern. Notice how you feel now compared to when we began.'
        }
      ]
    },
    mindfulness: {
      type: 'mindfulness',
      duration: 300, // 5 minutes
      phases: [
        {
          name: 'Grounding',
          duration: 45,
          description: 'Connect with your body and surroundings',
          guidance: 'Begin by feeling the weight of your body in your seat. Notice the sensations of contact with the chair or floor.'
        },
        {
          name: 'Present Moment Awareness',
          duration: 120,
          description: 'Focus on present moment experiences',
          guidance: 'Bring your attention to the present moment. Notice what you can see, hear, feel, and sense right now.'
        },
        {
          name: 'Thought Observation',
          duration: 90,
          description: 'Observe thoughts without judgment',
          guidance: 'As thoughts arise, simply observe them like clouds passing in the sky. Don\'t follow them, just let them go.'
        },
        {
          name: 'Closing',
          duration: 45,
          description: 'Gently return to daily awareness',
          guidance: 'Slowly bring your attention back to your surroundings. Notice how you feel, and carry this awareness with you.'
        }
      ]
    },
    relaxation: {
      type: 'relaxation',
      duration: 300, // 5 minutes
      phases: [
        {
          name: 'Body Scan',
          duration: 90,
          description: 'Systematically relax each part of your body',
          guidance: 'Starting from your toes, feel each part of your body relaxing. Let go of any tension you\'re holding.'
        },
        {
          name: 'Deep Relaxation',
          duration: 120,
          description: 'Enter a state of deep relaxation',
          guidance: 'Allow yourself to sink deeper into relaxation. Feel the weight of your body and the peace of this moment.'
        },
        {
          name: 'Visualization',
          duration: 60,
          description: 'Use peaceful imagery for deeper relaxation',
          guidance: 'Imagine yourself in a peaceful place. Maybe a quiet beach, a forest, or anywhere that brings you peace.'
        },
        {
          name: 'Return',
          duration: 30,
          description: 'Gently return to alert awareness',
          guidance: 'Slowly begin to return to alertness. Take a few deep breaths and notice how refreshed you feel.'
        }
      ]
    },
    posture: {
      type: 'posture',
      duration: 300, // 5 minutes
      phases: [
        {
          name: 'Posture Assessment',
          duration: 60,
          description: 'Analyze current posture and identify areas for improvement',
          guidance: 'Let\'s start by assessing your current posture. Stand or sit naturally while I analyze your alignment.'
        },
        {
          name: 'Posture Correction',
          duration: 120,
          description: 'Practice proper posture with real-time feedback',
          guidance: 'Now let\'s work on improving your posture. I\'ll provide real-time guidance as you make adjustments.'
        },
        {
          name: 'Posture Maintenance',
          duration: 90,
          description: 'Hold correct posture and build muscle memory',
          guidance: 'Great! Now let\'s maintain this improved posture. This helps build muscle memory for better alignment.'
        },
        {
          name: 'Integration',
          duration: 30,
          description: 'Apply posture principles to daily activities',
          guidance: 'Excellent work! Remember these posture principles as you go about your day. Good posture is a habit.'
        }
      ]
    },
    exercise: {
      type: 'exercise',
      duration: 300, // 5 minutes
      phases: [
        {
          name: 'Warm-up',
          duration: 60,
          description: 'Gentle movements to prepare your body',
          guidance: 'Let\'s start with some gentle warm-up movements to prepare your body for exercise.'
        },
        {
          name: 'Core Workout',
          duration: 120,
          description: 'Targeted exercises for strength and posture',
          guidance: 'Now let\'s focus on core strengthening exercises that will improve your posture and overall fitness.'
        },
        {
          name: 'Stretching',
          duration: 90,
          description: 'Flexibility exercises for better range of motion',
          guidance: 'Time for some stretching to improve flexibility and prevent muscle tightness.'
        },
        {
          name: 'Cool-down',
          duration: 30,
          description: 'Gentle movements to transition back to rest',
          guidance: 'Let\'s finish with a gentle cool-down to help your body transition back to rest.'
        }
      ]
    }
  };

  async start(sessionType: string, duration: number): Promise<void> {
    try {
      const config = this.sessionConfigs[sessionType];
      if (!config) {
        throw new Error(`Unknown meditation type: ${sessionType}`);
      }

      // Adjust phase durations to match requested duration
      const adjustedConfig = this.adjustSessionDuration(config, duration);
      
      this.currentSession = adjustedConfig;
      this.currentPhaseIndex = 0;
      this.sessionStartTime = Date.now();
      this.phaseStartTime = Date.now();
      this.isActive = true;

      console.log(`🧘 Starting ${sessionType} meditation session (${duration} seconds)`);
      
      // Start the first phase
      this.startCurrentPhase();
      
    } catch (error) {
      console.error('❌ Failed to start meditation session:', error);
      throw error;
    }
  }

  stop(): void {
    this.isActive = false;
    this.currentSession = null;
    this.currentPhaseIndex = 0;
    
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    
    console.log('🧘 Meditation session stopped');
  }

  private startCurrentPhase(): void {
    if (!this.currentSession || !this.isActive) return;

    const currentPhase = this.currentSession.phases[this.currentPhaseIndex];
    if (!currentPhase) {
      this.completeSession();
      return;
    }

    console.log(`🧘 Phase ${this.currentPhaseIndex + 1}: ${currentPhase.name}`);
    this.phaseStartTime = Date.now();

    // Set timer for phase transition
    this.phaseTimer = setTimeout(() => {
      this.nextPhase();
    }, currentPhase.duration * 1000);
  }

  private nextPhase(): void {
    if (!this.currentSession || !this.isActive) return;

    this.currentPhaseIndex++;
    
    if (this.currentPhaseIndex >= this.currentSession.phases.length) {
      this.completeSession();
    } else {
      this.startCurrentPhase();
    }
  }

  private completeSession(): void {
    console.log('🧘 Meditation session completed');
    this.isActive = false;
    this.currentSession = null;
    this.currentPhaseIndex = 0;
    
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private adjustSessionDuration(config: MeditationSessionConfig, targetDuration: number): MeditationSessionConfig {
    const totalPhaseDuration = config.phases.reduce((sum, phase) => sum + phase.duration, 0);
    const scaleFactor = targetDuration / totalPhaseDuration;

    const adjustedPhases = config.phases.map(phase => ({
      ...phase,
      duration: Math.round(phase.duration * scaleFactor)
    }));

    return {
      ...config,
      duration: targetDuration,
      phases: adjustedPhases
    };
  }

  // Public methods for session information
  getCurrentPhase(): MeditationPhase | null {
    if (!this.currentSession || !this.isActive) return null;
    
    const phase = this.currentSession.phases[this.currentPhaseIndex];
    if (!phase) return null;

    const elapsed = (Date.now() - this.phaseStartTime) / 1000;
    const remaining = Math.max(0, phase.duration - elapsed);

    return {
      ...phase,
      duration: remaining
    };
  }

  getSessionProgress(): number {
    if (!this.currentSession || !this.isActive) return 0;
    
    const elapsed = (Date.now() - this.sessionStartTime) / 1000;
    return Math.min(elapsed / this.currentSession.duration, 1);
  }

  getSessionTimeRemaining(): number {
    if (!this.currentSession || !this.isActive) return 0;
    
    const elapsed = (Date.now() - this.sessionStartTime) / 1000;
    return Math.max(0, this.currentSession.duration - elapsed);
  }

  getCurrentPhaseProgress(): number {
    if (!this.currentSession || !this.isActive) return 0;
    
    const phase = this.currentSession.phases[this.currentPhaseIndex];
    if (!phase) return 0;
    
    const elapsed = (Date.now() - this.phaseStartTime) / 1000;
    return Math.min(elapsed / phase.duration, 1);
  }

  isSessionActive(): boolean {
    return this.isActive;
  }

  getSessionType(): string | null {
    return this.currentSession?.type || null;
  }

  // Method to get guidance for current phase
  getCurrentGuidance(): string {
    const phase = this.getCurrentPhase();
    return phase?.guidance || 'Take a moment to breathe and be present.';
  }

  // Method to get next phase preview
  getNextPhasePreview(): string | null {
    if (!this.currentSession || !this.isActive) return null;
    
    const nextIndex = this.currentPhaseIndex + 1;
    if (nextIndex >= this.currentSession.phases.length) return null;
    
    return this.currentSession.phases[nextIndex].description;
  }

  // Method to pause/resume session
  pauseSession(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  resumeSession(): void {
    if (this.isActive && this.currentSession) {
      this.startCurrentPhase();
    }
  }
}
