"use client";

import { Button } from "@/components/ui/button";
import { HelpCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useWelcomeInfo } from "@/lib/hooks/useWelcomeInfo";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export function AppHeader() {
  const [showInfo, setShowInfo] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <header className="flex justify-between items-center w-full py-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Voice Mirror
        </h1>
      </div>
      
      <div className="flex items-center mr-3" style={{ gap: '16px' }}>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                aria-label="Help"
                onClick={() => setShowHelp(true)}
                className="rounded-full h-10 w-10 border-primary/20 transition-all duration-300 hover:scale-110 hover:bg-primary/10 hover:border-primary/30"
              >
                <HelpCircle className="h-6 w-6 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-primary text-primary-foreground font-medium px-3 py-1.5">
              Help
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                aria-label="About"
                onClick={() => setShowInfo(true)}
                className="rounded-full h-10 w-10 border-primary/20 transition-all duration-300 hover:scale-110 hover:bg-primary/10 hover:border-primary/30"
              >
                <Info className="h-6 w-6 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-primary text-primary-foreground font-medium px-3 py-1.5">
              About
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Info Modal */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <div className="absolute top-4 left-4 w-16 h-16 transition-all duration-300 hover:scale-110">
            <img 
              src="/Arkenza_trademark_final.png" 
              alt="Arkenza Logo" 
              className="object-contain w-full h-full drop-shadow-sm animate-fadeIn"
            />
          </div>
          
          <DialogHeader className="mt-2 pt-4">
            <DialogTitle className="text-2xl font-bold text-primary text-center">
              Welcome to Arkenza Voice Mirror
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-muted-foreground text-base py-4">
            <p className="leading-relaxed">
              The Arkenza Voice Mirror transcribes your spoken words into text and then
              reconstructs the transcribed words into synthetic speech in a cloned voice.
            </p>
            
            <p className="leading-relaxed">
              The transcription processing is performed by AI software components that remove
              disfluencies including repeated words, repeated syllables, prolongations, blocks, and
              interruptions ('um, uh, like').
            </p>
            
            <p className="leading-relaxed">
              The transcription process will not preserve your actual wording, but it should do a
              reasonably good job at preserving the intended meaning of your speech.
            </p>
            
            <p className="leading-relaxed">
              At the present time, the Voice Mirror's transcription accuracy is not perfect. So don't use
              the Voice Mirror for high-value conversations such as legal proceedings.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowInfo(false)} 
              className="w-full transition-all duration-300 hover:scale-105"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Help Modal */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary text-center">
              How to Use Voice Mirror
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-muted-foreground text-base py-4">
            {/* Basic Usage Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-sm flex items-center justify-center mr-2">1</span>
                Getting Started
              </h3>
              <p className="leading-relaxed pl-8">
                Click <strong>Start Recording</strong> and start speaking. When you are done, click the <strong>Stop Recording</strong> button.
              </p>
            </div>
            
            {/* What You'll See/Hear */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-sm flex items-center justify-center mr-2">2</span>
                Output
              </h3>
              <ul className="pl-12 list-disc space-y-2">
                <li>A transcription of your speech</li>
                <li>Your speech re-created in a synthetic voice (initially a male voice – can be changed)</li>
              </ul>
            </div>
            
            {/* Settings Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">
                <span className="text-primary">⚙️</span> Personalization Options
              </h3>
              <div className="pl-4 space-y-4">
                <div className="border-l-2 border-primary/20 pl-4 py-1">
                  <p className="font-medium text-foreground">Select voice model</p>
                  <p className="text-sm">
                    Choose from a list of available cloned voices that will "speak" your 
                    synthesized audio.
                  </p>
                </div>
                
                <div className="border-l-2 border-primary/20 pl-4 py-1">
                  <p className="font-medium text-foreground">Audio output device</p>
                  <p className="text-sm">
                    If you select "Cable Input" then you will not hear the synthetic audio signal. 
                    Instead, the synthesized speech will be sent to a virtual speaker, which can be used as the audio 
                    input in video-conference calls.
                  </p>
                </div>
                
                <div className="border-l-2 border-primary/20 pl-4 py-1">
                  <p className="font-medium text-foreground">Apply Prompt Processing</p>
                  <p className="text-sm">
                    The initial processing of your speech removes some disfluencies.
                    If this button is clicked, a second round of processing will be applied to also remove duplicated
                    words and filler-words such as "Um, uhh, like".
                  </p>
                </div>
                
                <div className="border-l-2 border-primary/20 pl-4 py-1">
                  <p className="font-medium text-foreground">Create personalized voice model</p>
                  <p className="text-sm">
                    Optionally, you can create a voice clone that resembles your own 
                    voice as other people hear you by providing a short sample of your speech.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowHelp(false)} 
              className="w-full transition-all duration-300 hover:scale-105"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
} 