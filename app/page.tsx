"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioWaveform } from "@/components/AudioWaveform";
import { TranscriptionDisplay } from "@/components/TranscriptionDisplay";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Mic, Wand2, PlayCircle, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Settings } from "@/components/Settings";
import { VoiceSettingsProvider, useVoiceSettings } from "@/contexts/VoiceSettingsContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Create a custom hook for the welcome info
export function useWelcomeInfo() {
  // Start with modal closed (false) to avoid hydration issues
  const [showWelcomeInfo, setShowWelcomeInfo] = useState(false);
  
  // Force the modal to open on component mount
  useEffect(() => {
    // Force modal to show on every page load/refresh
    setShowWelcomeInfo(true);
  }, []);
  
  const openWelcomeInfo = useCallback(() => {
    setShowWelcomeInfo(true);
  }, []);
  
  const closeWelcomeInfo = useCallback(() => {
    setShowWelcomeInfo(false);
  }, []);
  
  return {
    showWelcomeInfo,
    setShowWelcomeInfo,
    openWelcomeInfo,
    closeWelcomeInfo
  };
}

export default function Home() {
  return (
    <VoiceSettingsProvider>
      <HomeContent />
    </VoiceSettingsProvider>
  );
}

function HomeContent() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [transcribedText, setTranscribedText] = useState("");
  const [audioStream, setAudioStream] = useState<MediaStream | undefined>(undefined);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [generatingModel, setGeneratingModel] = useState(false);
  const [modelGenerated, setModelGenerated] = useState(false);
  const [modelId, setModelId] = useState<string | null>(null);
  const [audioBlobData, setAudioBlobData] = useState<Blob | null>(null);
  const [mirroredAudioUrl, setMirroredAudioUrl] = useState<string | null>(null);
  const [generatingTts, setGeneratingTts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { voiceModel, promptProcessing, getActiveModelId, isPresetModelAvailable } = useVoiceSettings();
  
  // Welcome modal state
  const { showWelcomeInfo, setShowWelcomeInfo, closeWelcomeInfo } = useWelcomeInfo();

  const handleRecordingStart = async () => {
    setIsRecording(true);
    setTranscribedText("");
    // Reset TTS related states when starting a new recording
    setModelGenerated(false);
    setModelId(null);
    setMirroredAudioUrl(null);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setError("Could not access microphone. Please check your permissions.");
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsRecording(false);
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    setAudioBlobData(audioBlob);
    setCurrentStep(2); // Move to next step automatically
    
    // Start transcription process
    setIsTranscribing(true);
    
    try {
      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Send the audio to our API endpoint
      const response = await fetch('/api/whisper', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTranscribedText(data.text);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setTranscribedText('Error transcribing audio. Please try again.');
      setError('Transcription failed. Please try recording again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleGenerateModel = async () => {
    if (!audioBlobData) {
      setError("No audio recording found. Please record audio first.");
      return;
    }
    
    console.log('==== GENERATE MODEL DEBUGGING ====');
    console.log('1. Starting voice model generation');
    
    setGeneratingModel(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlobData, 'recording.webm');
      
      // If we have transcription, include it for better results
      if (transcribedText) {
        console.log('2. Including transcription, length:', transcribedText.length);
        formData.append('transcription', transcribedText);
      }
      
      console.log('3. Making request to /api/voice-model endpoint');
      const response = await fetch('/api/voice-model', {
        method: 'POST',
        body: formData,
      });
      
      console.log('4. Voice model API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create voice model');
      }
      
      const data = await response.json();
      console.log('5. Voice model created successfully:', data);
      
      if (data.modelId) {
        console.log('6. Setting model ID:', data.modelId);
        setModelId(data.modelId);
        setModelGenerated(true);
        setCurrentStep(3);
      } else {
        console.error('6. Error: Still no model ID in response:', data);
        throw new Error('Could not determine model ID from API response');
      }
    } catch (error) {
      console.error('Error generating voice model:', error);
      
      let errorMessage = 'Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      setError(`Failed to generate voice model: ${errorMessage}`);
    } finally {
      setGeneratingModel(false);
    }
  };

  const generateTTS = async () => {
    console.log('==== GENERATE TTS DEBUGGING ====');
    
    // Get the active model ID based on the selected voice type
    const activeModelId = getActiveModelId(modelId);
    console.log('1. Current voice model setting:', voiceModel);
    console.log('1a. Active model ID:', activeModelId);
    
    if (!activeModelId) {
      console.error('Error: No model ID available');
      setError(voiceModel === "cloned" 
        ? 'Voice model is missing. Please generate a voice model first.' 
        : 'Could not load the selected voice model. Please try a different one.');
      return;
    }
    
    if (!transcribedText) {
      console.error('Error: No transcription available');
      setError('Transcription is missing.');
      return;
    }
    
    console.log('2. Starting TTS generation');
    console.log('3. Text length:', transcribedText.length);
    console.log('4. Prompt processing setting:', promptProcessing ? 'ENABLED' : 'DISABLED');
    
    setGeneratingTts(true);
    setError(null);
    
    try {
      // Only process if prompt processing is enabled
      let textToProcess = transcribedText;
      
      if (promptProcessing === true) {
        console.log('5. APPLYING prompt processing with GPT-4o');
        try {
          const processResponse = await fetch('/api/process-transcript', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: transcribedText }),
          });
          
          if (!processResponse.ok) {
            console.warn('Warning: Transcript processing failed, using original text');
          } else {
            const processData = await processResponse.json();
            textToProcess = processData.processedText;
            console.log('6. Processing complete. Original length:', processData.originalLength, 
                        'Processed length:', processData.processedLength);
          }
        } catch (processError) {
          console.error('Error during transcript processing:', processError);
          console.warn('Using original text due to processing error');
        }
      } else {
        console.log('5. SKIPPING prompt processing, using original text');
      }
      
      console.log('7. Making request to /api/text-to-speech endpoint with:', 
                  promptProcessing ? 'processed text' : 'original text');
      const requestStart = Date.now();
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToProcess,
          modelId: activeModelId,
        }),
      });
      const requestDuration = Date.now() - requestStart;
      console.log(`8. Received response in ${requestDuration}ms with status:`, response.status);
      console.log('9. Response headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()])));
      
      if (!response.ok) {
        let errorMessage = 'Failed to generate speech';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('10. Error response (JSON):', errorData);
        } catch (e) {
          const errorText = await response.text();
          console.error('10. Error response (Text):', errorText);
        }
        throw new Error(errorMessage);
      }
      
      // Try to determine content type from headers
      const contentType = response.headers.get('content-type');
      console.log('11. Response content type:', contentType);
      
      // Get the audio data as a blob
      console.log('12. Extracting blob from response');
      const audioBlob = await response.blob();
      console.log('13. Created blob:', {
        type: audioBlob.type,
        size: audioBlob.size,
        hasData: audioBlob.size > 0
      });
      
      // Make sure the blob has a correct MIME type for audio
      let finalBlob = audioBlob;
      if (!audioBlob.type || !audioBlob.type.includes('audio/')) {
        console.log('14. Blob has incorrect MIME type, creating new blob with audio/mpeg type');
        finalBlob = new Blob([await audioBlob.arrayBuffer()], { type: 'audio/mpeg' });
      }
      
      // Revoke previous URL to avoid memory leaks
      if (mirroredAudioUrl) {
        console.log('15. Revoking previous audio URL:', mirroredAudioUrl);
        URL.revokeObjectURL(mirroredAudioUrl);
      }
      
      // Create and store the new URL
      const url = URL.createObjectURL(finalBlob);
      console.log('16. Created new audio URL:', url);
      setMirroredAudioUrl(url);
      
      // Verify the URL works by testing with a fetch
      try {
        console.log('17. Verifying blob URL with fetch');
        const testFetch = await fetch(url);
        console.log('18. Blob URL fetch status:', testFetch.status);
        console.log('19. Blob URL content-type:', testFetch.headers.get('content-type'));
      } catch (e) {
        console.error('Failed to verify blob URL:', e);
      }
      
    } catch (error) {
      console.error('Error generating TTS:', error);
      
      let errorMessage = 'Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      setError(`Failed to generate text-to-speech: ${errorMessage}`);
    } finally {
      setGeneratingTts(false);
    }
  };

  // Simple text cleanup function (placeholder - would be more sophisticated in reality)
  const cleanupText = (text: string): string => {
    // Replace common filler words and clean up stutters
    return text
      .replace(/\b(um|uh|er|ah|like|you know|I mean)\b/gi, '')
      .replace(/(\w+)-\1+/g, '$1')  // Reduces stuttering repetitions
      .replace(/\s{2,}/g, ' ')      // Remove multiple spaces
      .trim();
  };

  // You might want to show the selected voice model in the UI
  const getVoiceModelName = () => {
    switch(voiceModel) {
      case "male": return "Male Voice";
      case "female": return "Female Voice";
      default: return "Your Voice (Cloned)";
    }
  };

  // Update the TabsWithConsistentUI component to restore the mirrored voice functionality
  const TabsWithConsistentUI = () => {
    const [activeTab, setActiveTab] = useState("original");
    
    const handleLocalTabChange = async (value: string) => {
      console.log('Tab changed to:', value);
      setActiveTab(value);
      
      if (value === 'mirrored') {
        console.log('Mirrored tab selected. Model ID:', modelId, 'Has transcription:', !!transcribedText);
        console.log('Existing mirrored URL:', mirroredAudioUrl, 'Generating TTS:', generatingTts);
        
        // Auto-generate TTS when switching to mirrored tab if needed
        if (modelId && transcribedText && !mirroredAudioUrl && !generatingTts) {
          console.log('Triggering TTS generation...');
          await generateTTS();
        }
      }
    };

    return (
      <Tabs 
        defaultValue="original" 
        className="w-full"
        onValueChange={handleLocalTabChange}
      >
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="original">
            <PlayCircle className="mr-2 h-4 w-4" />
            Original Voice
          </TabsTrigger>
          <TabsTrigger value="mirrored" disabled={!modelGenerated}>
            <FileText className="mr-2 h-4 w-4" />
            Mirrored Voice
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="original" className="mt-4">
          <AudioPlayer 
            audioUrl={audioUrl}
            title="Original Recording"
            key={`original-${audioUrl}`}
          />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Your original voice recording
          </p>
        </TabsContent>
        
        <TabsContent value="mirrored" className="mt-4">
          <AudioPlayer 
            audioUrl={mirroredAudioUrl}
            title={`AI Voice Playback (${getVoiceModelName().toLowerCase()})`}
            isLoading={generatingTts}
            key={`mirrored-${mirroredAudioUrl}`}
          />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Text-to-speech using {getVoiceModelName().toLowerCase()}
            {promptProcessing && mirroredAudioUrl && (
              <span className="text-primary ml-1">• Enhanced clarity</span>
            )}
          </p>
          
          {!generatingTts && !mirroredAudioUrl && (
            <div className="mt-2">
              <Button 
                variant="outline"
                size="sm"
                className="w-full"
                onClick={generateTTS}
                disabled={(voiceModel === "cloned" && !modelGenerated) || 
                        (voiceModel !== "cloned" && !isPresetModelAvailable(voiceModel))}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate TTS
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between">
          <AppHeader />
          <Settings />
        </div>
        
        <main className="flex-1 py-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-6">
            {/* Step 1: Record */}
            <Card className={cn(
              "transition-all duration-300",
              currentStep === 1 ? "ring-2 ring-primary/20" : ""
            )}>
              <CardContent className="py-4 px-5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium">1</div>
                  <span>Record your audio</span>
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex flex-col items-center justify-center">
                    <AudioRecorder 
                      onRecordingStart={handleRecordingStart}
                      onRecordingComplete={handleRecordingComplete}
                    />
                  </div>
                  
                  <div className="w-full mt-2 md:mt-0">
                    <AudioWaveform 
                      isRecording={isRecording}
                      audioStream={audioStream}
                      className="h-24 md:h-28 shadow-sm rounded-md overflow-hidden"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Generate Voice Model */}
            <Card className={cn(
              "transition-all duration-300",
              currentStep === 2 ? "ring-2 ring-primary/20" : "",
              !audioUrl ? "opacity-50 pointer-events-none" : ""
            )}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium">2</div>
                    <span>Generate your voice model</span>
                  </h3>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="relative overflow-hidden group whitespace-nowrap"
                    disabled={!audioUrl || generatingModel || modelGenerated}
                    onClick={handleGenerateModel}
                  >
                    {generatingModel ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : modelGenerated ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Model generated
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
                        Generate Voice Model
                      </>
                    )}
                    {generatingModel && (
                      <div className="absolute bottom-0 left-0 h-1 bg-primary-foreground/30 w-full">
                        <div className="h-full bg-primary-foreground animate-progress"></div>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Playback */}
            <Card className={cn(
              "transition-all duration-300",
              currentStep === 3 ? "ring-2 ring-primary/20" : "",
              !audioUrl ? "opacity-50 pointer-events-none" : ""
            )}>
              <CardContent className="py-4 px-5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium">3</div>
                  <span>Playback your audio</span>
                </h3>
                <TabsWithConsistentUI />
              </CardContent>
            </Card>

            {/* Step 4: View Transcription */}
            <Card className={cn(
              "transition-all duration-300",
              currentStep === 4 ? "ring-2 ring-primary/20" : "",
              !audioUrl ? "opacity-50 pointer-events-none" : ""
            )}>
              <CardContent className="py-4 px-5">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium">4</div>
                  <span>View transcription</span>
                </h3>
                <TranscriptionDisplay 
                  isTranscribing={isTranscribing} 
                  isRecording={isRecording}
                  text={transcribedText}
                  className="min-h-[100px] max-h-[200px] overflow-y-auto"
                />
              </CardContent>
            </Card>
          </div>
        </main>
        
        <footer className="py-4 text-center text-sm text-muted-foreground">
          <p>Voice Mirroring Project &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>

      {/* Welcome Info Modal */}
      <Dialog open={showWelcomeInfo} onOpenChange={setShowWelcomeInfo}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
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
              onClick={closeWelcomeInfo} 
              className="w-full transition-all duration-300 hover:scale-105"
            >
              Get Started
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

