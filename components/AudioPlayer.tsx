"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Volume2, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl?: string | null;
  title: string;
  className?: string;
  isLoading?: boolean;
}

export function AudioPlayer({ audioUrl, title, className, isLoading = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset player state when audio URL changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setIsLoaded(false);
      setDuration(0); // Reset duration
      
      if (audioUrl) {
        console.log('==== AUDIO PLAYER DEBUGGING ====');
        console.log('1. Loading audio URL:', audioUrl);
        const audioElement = audioRef.current;
        
        // Add event listeners before setting the source
        const errorHandler = (e: ErrorEvent) => {
          console.error('2. Audio element error:', e.message);
        };
        
        const loadStartHandler = () => {
          console.log('2. Audio loading started');
        };
        
        const loadedDataHandler = () => {
          console.log('3. Audio data loaded');
        };
        
        const canPlayHandler = () => {
          console.log('4. Audio can play, duration:', audioElement.duration);
          if (!isNaN(audioElement.duration) && audioElement.duration > 0) {
            setDuration(audioElement.duration);
            setIsLoaded(true);
          } else {
            console.warn('4a. Audio duration is invalid:', audioElement.duration);
          }
        };
        
        audioElement.addEventListener('error', errorHandler as any);
        audioElement.addEventListener('loadstart', loadStartHandler);
        audioElement.addEventListener('loadeddata', loadedDataHandler);
        audioElement.addEventListener('canplay', canPlayHandler);
        
        // Set the source and load
        audioElement.src = audioUrl;
        audioElement.load();
        
        console.log('5. Audio element after load:', {
          src: audioElement.src,
          readyState: audioElement.readyState,
          paused: audioElement.paused,
          duration: audioElement.duration,
          hasError: audioElement.error !== null
        });
        
        return () => {
          audioElement.removeEventListener('error', errorHandler as any);
          audioElement.removeEventListener('loadstart', loadStartHandler);
          audioElement.removeEventListener('loadeddata', loadedDataHandler);
          audioElement.removeEventListener('canplay', canPlayHandler);
        };
      }
    }
  }, [audioUrl]);

  // Track playback time during play
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const updateTime = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          
          // If duration becomes available during playback, update it
          if (!isLoaded && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
            setDuration(audioRef.current.duration);
            setIsLoaded(true);
          }
        }
      };
      
      const timeInterval = setInterval(updateTime, 100);
      return () => clearInterval(timeInterval);
    }
  }, [isPlaying, isLoaded]);

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleLoadMetadata = () => {
      if (audio && !isNaN(audio.duration) && audio.duration > 0) {
        console.log("Metadata loaded, duration:", audio.duration);
        setDuration(audio.duration);
        setIsLoaded(true);
      } else if (audio) {
        console.log("Metadata loaded but duration invalid:", audio.duration);
      }
    };
    
    const handleCanPlay = () => {
      if (audio && !isNaN(audio.duration) && audio.duration > 0) {
        console.log("Can play, duration:", audio.duration);
        setDuration(audio.duration);
        setIsLoaded(true);
      }
    };
    
    const handleTimeUpdate = () => {
      if (audio) {
        setCurrentTime(audio.currentTime);
        
        // Also check duration during playback
        if (!isLoaded && !isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
          setIsLoaded(true);
        }
      }
    };

    // Events
    if (audio) {
      audio.addEventListener('loadedmetadata', handleLoadMetadata);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('durationchange', handleLoadMetadata);
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    return () => {
      if (audio) {
        audio.removeEventListener('loadedmetadata', handleLoadMetadata);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleLoadMetadata);
        audio.removeEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentTime(0);
        });
      }
    };
  }, [audioUrl, isLoaded]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    
    if (!audio || !audioUrl) {
      console.log('Cannot play: audio ref or URL missing', { audioRef: !!audio, audioUrl });
      return;
    }
    
    if (isPlaying) {
      audio.pause();
    } else {
      // Try playing with a catch for any browser autoplay policy issues
      console.log('Attempting to play audio...');
      audio.play().catch(error => {
        console.error("Error playing audio:", error);
      });
    }
    
    setIsPlaying(!isPlaying);
  };

  const resetPlayback = () => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSliderChange = (value: number[]) => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    const newTime = value[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    const newVolume = value[0];
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    // Make sure we have a valid time
    if (isNaN(time) || !isFinite(time) || time < 0) return "00:00";
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Use a calculated max duration to avoid infinity issues
  const maxDuration = isLoaded && duration > 0 ? duration : 100;

  const handleDownload = () => {
    if (!audioUrl) return;
    
    // Create an anchor element
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().getTime()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // If in loading state, show loading indicator in place of play button
  const renderPlayButton = () => {
    if (isLoading) {
      return (
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 rounded-full"
          disabled
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      );
    }
    
    return (
      <Button 
        variant="outline" 
        size="icon" 
        className={cn(
          "h-10 w-10 rounded-full transition-colors",
          isPlaying && "bg-primary text-primary-foreground"
        )}
        onClick={togglePlayPause}
        disabled={!audioUrl}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
    );
  };

  // Add a manual play button to the mirrored voice tab for debugging
  const renderDebugButton = () => {
    if (audioUrl && !isPlaying) {
      return (
        <div className="mt-2">
          <Button 
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const audio = audioRef.current;
              if (audio) {
                console.log('Manual play attempt');
                console.log('Audio element state:', {
                  src: audio.src,
                  readyState: audio.readyState,
                  paused: audio.paused,
                  duration: audio.duration,
                  hasError: audio.error !== null
                });
                
                audio.play().catch(err => {
                  console.error('Manual play error:', err);
                });
              }
            }}
          >
            Debug: Force Play
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("p-4 rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      <div className="mb-3 font-medium flex items-center justify-between">
        <span>{title}</span>
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            disabled={!audioUrl}
            className="w-20"
          />
        </div>
      </div>
      
      {audioUrl ? (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          preload="metadata"
          onLoadedMetadata={() => {
            if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
              setDuration(audioRef.current.duration);
              setIsLoaded(true);
            }
          }}
        />
      ) : (
        <audio ref={audioRef} />
      )}
      
      <div className="flex items-center gap-2 mb-2">
        {renderPlayButton()}
        
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full"
          onClick={resetPlayback}
          disabled={!audioUrl || currentTime === 0}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full"
          onClick={handleDownload}
          disabled={!audioUrl}
          title="Download audio"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 mx-2">
          <Slider
            value={[currentTime]}
            max={maxDuration}
            step={0.1}
            onValueChange={handleSliderChange}
            disabled={!audioUrl}
            className="cursor-pointer"
          />
        </div>
        
        <div className="text-xs font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      
      {!audioUrl && !isLoading && (
        <div className="text-sm text-muted-foreground text-center py-2">
          No audio available
        </div>
      )}
      
      {isLoading && (
        <div className="text-sm text-muted-foreground text-center py-2">
          Generating your AI voice...
        </div>
      )}
      
      {renderDebugButton()}
    </div>
  );
} 