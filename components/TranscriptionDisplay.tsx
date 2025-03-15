"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TranscriptionDisplayProps {
  isTranscribing: boolean;
  text: string;
  isRecording?: boolean;
  className?: string;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  isTranscribing,
  text,
  isRecording = false,
  className
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        {isRecording && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <Mic className="h-10 w-10 text-primary mb-3" />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 animate-pulse" />
              <div className="absolute inset-0 rounded-full animate-ping-slow border-2 border-primary opacity-20" />
            </div>
            <p className="text-muted-foreground mt-3 text-center font-medium">
              Transcribing your voice{dots}
            </p>
            <div className="mt-4 flex space-x-1 justify-center">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-primary/60 w-1.5 rounded-full animate-sound-wave" 
                  style={{
                    height: `${Math.random() * 2 + 1}rem`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {!isRecording && isTranscribing && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">Transcribing your audio...</p>
          </div>
        )}
        {!isRecording && !isTranscribing && text ? (
          <div className="py-2">
            <p className="text-base leading-relaxed">{text}</p>
          </div>
        ) : (!isRecording && !isTranscribing && !text) && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Record audio to see transcription here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 