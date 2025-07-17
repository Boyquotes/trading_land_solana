import { useState, useEffect } from 'react';
import { Maximize } from 'lucide-react';

interface AudioControlsProps {
  gameInstance: any;
}

export function AudioControls({ gameInstance }: AudioControlsProps) {
  // Mute state for sound
  const [isMuted, setIsMuted] = useState(false);

  // Sync mute state with MeshSystem
  useEffect(() => {
    if (gameInstance?.audioManager) {
      // Initial sync with game state
      setIsMuted(gameInstance.audioManager.isMuted);
      
      // Set up listener for mute state changes
      const handleMuteChange = (isMuted: boolean) => {
        setIsMuted(isMuted);
      };
      
      gameInstance.audioManager.onMuteChanged = handleMuteChange;
      
      return () => {
        // Clean up listener
        gameInstance.audioManager.onMuteChanged = null;
      };
    }
  }, [gameInstance]);

  const handleMuteClick = () => {
    if (gameInstance?.audioManager) {
      gameInstance.audioManager.mute();
      setIsMuted(true);
      
      // Show notification (if needed)
      console.log('Audio muted');
    }
  };

  const handleUnmuteClick = () => {
    if (gameInstance?.audioManager) {
      gameInstance.audioManager.unmute();
      setIsMuted(false);
      
      // Show notification (if needed)
      console.log('Audio unmuted');
    }
  };

  const handleFullscreenClick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 flex space-x-2 pointer-events-auto">
      {isMuted ? (
        <button
          onClick={handleUnmuteClick}
          className="bg-gray-800 bg-opacity-50 hover:bg-opacity-70 p-2 rounded-full transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        </button>
      ) : (
        <button
          onClick={handleMuteClick}
          className="bg-gray-800 bg-opacity-50 hover:bg-opacity-70 p-2 rounded-full transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      )}
      
      <div className="flex lg:hidden">
        <button 
          onClick={handleFullscreenClick} 
          className="bg-gray-800 bg-opacity-50 hover:bg-opacity-70 p-2 rounded-full transition-all duration-200"
        >
          <Maximize className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
