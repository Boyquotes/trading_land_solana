/**
 * AudioManager class for handling game audio
 * Manages sound effects and mute state
 */
export class AudioManager {
  private static instance: AudioManager;
  isMuted: boolean = false;
  onMuteChanged: ((isMuted: boolean) => void) | null = null;
  
  // Cache for loaded audio elements
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  private constructor() {
    // Check if there's a saved mute preference
    const savedMuteState = localStorage.getItem('audioMuted');
    if (savedMuteState) {
      this.isMuted = savedMuteState === 'true';
    }
    
    console.log('[AudioManager] Initialized with mute state:', this.isMuted);
  }

  /**
   * Get the singleton instance of AudioManager
   */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Play a sound effect
   * @param soundPath Path to the sound file
   * @param volume Volume level (0.0 to 1.0)
   * @param loop Whether the sound should loop
   * @returns The audio element that was created or retrieved from cache
   */
  playSound(soundPath: string, volume: number = 1.0, loop: boolean = false): HTMLAudioElement | null {
    if (this.isMuted) {
      console.log('[AudioManager] Sound muted:', soundPath);
      return null;
    }

    try {
      // Check if we have this audio in cache
      let audio = this.audioCache.get(soundPath);
      
      if (!audio) {
        // Create and cache a new audio element
        audio = new Audio(soundPath);
        this.audioCache.set(soundPath, audio);
      } else {
        // Reset the audio if it exists
        audio.currentTime = 0;
      }
      
      // Configure and play
      audio.volume = volume;
      audio.loop = loop;
      
      // Play the sound
      const playPromise = audio.play();
      
      // Handle play promise to catch any errors
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('[AudioManager] Error playing sound:', error);
        });
      }
      
      console.log('[AudioManager] Playing sound:', soundPath);
      return audio;
    } catch (error) {
      console.error('[AudioManager] Failed to play sound:', soundPath, error);
      return null;
    }
  }

  /**
   * Stop a specific sound
   * @param soundPath Path to the sound file to stop
   */
  stopSound(soundPath: string): void {
    const audio = this.audioCache.get(soundPath);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * Stop all sounds
   */
  stopAllSounds(): void {
    this.audioCache.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  /**
   * Mute all audio
   */
  mute(): void {
    this.isMuted = true;
    this.stopAllSounds();
    localStorage.setItem('audioMuted', 'true');
    
    // Notify listeners
    if (this.onMuteChanged) {
      this.onMuteChanged(true);
    }
  }

  /**
   * Unmute all audio
   */
  unmute(): void {
    this.isMuted = false;
    localStorage.setItem('audioMuted', 'false');
    
    // Notify listeners
    if (this.onMuteChanged) {
      this.onMuteChanged(false);
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute(): void {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }
}
