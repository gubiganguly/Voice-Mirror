"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Settings, HelpCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
}

export function AudioRecorder({ onRecordingComplete, onRecordingStart }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lastRecordingDuration, setLastRecordingDuration] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  // Update timer while recording
  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      
      const updateTimer = () => {
        const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsedSeconds);
      };
      
      // Update immediately and then every second
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    // Reset timer when starting a new recording
    setRecordingDuration(0);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Create a blob with proper MIME type for better browser compatibility
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm' // Change from 'audio/wav' to 'audio/webm'
        });
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob);
        }
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      if (onRecordingStart) {
        onRecordingStart();
      }
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Calculate the exact duration at stop time
      const exactDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setLastRecordingDuration(exactDuration);
      
      // Store the duration in sessionStorage for app/page.tsx to access
      sessionStorage.setItem("lastRecordingDuration", exactDuration.toString());
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          size="lg"
          className={cn(
            "rounded-full w-16 h-16 transition-all duration-300 shadow-lg",
            isRecording 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-primary hover:bg-primary/90"
          )}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? (
            <Square className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
        
        <div className="absolute -bottom-8 font-mono text-sm">
          {isRecording 
            ? formatTime(recordingDuration) 
            : lastRecordingDuration !== null 
              ? formatTime(lastRecordingDuration)
              : "00:00"
          }
        </div>
      </div>
      
      {isRecording && (
        <div className="text-sm text-muted-foreground mt-8">
          Recording in progress...
        </div>
      )}
    </div>
  );
} 