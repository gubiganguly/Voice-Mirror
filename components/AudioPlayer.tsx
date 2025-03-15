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
  const [isFirstPlay, setIsFirstPlay] = useState(true);
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

  // Update the time tracking mechanism in the AudioPlayer component
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const updateTime = () => {
        if (audioRef.current) {
          const newTime = audioRef.current.currentTime;
          setCurrentTime(newTime);
          
          // If duration becomes available during playback, update it
          if (!isLoaded && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
            setDuration(audioRef.current.duration);
            setIsLoaded(true);
          }
        }
      };
      
      // Run immediately once to ensure we don't wait for the first interval
      updateTime();
      
      // Use a more frequent update interval for smoother progress
      const timeInterval = setInterval(updateTime, 50);
      intervalRef.current = timeInterval;
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isPlaying, isLoaded]);

  // Add a more robust timeupdate event handler
  useEffect(() => {
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      if (audio) {
        const newTime = audio.currentTime;
        // Only update if it's a valid number
        if (isFinite(newTime) && !isNaN(newTime)) {
          setCurrentTime(newTime);
        }
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      
      // Make sure we clear any active intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (audio) {
      // Remove any existing listeners first to avoid duplicates
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      
      // Add new listeners
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      }
      
      // Also ensure we clear intervals on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [audioRef.current]); // Only re-attach when the audio element changes

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
    
    // Events
    if (audio) {
      audio.addEventListener('loadedmetadata', handleLoadMetadata);
      audio.addEventListener('canplay', handleCanPlay);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('loadedmetadata', handleLoadMetadata);
        audio.removeEventListener('canplay', handleCanPlay);
      }
    };
  }, [audioUrl, isLoaded]);

  // Add this to ensure duration is properly loaded on first play
  useEffect(() => {
    // This function will force a duration check
    const forceDurationCheck = () => {
      const audio = audioRef.current;
      if (audio && audioUrl) {
        // Try to get duration more aggressively
        if (!isNaN(audio.duration) && audio.duration > 0) {
          console.log("Duration check - valid duration:", audio.duration);
          setDuration(audio.duration);
          setIsLoaded(true);
        } else {
          console.log("Duration check - still invalid:", audio.duration);
          
          // If audio is already loaded but duration is invalid, try to load again
          if (audio.readyState >= 2) {
            console.log("Audio is loaded but duration invalid, trying to reload");
            // Sometimes reloading helps establish duration
            audio.load();
          }
        }
      }
    };
    
    // Run initial check
    forceDurationCheck();
    
    // Also run it after a short delay, which sometimes helps capture duration
    const durationCheckTimeout = setTimeout(forceDurationCheck, 500);
    
    return () => clearTimeout(durationCheckTimeout);
  }, [audioUrl, isLoaded]);

  // Reset first play state when audio URL changes
  useEffect(() => {
    setIsFirstPlay(true);
  }, [audioUrl]);

  // Add this specialized effect that ensures perfect sync between audio time and slider
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    
    // Create a function to forcibly synchronize the slider with audio playback
    const syncTimeWithPlayback = () => {
      const audio = audioRef.current;
      if (!audio) return;
      
      // Force a duration update if it's not correct
      if (duration !== audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setIsLoaded(true);
        console.log("Forced duration update:", audio.duration);
      }
      
      // This is the critical part - directly update currentTime from the audio element
      // ONLY when the audio is actually playing
      if (!audio.paused && isFinite(audio.currentTime) && !isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };
    
    // Use a high-precision, frequent update interval for smoother progress
    // This is especially important for the first play
    const preciseInterval = setInterval(syncTimeWithPlayback, 16); // ~60fps for smooth updates
    
    // For the first play, we'll use a more frequent update to ensure it's in sync
    if (isFirstPlay && isPlaying) {
      // Adjust the duration one more time right after playback starts
      setTimeout(() => {
        const audio = audioRef.current;
        if (audio && !isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
          console.log("First play duration check:", audio.duration);
        }
      }, 100);
    }
    
    return () => {
      clearInterval(preciseInterval);
    };
  }, [audioUrl, isPlaying, isFirstPlay, duration]);

  // Update the play function to ensure we have valid duration before playing
  const togglePlayPause = () => {
    const audio = audioRef.current;
    
    if (!audio || !audioUrl) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Make sure we have an accurate duration before playing
      if (!isNaN(audio.duration) && audio.duration > 0 && audio.duration !== duration) {
        setDuration(audio.duration);
        setIsLoaded(true);
      }
      
      // Use a more reliable play method that overcomes browser autoplay policies
      const safePlay = async () => {
        try {
          await audio.play();
          setIsPlaying(true);
          setIsFirstPlay(false);
        } catch (err) {
          console.error("Error playing audio:", err);
        }
      };
      
      safePlay();
    }
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
    
    if (!audio || !audioUrl) return;
    
    // Make sure we have a valid number
    const newTime = value[0];
    if (!isFinite(newTime) || isNaN(newTime)) {
      console.error('Invalid slider value:', newTime);
      return;
    }
    
    // Ensure the time is within valid range
    const safeTime = Math.max(0, Math.min(newTime, audio.duration || 0));
    audio.currentTime = safeTime;
    setCurrentTime(safeTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    const newVolume = value[0];
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  // Update the formatTime function to be even more robust
  const formatTime = (time: number) => {
    // Make sure we have a valid time
    if (isNaN(time) || !isFinite(time) || time < 0) return "00:00";
    
    // Ensure we don't exceed the actual duration to avoid UI inconsistencies
    if (duration > 0 && time > duration) {
      time = duration;
    }
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update the maxDuration calculation to ensure it's always a valid number
  const ensureFiniteNumber = (value: number, fallback: number = 0): number => {
    return isFinite(value) && !isNaN(value) ? value : fallback;
  };

  // Use a fallback value for duration
  const validDuration = ensureFiniteNumber(duration, 100);

  // Update the maxDuration calculation
  const maxDuration = isLoaded && validDuration > 0 ? validDuration : 100;

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

  return (
    <div className={cn("p-4 rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      <div className="mb-3 font-medium flex items-center justify-between">
        <span>{title}</span>
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[ensureFiniteNumber(volume, 1)]}
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
            value={[ensureFiniteNumber(currentTime, 0)]}
            max={maxDuration}
            step={0.1}
            onValueChange={handleSliderChange}
            disabled={!audioUrl}
            className="cursor-pointer"
          />
        </div>
        
        <div className="text-xs font-mono">
          {formatTime(ensureFiniteNumber(currentTime))} / {formatTime(ensureFiniteNumber(duration))}
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
    </div>
  );
} 