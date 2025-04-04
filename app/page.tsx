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
import { useWelcomeInfo } from "@/lib/hooks/useWelcomeInfo";
import { addSurvey } from "@/lib/firebase/surveys/surveyModel";

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
  const [audioBlobData, setAudioBlobData] = useState<Blob | null>(null);
  const [mirroredAudioUrl, setMirroredAudioUrl] = useState<string | null>(null);
  const [generatingTts, setGeneratingTts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingCount, setRecordingCount] = useState(0);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyRating, setSurveyRating] = useState<number | null>(null);
  const [surveyEaseOfUse, setSurveyEaseOfUse] = useState<number | null>(null);
  const [surveyPositiveFeedback, setSurveyPositiveFeedback] = useState("");
  const [surveyImprovementFeedback, setSurveyImprovementFeedback] = useState("");
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveyShown, setSurveyShown] = useState(false);
  const { 
    voiceModel, 
    promptProcessing, 
    getActiveModelId, 
    isPresetModelAvailable,
    clonedModels,
    selectedClonedModelId
  } = useVoiceSettings();
  
  // Welcome modal state
  const { showWelcomeInfo, setShowWelcomeInfo, closeWelcomeInfo } = useWelcomeInfo();

  // Add a reference to track the last used model
  const lastUsedModelRef = useRef<{
    voiceType: string; 
    modelId: string | null;
  }>({
    voiceType: '',
    modelId: null
  });
  
  // Store recording durations
  const recordingDurationsRef = useRef<number[]>([]);
  
  // Add effect to clear mirrored audio when voice model changes
  useEffect(() => {
    const currentModelId = getActiveModelId();
    
    // If we have a different model than last time...
    if (lastUsedModelRef.current.voiceType !== voiceModel || 
        lastUsedModelRef.current.modelId !== currentModelId) {
      
      console.log('Voice model changed:',
        `${lastUsedModelRef.current.voiceType} → ${voiceModel}`,
        `(Model ID: ${currentModelId})`
      );
      
      // Only clear if we had a previous TTS generated
      if (mirroredAudioUrl) {
        console.log('Clearing previous TTS audio due to model change');
        
        // Revoke previous URL to avoid memory leaks
        URL.revokeObjectURL(mirroredAudioUrl);
        setMirroredAudioUrl(null);
      }
    }
    
    // Update our reference with current values
    lastUsedModelRef.current = {
      voiceType: voiceModel,
      modelId: currentModelId
    };
  }, [voiceModel, selectedClonedModelId, getActiveModelId]);

  // Add this effect after the model change effect
  // Auto-generate TTS when transcription is available or model changes
  useEffect(() => {
    // If we have a transcription and no mirrored audio yet, auto-generate TTS
    if (transcribedText && !mirroredAudioUrl && !generatingTts && currentStep === 3) {
      console.log('Auto-generating TTS after changes detected');
      generateTTS();
    }
  }, [transcribedText, mirroredAudioUrl, voiceModel, selectedClonedModelId, currentStep]);

  const handleRecordingStart = async () => {
    setIsRecording(true);
    setTranscribedText("");
    // Reset TTS related states when starting a new recording
    setMirroredAudioUrl(null);
    setError(null);
    
    // Clear the previous audio URL to avoid memory leaks
    if (mirroredAudioUrl) {
      URL.revokeObjectURL(mirroredAudioUrl);
    }
    
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
    
    // Increment recording count
    const newCount = recordingCount + 1;
    setRecordingCount(newCount);
    
    // Store the recording duration if available from the lastRecordingDuration in session storage
    const lastDuration = sessionStorage.getItem("lastRecordingDuration");
    if (lastDuration) {
      const duration = parseInt(lastDuration, 10);
      recordingDurationsRef.current.push(duration);
      // Keep only the last 5 durations
      if (recordingDurationsRef.current.length > 5) {
        recordingDurationsRef.current = recordingDurationsRef.current.slice(-5);
      }
    }
    
    // Show survey only once after the 5th recording
    if (newCount === 5 && !surveyShown) {
      setShowSurveyModal(true);
      setSurveyShown(true);
    }
    
    // Move to transcription step
    setCurrentStep(2);
    
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
      
      // Move to playback step after successful transcription
      setTimeout(() => {
        setCurrentStep(3);
      }, 500);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setTranscribedText('Error transcribing audio. Please try again.');
      setError('Transcription failed. Please try recording again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateTTS = async () => {
    console.log('==== GENERATE TTS DEBUGGING ====');
    
    // Get the active model ID based on the selected voice type
    const activeModelId = getActiveModelId();
    console.log('1. Current voice model setting:', voiceModel);
    console.log('1a. Active model ID:', activeModelId);
    
    if (!activeModelId) {
      console.error('Error: No model ID available');
      setError(voiceModel === "cloned" 
        ? 'Voice model is missing. Please create a voice model in settings first.' 
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
      case "male": 
        return "Male Voice";
      case "female": 
        return "Female Voice";
      case "cloned": {
        // Find the selected model name
        const selectedModel = clonedModels.find(model => model.id === selectedClonedModelId);
        return selectedModel ? selectedModel.name : "Your Voice";
      }
      default: 
        return "Selected Voice";
    }
  };

  // Store audio blob in sessionStorage for access from Settings
  useEffect(() => {
    if (audioBlobData) {
      try {
        // Convert blob to base64 for storage
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          if (typeof base64data === 'string') {
            console.log("Storing audio in sessionStorage", { 
              size: audioBlobData.size,
              type: audioBlobData.type,
              base64Length: base64data.length
            });
            sessionStorage.setItem("lastRecordedAudio", base64data);
          }
        };
        reader.readAsDataURL(audioBlobData);
      } catch (error) {
        console.error("Error storing audio data:", error);
      }
    }
    
    // Store transcription for voice model generation
    if (transcribedText) {
      sessionStorage.setItem("lastTranscription", transcribedText);
    }
  }, [audioBlobData, transcribedText]);

  // You might also want to update the UI to show when TTS generation is available
  const isMirroredAvailable = () => {
    // TTS is available if we have a transcription and:
    // 1. For preset voices (male/female) - the preset ID is available
    // 2. For cloned voice - the selected cloned model exists
    if (!transcribedText) return false;
    
    if (voiceModel === "cloned") {
      return !!getActiveModelId();
    } else {
      return true; // Preset models are always available
    }
  };

  // Handle survey submission
  const handleSurveySubmission = async () => {
    // Make sure required fields are filled
    if (surveyRating === null || surveyEaseOfUse === null) {
      // Show error or alert that both ratings are required
      return;
    }
    
    setIsSubmittingSurvey(true);
    
    try {
      // Prepare the survey data
      const surveyData = {
        rating: surveyRating,
        easeOfUse: surveyEaseOfUse,
        positiveFeedback: surveyPositiveFeedback,
        improvementFeedback: surveyImprovementFeedback
      };
      
      // Submit to Firestore
      await addSurvey(surveyData, recordingDurationsRef.current);
      
      // Reset the survey form
      setSurveyRating(null);
      setSurveyEaseOfUse(null);
      setSurveyPositiveFeedback("");
      setSurveyImprovementFeedback("");
      recordingDurationsRef.current = [];
      
      // Show success state
      setSurveySubmitted(true);
      
      // Close the modal after a delay
      setTimeout(() => {
        setShowSurveyModal(false);
        setSurveySubmitted(false);
      }, 2000);
      
    } catch (error) {
      console.error("Error submitting survey:", error);
      // Show error message to user
    } finally {
      setIsSubmittingSurvey(false);
    }
  };

  // Update the handleSurveyCompletion function
  const handleSurveyCompletion = () => {
    setShowSurveyModal(false);
    
    // Reset survey form
    setSurveyRating(null);
    setSurveyEaseOfUse(null);
    setSurveyPositiveFeedback("");
    setSurveyImprovementFeedback("");
  };

  // Add a function to open the survey manually
  const openSurvey = () => {
    setShowSurveyModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between">
          <AppHeader />
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openSurvey} 
              className="flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              Feedback
            </Button>
            <Settings />
          </div>
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
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium">1</div>
                    <span>Record your audio</span>
                  </h3>
                  
                  {/* Recording counter indicator */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      Total Recordings: <span className="font-medium text-primary">{recordingCount}</span>
                    </div>
                  </div>
                </div>
                
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

            {/* Step 2: View Transcription */}
            <Card className={cn(
              "transition-all duration-300",
              currentStep === 2 ? "ring-2 ring-primary/20" : "",
              !audioUrl ? "opacity-50 pointer-events-none" : ""
            )}>
              <CardContent className="py-4 px-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium">2</div>
                    <span>View transcription</span>
                  </h3>
                  
                  {/* Download Transcript Button */}
                  {transcribedText && !isTranscribing && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Create a blob with the transcribed text
                        const blob = new Blob([transcribedText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        
                        // Create a temporary link and trigger download
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `transcript-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
                        document.body.appendChild(link);
                        link.click();
                        
                        // Clean up
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                      className="text-xs flex items-center gap-1 transition-all hover:scale-105"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Download
                    </Button>
                  )}
                </div>
                
                <TranscriptionDisplay 
                  isTranscribing={isTranscribing} 
                  isRecording={isRecording}
                  text={transcribedText}
                  className="min-h-[100px] max-h-[200px] overflow-y-auto"
                />
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Voice Player */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2 text-sm">
                      <PlayCircle className="h-4 w-4" />
                      Original Voice
                    </h4>
                    <AudioPlayer 
                      audioUrl={audioUrl}
                      title="Original Recording"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Your original voice recording
                    </p>
                  </div>
                  
                  {/* Mirrored Voice Player */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" />
                      Mirrored Voice
                    </h4>
                    <AudioPlayer 
                      audioUrl={mirroredAudioUrl}
                      title={`AI Voice (${getVoiceModelName()})`}
                      isLoading={generatingTts}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      {mirroredAudioUrl ? (
                        <>
                          Text-to-speech using {getVoiceModelName().toLowerCase()}
                          {promptProcessing && <span className="text-primary ml-1">• Enhanced clarity</span>}
                        </>
                      ) : generatingTts ? (
                        "Generating mirrored voice..."
                      ) : isMirroredAvailable() ? (
                        "Ready to generate"
                      ) : (
                        "Voice model not available"
                      )}
                    </p>
                    
                    {!generatingTts && !mirroredAudioUrl && transcribedText && (
                      <Button 
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={generateTTS}
                        disabled={!isMirroredAvailable()}
                      >
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generate TTS
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        
        <footer className="py-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-4">
            <div className="w-28 h-28 transition-all duration-300 hover:scale-105">
              <img 
                src="/Arkenza_trademark_final.png" 
                alt="Arkenza Logo" 
                className="object-contain w-full h-full drop-shadow-sm"
              />
            </div>
            <p>Voice Mirroring Project &copy; {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>

      {/* Welcome Info Modal */}
      <Dialog open={showWelcomeInfo} onOpenChange={setShowWelcomeInfo}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <div className="absolute top-4 left-4 w-24 h-24 transition-all duration-300 hover:scale-110">
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
            <div className="text-xs text-muted-foreground text-center mt-1">
              version 0.0
            </div>
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

      {/* Survey Modal */}
      <Dialog open={showSurveyModal} onOpenChange={(open) => {
        setShowSurveyModal(open);
        // Don't reset counter when modal is closed
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary text-center">
              {surveySubmitted ? "Thank you for your feedback!" : "We'd love your feedback!"}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {surveySubmitted 
                ? "Your response has been recorded." 
                : "You've used Voice Mirror 5 times. Could you share your experience with us?"}
            </DialogDescription>
          </DialogHeader>
          
          {surveySubmitted ? (
            <div className="py-8 flex justify-center items-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <p className="text-center text-muted-foreground">
                  We appreciate your input and will use it to improve the app.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <h4 className="font-medium">How would you rate your experience?</h4>
                  <div className="flex justify-between items-center px-6 py-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button 
                        key={rating} 
                        className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
                          surveyRating === rating ? 'scale-110' : ''
                        }`}
                        onClick={() => setSurveyRating(rating)}
                      >
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                          surveyRating === rating 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'border-primary text-primary hover:bg-primary/10'
                        }`}>
                          {rating}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {rating === 1 ? "Poor" : rating === 5 ? "Excellent" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* New question for ease of use */}
                <div className="space-y-2">
                  <h4 className="font-medium">How easy was it to use the Voice Mirror?</h4>
                  <div className="flex justify-between items-center px-6 py-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button 
                        key={rating} 
                        className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${
                          surveyEaseOfUse === rating ? 'scale-110' : ''
                        }`}
                        onClick={() => setSurveyEaseOfUse(rating)}
                      >
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                          surveyEaseOfUse === rating 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'border-primary text-primary hover:bg-primary/10'
                        }`}>
                          {rating}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {rating === 1 ? "Difficult" : rating === 5 ? "Very Easy" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">What do you like most about our app?</h4>
                  <textarea 
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Share your thoughts..."
                    value={surveyPositiveFeedback}
                    onChange={(e) => setSurveyPositiveFeedback(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">How can we improve?</h4>
                  <textarea 
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Your suggestions help us get better..."
                    value={surveyImprovementFeedback}
                    onChange={(e) => setSurveyImprovementFeedback(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleSurveyCompletion}>
                  Maybe later
                </Button>
                <Button 
                  onClick={handleSurveySubmission}
                  disabled={isSubmittingSurvey || surveyRating === null || surveyEaseOfUse === null}
                >
                  {isSubmittingSurvey ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit feedback"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}