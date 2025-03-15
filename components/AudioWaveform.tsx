"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  isRecording: boolean;
  audioStream?: MediaStream;
  className?: string;
}

export function AudioWaveform({ isRecording, audioStream, className }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [theme, setTheme] = useState<"gradient" | "pulse" | "rainbow">("gradient");

  // Cycle through themes every 10 seconds when recording
  useEffect(() => {
    if (isRecording) {
      const themes: Array<"gradient" | "pulse" | "rainbow"> = ["gradient", "pulse", "rainbow"];
      let index = 0;
      
      const interval = setInterval(() => {
        index = (index + 1) % themes.length;
        setTheme(themes[index]);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    
    const setupAudioAnalyser = async () => {
      if (!audioStream) return;
      
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512; // Increased for more detailed waveform
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyser);
        
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        
        if (isRecording) {
          startVisualizer();
        }
      } catch (error) {
        console.error("Error setting up audio analyser:", error);
      }
    };
    
    if (isRecording && audioStream) {
      setupAudioAnalyser();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [isRecording, audioStream]);

  useEffect(() => {
    if (isRecording) {
      startVisualizer();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      clearCanvas();
    }
  }, [isRecording, theme]);

  const getGradientColors = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#4f46e5'); // indigo-600
    gradient.addColorStop(0.5, '#8b5cf6'); // violet-500
    gradient.addColorStop(1, '#ec4899'); // pink-500
    return gradient;
  };

  const getPulseColors = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
    // Pulse between two colors based on time
    const intensity = (Math.sin(time * 0.003) + 1) / 2; // 0 to 1
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, `rgba(79, 70, 229, ${0.5 + intensity * 0.5})`); // indigo with varying opacity
    gradient.addColorStop(1, `rgba(236, 72, 153, ${0.5 + (1-intensity) * 0.5})`); // pink with inverse opacity
    return gradient;
  };

  const getRainbowColors = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
    // Shifting rainbow colors
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    const hueOffset = (time * 0.05) % 360;
    
    for (let i = 0; i <= 1; i += 0.2) {
      const hue = (hueOffset + i * 360) % 360;
      gradient.addColorStop(i, `hsl(${hue}, 80%, 60%)`);
    }
    
    return gradient;
  };

  const startVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) {
      // If we don't have real audio data, simulate a waveform
      simulateWaveform();
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    
    let time = 0;
    
    const draw = () => {
      if (!isRecording) return;
      
      time += 1;
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteTimeDomainData(dataArray);
      
      // Clear with a semi-transparent white for trail effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set line style based on theme
      ctx.lineWidth = 2;
      
      if (theme === "gradient") {
        ctx.strokeStyle = getGradientColors(ctx, canvas);
      } else if (theme === "pulse") {
        ctx.strokeStyle = getPulseColors(ctx, canvas, time);
      } else if (theme === "rainbow") {
        ctx.strokeStyle = getRainbowColors(ctx, canvas, time);
      }
      
      ctx.beginPath();
      
      const sliceWidth = canvas.width / dataArray.length;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (canvas.height / 2);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      // Add a glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = theme === "rainbow" 
        ? `hsl(${(time * 0.05) % 360}, 80%, 60%)` 
        : "#8b5cf6";
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      // Reset shadow for next frame
      ctx.shadowBlur = 0;
    };
    
    draw();
  };

  const simulateWaveform = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let phase = 0;
    let time = 0;
    
    const draw = () => {
      if (!isRecording) return;
      
      time += 1;
      animationRef.current = requestAnimationFrame(draw);
      
      // Clear with a semi-transparent white for trail effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set line style based on theme
      ctx.lineWidth = 2;
      
      if (theme === "gradient") {
        ctx.strokeStyle = getGradientColors(ctx, canvas);
      } else if (theme === "pulse") {
        ctx.strokeStyle = getPulseColors(ctx, canvas, time);
      } else if (theme === "rainbow") {
        ctx.strokeStyle = getRainbowColors(ctx, canvas, time);
      }
      
      ctx.beginPath();
      
      const centerY = canvas.height / 2;
      const amplitude = centerY * 0.5;
      
      let x = 0;
      const sliceWidth = canvas.width / 200; // More points for smoother curve
      
      for (let i = 0; i < 200; i++) {
        // Create a more complex waveform with multiple frequencies
        const y = centerY + 
                 Math.sin(i * 0.03 + phase) * amplitude * 0.5 + 
                 Math.sin(i * 0.07 + phase * 1.3) * amplitude * 0.3 +
                 Math.sin(i * 0.11 + phase * 0.7) * amplitude * 0.2 +
                 (Math.random() * 2 - 1) * amplitude * 0.05; // Reduced noise for smoother look
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      // Add a glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = theme === "rainbow" 
        ? `hsl(${(time * 0.05) % 360}, 80%, 60%)` 
        : "#8b5cf6";
      
      ctx.stroke();
      
      // Reset shadow for next frame
      ctx.shadowBlur = 0;
      
      phase += 0.03;
    };
    
    draw();
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a stylish flat line in the middle when not recording
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.3)'); // indigo with opacity
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0.3)'); // pink with opacity
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    
    // Add a subtle glow
    ctx.shadowBlur = 5;
    ctx.shadowColor = "rgba(139, 92, 246, 0.3)"; // violet with opacity
    
    ctx.stroke();
    
    // Add some decorative dots
    ctx.fillStyle = gradient;
    for (let i = 0; i < canvas.width; i += canvas.width / 20) {
      ctx.beginPath();
      ctx.arc(i, canvas.height / 2, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  useEffect(() => {
    if (!isRecording) {
      clearCanvas();
    }
  }, [isRecording]);

  // Initialize canvas with white background on mount
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        clearCanvas();
      }
    }
  }, []);

  return (
    <div className={cn(
      "w-full h-32 rounded-lg overflow-hidden transition-all duration-300",
      isRecording ? "bg-white/90 dark:bg-white/10" : "bg-white/80 dark:bg-white/5",
      className
    )}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        width={1000} // Higher resolution for smoother lines
        height={200}
      />
      {isRecording && (
        <div className="flex justify-center mt-2">
          <div className="flex gap-2">
            {["gradient", "pulse", "rainbow"].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t as "gradient" | "pulse" | "rainbow")}
                className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  theme === t ? "scale-125 opacity-100" : "opacity-50"
                )}
                style={{
                  background: t === "gradient" 
                    ? "linear-gradient(to right, #4f46e5, #ec4899)" 
                    : t === "pulse" 
                      ? "linear-gradient(to right, #4f46e5, #8b5cf6)" 
                      : "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)"
                }}
                aria-label={`Switch to ${t} theme`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 