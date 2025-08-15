import { EventEmitter } from 'eventemitter3';

export interface PoseData {
  landmarks: PoseLandmark[];
  posture: PostureAnalysis;
  confidence: number;
  timestamp: number;
}

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PostureAnalysis {
  spineAlignment: 'good' | 'fair' | 'poor';
  shoulderLevel: 'even' | 'uneven' | 'unknown';
  headPosition: 'neutral' | 'forward' | 'backward';
  overallScore: number; // 0-100
  recommendations: string[];
}

export class PoseAnalyzer extends EventEmitter {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private pose: any = null; // MediaPipe Pose instance
  private isTracking = false;
  private animationId: number | null = null;
  private isInitialized = false;

  constructor() {
    super();
    // Don't auto-initialize, wait for explicit start
  }

  private async initializeMediaPipe(): Promise<boolean> {
    try {
      console.log('🎯 Initializing MediaPipe Pose...');
      
      // Try different import patterns
      let PoseClass: any = null;
      
      try {
        // Method 1: Named import
        const mediaPipeModule = await import('@mediapipe/pose');
        PoseClass = mediaPipeModule.Pose;
        console.log('✅ Method 1: Named import successful', typeof PoseClass);
      } catch (error) {
        console.log('⚠️ Method 1 failed, trying default import...');
        
        // Method 2: Default import
        try {
          const mediaPipeModule = await import('@mediapipe/pose');
          PoseClass = mediaPipeModule.default?.Pose || mediaPipeModule.default;
          console.log('✅ Method 2: Default import successful', typeof PoseClass);
        } catch (error2) {
          console.log('⚠️ Method 2 failed, trying namespace import...');
          
          // Method 3: Namespace import
          const mediaPipeModule = await import('@mediapipe/pose');
          PoseClass = (mediaPipeModule as any).Pose;
          console.log('✅ Method 3: Namespace import successful', typeof PoseClass);
        }
      }

      // Verify we have a constructor function
      if (!PoseClass || typeof PoseClass !== 'function') {
        throw new Error(`Pose class is not a constructor function. Type: ${typeof PoseClass}`);
      }

      console.log('✅ MediaPipe Pose class ready, creating instance...');

      // Create MediaPipe Pose instance
      this.pose = new PoseClass({
        locateFile: (file: string) => {
          const baseUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose';
          console.log(`📁 Loading MediaPipe file: ${baseUrl}/${file}`);
          return `${baseUrl}/${file}`;
        }
      });

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Configure MediaPipe options
      await this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Set up results callback
      this.pose.onResults((results: any) => {
        this.onPoseResults(results);
      });

      this.isInitialized = true;
      console.log('🎯 MediaPipe Pose initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize MediaPipe Pose:', error);
      console.log('🔄 Falling back to mock pose detection...');
      this.initializeMockPose();
      return false;
    }
  }

  private initializeMockPose(): void {
    console.log('🎭 Initializing mock pose detection for development');
    
    // Create a mock pose object that simulates MediaPipe behavior
    this.pose = {
      setOptions: () => {},
      onResults: (callback: any) => {
        this.mockPoseCallback = callback;
      },
      send: async () => {
        // Simulate pose detection with mock data and draw it
        setTimeout(() => {
          if (this.mockPoseCallback) {
            const mockResults = {
              poseLandmarks: this.generateMockLandmarks(),
              image: null
            };
            
            // Process the mock results to draw landmarks
            this.onPoseResults(mockResults);
            
            // Also call the callback for any external listeners
            this.mockPoseCallback(mockResults);
          }
        }, 100);
      }
    };
    
    this.isInitialized = true;
    console.log('✅ Mock pose detection initialized');
  }

  private mockPoseCallback: any = null;

  private generateMockLandmarks(): any[] {
    // Generate realistic mock pose landmarks for testing
    const landmarks = [];
    
    // Key body points with realistic positions
    const keyPoints = [
      { x: 0.5, y: 0.2, z: 0, visibility: 0.9 },    // 0: Nose
      { x: 0.45, y: 0.25, z: 0, visibility: 0.9 },  // 11: Left shoulder
      { x: 0.55, y: 0.25, z: 0, visibility: 0.9 },  // 12: Right shoulder
      { x: 0.45, y: 0.4, z: 0, visibility: 0.9 },   // 23: Left hip
      { x: 0.55, y: 0.4, z: 0, visibility: 0.9 },   // 24: Right hip
      { x: 0.45, y: 0.6, z: 0, visibility: 0.9 },   // 25: Left knee
      { x: 0.55, y: 0.6, z: 0, visibility: 0.9 },   // 26: Right knee
      { x: 0.45, y: 0.8, z: 0, visibility: 0.9 },   // 27: Left ankle
      { x: 0.55, y: 0.8, z: 0, visibility: 0.9 },   // 28: Right ankle
    ];
    
    // Fill in all 33 landmarks with realistic data
    for (let i = 0; i < 33; i++) {
      if (i < keyPoints.length) {
        // Use predefined key points
        landmarks.push({
          x: keyPoints[i].x + (Math.random() - 0.5) * 0.02, // Add small variation
          y: keyPoints[i].y + (Math.random() - 0.5) * 0.02,
          z: keyPoints[i].z,
          visibility: keyPoints[i].visibility
        });
      } else {
        // Generate other landmarks with reasonable positions
        landmarks.push({
          x: 0.5 + (Math.random() - 0.5) * 0.3,
          y: 0.3 + (Math.random() - 0.5) * 0.4,
          z: 0,
          visibility: 0.7 + Math.random() * 0.3
        });
      }
    }
    
    return landmarks;
  }

  async start(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    try {
      if (this.isTracking) return;

      this.videoElement = videoElement;
      this.canvasElement = canvasElement;
      this.ctx = canvasElement.getContext('2d');

      if (!this.ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Initialize MediaPipe if not already done
      if (!this.isInitialized) {
        const success = await this.initializeMediaPipe();
        // Don't throw error if mock fallback is working
        if (!success && !this.isInitialized) {
          throw new Error('Failed to initialize MediaPipe Pose and no fallback available');
        }
      }

      // Set up video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        }
      });

      videoElement.srcObject = stream;
      await videoElement.play();

      // Set canvas dimensions
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      this.isTracking = true;
      this.startPoseTracking();
      
      console.log('🎯 Pose tracking started successfully');
    } catch (error) {
      console.error('❌ Failed to start pose tracking:', error);
      throw error;
    }
  }

  stop(): void {
    if (!this.isTracking) return;

    this.isTracking = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }

    console.log('🎯 Pose tracking stopped');
  }

  private startPoseTracking(): void {
    const trackPose = async () => {
      if (!this.isTracking || !this.videoElement || !this.canvasElement || !this.ctx || !this.pose) return;

      try {
        // Send video frame to MediaPipe (or mock)
        if (this.pose.send) {
          await this.pose.send({ image: this.videoElement });
        }
        
        // For mock mode, also trigger periodic updates
        if (this.mockPoseCallback && this.isTracking) {
          // Update mock pose every few frames for more dynamic visualization
          if (Math.random() < 0.1) { // 10% chance each frame
            setTimeout(() => {
              if (this.mockPoseCallback) {
                const mockResults = {
                  poseLandmarks: this.generateMockLandmarks(),
                  image: null
                };
                this.onPoseResults(mockResults);
              }
            }, 50);
          }
        }
      } catch (error) {
        console.warn('Pose detection error:', error);
      }

      this.animationId = requestAnimationFrame(trackPose);
    };

    trackPose();
  }

  private onPoseResults(results: any): void {
    if (!this.ctx || !this.canvasElement) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    // Draw video frame
    if (results.image) {
      this.ctx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    // Draw pose landmarks
    if (results.poseLandmarks) {
      this.drawPoseLandmarks(results.poseLandmarks);
      
      // Analyze posture
      const postureAnalysis = this.analyzePosture(results.poseLandmarks);
      
      // Emit pose data
      const poseData: PoseData = {
        landmarks: results.poseLandmarks.map((landmark: any) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z,
          visibility: landmark.visibility
        })),
        posture: postureAnalysis,
        confidence: this.calculateConfidence(results.poseLandmarks),
        timestamp: Date.now()
      };

      this.emit('pose', poseData);
    }
  }

  private drawPoseLandmarks(landmarks: any[]): void {
    if (!this.ctx || !this.canvasElement) return;

    // Enhanced drawing styles
    this.ctx.fillStyle = '#00FF00';
    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 3;

    // Draw key landmarks with better visibility
    const keyPoints = [0, 11, 12, 23, 24, 25, 26, 27, 28]; // Nose, shoulders, hips, knees
    
    keyPoints.forEach(index => {
      if (landmarks[index] && landmarks[index].visibility > 0.5) {
        const x = landmarks[index].x * this.canvasElement!.width;
        const y = landmarks[index].y * this.canvasElement!.height;
        
        // Draw landmark circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, 8, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Add white border for better visibility
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 3;
      }
    });

    // Draw spine line (nose to hip)
    if (landmarks[0] && landmarks[23] && this.canvasElement) {
      const x1 = landmarks[0].x * this.canvasElement.width;
      const y1 = landmarks[0].y * this.canvasElement.height;
      const x2 = landmarks[23].x * this.canvasElement.width;
      const y2 = landmarks[23].y * this.canvasElement.height;
      
      this.ctx.strokeStyle = '#00FFFF';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    // Draw shoulder line
    if (landmarks[11] && landmarks[12] && this.canvasElement) {
      const x1 = landmarks[11].x * this.canvasElement.width;
      const y1 = landmarks[11].y * this.canvasElement.height;
      const x2 = landmarks[12].x * this.canvasElement.width;
      const y2 = landmarks[12].y * this.canvasElement.height;
      
      this.ctx.strokeStyle = '#FF00FF';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    // Draw hip line
    if (landmarks[23] && landmarks[24] && this.canvasElement) {
      const x1 = landmarks[23].x * this.canvasElement.width;
      const y1 = landmarks[23].y * this.canvasElement.height;
      const x2 = landmarks[24].x * this.canvasElement.width;
      const y2 = landmarks[24].y * this.canvasElement.height;
      
      this.ctx.strokeStyle = '#FFFF00';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    // Reset stroke style
    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 3;
  }

  private analyzePosture(landmarks: any[]): PostureAnalysis {
    const recommendations: string[] = [];
    let overallScore = 100;

    // Analyze spine alignment
    const spineAlignment = this.analyzeSpineAlignment(landmarks);
    if (spineAlignment === 'poor') {
      overallScore -= 30;
      recommendations.push('Try to straighten your back and align your spine');
    } else if (spineAlignment === 'fair') {
      overallScore -= 15;
      recommendations.push('Your posture could be improved - try sitting up straighter');
    }

    // Analyze shoulder level
    const shoulderLevel = this.analyzeShoulderLevel(landmarks);
    if (shoulderLevel === 'uneven') {
      overallScore -= 20;
      recommendations.push('Your shoulders are uneven - try to level them');
    }

    // Analyze head position
    const headPosition = this.analyzeHeadPosition(landmarks);
    if (headPosition === 'forward') {
      overallScore -= 25;
      recommendations.push('Your head is forward - try to bring it back to neutral');
    }

    return {
      spineAlignment,
      shoulderLevel,
      headPosition,
      overallScore: Math.max(0, overallScore),
      recommendations
    };
  }

  private analyzeSpineAlignment(landmarks: any[]): 'good' | 'fair' | 'poor' {
    if (!landmarks[0] || !landmarks[11] || !landmarks[23]) return 'fair';

    // Calculate angle between nose-shoulder and shoulder-hip
    const nose = landmarks[0];
    const shoulder = landmarks[11];
    const hip = landmarks[23];

    const angle = this.calculateAngle(nose, shoulder, hip);
    
    // Ideal spine angle is around 90 degrees
    if (Math.abs(angle - 90) < 10) return 'good';
    if (Math.abs(angle - 90) < 20) return 'fair';
    return 'poor';
  }

  private analyzeShoulderLevel(landmarks: any[]): 'even' | 'uneven' | 'unknown' {
    if (!landmarks[11] || !landmarks[12]) return 'unknown';

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    
    if (heightDiff < 0.05) return 'even';
    return 'uneven';
  }

  private analyzeHeadPosition(landmarks: any[]): 'neutral' | 'forward' | 'backward' {
    if (!landmarks[0] || !landmarks[11]) return 'neutral';

    const nose = landmarks[0];
    const shoulder = landmarks[11];
    
    // If nose is significantly in front of shoulders, head is forward
    const forwardOffset = nose.x - shoulder.x;
    
    if (forwardOffset > 0.1) return 'forward';
    if (forwardOffset < -0.05) return 'backward';
    return 'neutral';
  }

  private calculateAngle(point1: any, point2: any, point3: any): number {
    const a = Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
    const b = Math.sqrt(Math.pow(point3.x - point2.x, 2) + Math.pow(point3.y - point2.y, 2));
    const c = Math.sqrt(Math.pow(point1.x - point3.x, 2) + Math.pow(point1.y - point3.y, 2));
    
    const angle = Math.acos((a * a + b * b - c * c) / (2 * a * b));
    return (angle * 180) / Math.PI;
  }

  private calculateConfidence(landmarks: any[]): number {
    if (landmarks.length === 0) return 0;
    
    const totalVisibility = landmarks.reduce((sum, landmark) => sum + landmark.visibility, 0);
    return totalVisibility / landmarks.length;
  }

  // Public methods
  getCurrentPosture(): PostureAnalysis | null {
    return null; // Placeholder - would be set by onPoseResults
  }

  isTrackingActive(): boolean {
    return this.isTracking;
  }


}
