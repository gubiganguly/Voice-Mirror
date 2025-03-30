"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Save, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Wand2, 
  Loader2, 
  CheckCircle,
  Mic,
  ArrowRight
} from "lucide-react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerTrigger,
  DrawerTitle,
  DrawerHeader
} from "@/components/ui/drawer";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useVoiceSettings, VoiceModelType, ClonedModel } from "@/contexts/VoiceSettingsContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioWaveform } from "@/components/AudioWaveform";

interface SettingsProps {
  className?: string;
}

export function Settings({ className }: SettingsProps) {
  const { 
    voiceModel, 
    setVoiceModel, 
    promptProcessing, 
    setPromptProcessing,
    outputDevice,
    setOutputDevice,
    isPresetModelAvailable,
    clonedModels,
    selectedClonedModelId,
    setSelectedClonedModelId,
    addClonedModel,
    removeClonedModel
  } = useVoiceSettings();
  
  const [localVoiceModel, setLocalVoiceModel] = useState<VoiceModelType>(voiceModel);
  const [localPromptProcessing, setLocalPromptProcessing] = useState<boolean>(promptProcessing);
  const [localOutputDevice, setLocalOutputDevice] = useState<string>(outputDevice);
  const [localSelectedClonedModelId, setLocalSelectedClonedModelId] = useState<string | null>(selectedClonedModelId);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [open, setOpen] = useState(false);

  // Model generation states
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [modelGenerated, setModelGenerated] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [modelGenError, setModelGenError] = useState<string | null>(null);
  const [showModelDialog, setShowModelDialog] = useState(false);
  
  // New states for recording flow
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Record, Step 2: Name, Step 3: Generate
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [audioStream, setAudioStream] = useState<MediaStream | undefined>(undefined);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Load available audio output devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // This will prompt for permissions if needed
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === "audiooutput");
        setAudioDevices(audioOutputs);
        
        // Set default device if available and no device is selected
        if (audioOutputs.length > 0 && !localOutputDevice) {
          setLocalOutputDevice(audioOutputs[0].deviceId);
        }
      } catch (error) {
        console.error("Error accessing audio devices:", error);
      }
    };

    getDevices();
  }, [localOutputDevice]);

  // Update local state when drawer opens
  useEffect(() => {
    if (open) {
      setLocalVoiceModel(voiceModel);
      setLocalPromptProcessing(promptProcessing);
      setLocalOutputDevice(outputDevice);
      setLocalSelectedClonedModelId(selectedClonedModelId);
    }
  }, [open, voiceModel, promptProcessing, outputDevice, selectedClonedModelId]);

  const handleSave = () => {
    // Save to context which will update localStorage
    setVoiceModel(localVoiceModel);
    setPromptProcessing(localPromptProcessing);
    setOutputDevice(localOutputDevice);
    if (localSelectedClonedModelId) {
      setSelectedClonedModelId(localSelectedClonedModelId);
    }
    setOpen(false);
  };

  // Handler for starting recording
  const handleRecordingStart = async () => {
    setIsRecording(true);
    setModelGenError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setModelGenError("Could not access microphone. Please check your permissions.");
    }
  };

  // Handler for completing recording
  const handleRecordingComplete = async (blob: Blob) => {
    setIsRecording(false);
    setAudioBlob(blob);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    
    // Optionally transcribe the audio using the API
    setIsTranscribing(true);
    
    try {
      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      
      // Send the audio to the whisper API endpoint
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
      setTranscribedText('');
    } finally {
      setIsTranscribing(false);
      // Move to the next step to enter name
      setCurrentStep(2);
    }
  };

  // Move to next step
  const goToNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Go back to previous step
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Reset the state when closing dialog
  const handleCloseDialog = () => {
    setShowModelDialog(false);
    setCurrentStep(1);
    setAudioBlob(null);
    setAudioUrl(undefined);
    setNewModelName("");
    setModelGenError(null);
    setModelGenerated(false);
    setTranscribedText("");
    
    // Clear audio stream if it exists
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(undefined);
    }
    
    // Revoke object URL to avoid memory leaks
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  // Generate model using the newly recorded audio
  const handleGenerateModel = async () => {
    if (!newModelName.trim()) {
      setModelGenError("Please provide a name for your voice model");
      return;
    }

    if (!audioBlob) {
      setModelGenError("No audio recording found. Please record your voice first.");
      return;
    }

    setIsGeneratingModel(true);
    setModelGenError(null);
    
    try {
      console.log("Creating voice model with recorded audio", { 
        size: audioBlob.size, 
        type: audioBlob.type,
        hasTranscription: !!transcribedText
      });
      
      // Create FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Add transcription if available
      if (transcribedText) {
        formData.append('transcription', transcribedText);
      }
      
      // Send to server
      const response = await fetch('/api/voice-model', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create voice model');
      }
      
      const data = await response.json();
      console.log("Voice model created successfully:", data);
      
      // Add the model to our list
      if (data.modelId) {
        addClonedModel(data.modelId, newModelName);
        setModelGenerated(true);
        
        // Set the voice model to cloned
        setLocalVoiceModel("cloned");
        
        // Close the dialog after a delay to show success state
        setTimeout(() => {
          handleCloseDialog();
        }, 1500);
      } else {
        throw new Error('No model ID returned from server');
      }
    } catch (error) {
      console.error("Error generating voice model:", error);
      setModelGenError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsGeneratingModel(false);
    }
  };

  const handleRemoveModel = (id: string) => {
    removeClonedModel(id);
    if (localSelectedClonedModelId === id) {
      setLocalSelectedClonedModelId(null);
      if (localVoiceModel === "cloned") {
        setLocalVoiceModel("male");
      }
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
            <SettingsIcon className="h-4 w-4" />
            <span className="sr-only">Open settings</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="px-4 py-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-center">Voice Settings</DrawerTitle>
          </DrawerHeader>
          
          <Card className="mx-auto w-full max-w-lg border-none shadow-none">
            <CardContent className="space-y-6 pt-2">
              {/* Voice Model Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Voice Model</Label>
                  <Dialog open={showModelDialog} onOpenChange={(open) => {
                    if (!open) {
                      handleCloseDialog();
                    } else {
                      setShowModelDialog(true);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Voice Model
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Create Voice Model</DialogTitle>
                        <DialogDescription>
                          {currentStep === 1 
                            ? "Record a sample of your voice to create a custom voice model."
                            : currentStep === 2 
                            ? "Give your voice model a name."
                            : "Create your custom voice model."}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Step 1: Record Audio */}
                      {currentStep === 1 && (
                        <div className="space-y-4 py-4">
                          <div className="flex flex-col items-center gap-4">
                            <div className="flex flex-col items-center justify-center">
                              <AudioRecorder 
                                onRecordingStart={handleRecordingStart}
                                onRecordingComplete={handleRecordingComplete}
                              />
                            </div>
                            
                            <div className="w-full mt-2">
                              <AudioWaveform 
                                isRecording={isRecording}
                                audioStream={audioStream}
                                className="h-24 shadow-sm rounded-md overflow-hidden"
                              />
                            </div>
                            
                            <div className="text-sm text-muted-foreground text-center px-2">
                              <p className="font-medium text-primary mb-2">Please read this passage aloud:</p>
                              <div className="bg-muted/50 p-3 rounded-md border border-border text-foreground">
                                "The voice is a remarkable instrument. Each person's voice has a unique quality and rhythm that makes it instantly recognizable. When we speak, we share not just our words, but also our emotions, our identity, and our presence in the world."
                              </div>
                            </div>
                          </div>
                          
                          {modelGenError && (
                            <div className="text-sm text-destructive mt-2">{modelGenError}</div>
                          )}
                          
                          {audioUrl && (
                            <Button 
                              onClick={goToNextStep} 
                              className="w-full mt-4"
                              variant="default"
                            >
                              Continue
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {/* Step 2: Enter Name */}
                      {currentStep === 2 && (
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="model-name">Model Name</Label>
                            <Input
                              id="model-name"
                              placeholder="Enter a name for your voice model"
                              value={newModelName}
                              onChange={(e) => setNewModelName(e.target.value)}
                            />
                          </div>
                          
                          {modelGenError && (
                            <div className="text-sm text-destructive">{modelGenError}</div>
                          )}
                          
                          <div className="flex justify-between pt-2">
                            <Button 
                              variant="outline" 
                              onClick={goToPreviousStep}
                            >
                              Back
                            </Button>
                            <Button 
                              onClick={goToNextStep}
                              disabled={!newModelName.trim()}
                            >
                              Continue
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Step 3: Generate Model */}
                      {currentStep === 3 && (
                        <div className="space-y-4 py-4">
                          <div className="text-center space-y-2">
                            <p>Ready to create your voice model!</p>
                            <div className="text-sm text-muted-foreground">
                              <strong>Voice Sample:</strong> {isTranscribing ? "Analyzing..." : transcribedText ? `"${transcribedText.slice(0, 60)}${transcribedText.length > 60 ? '...' : ''}"` : "No transcription available"}
                            </div>
                            <div className="text-sm font-medium">
                              <strong>Model Name:</strong> {newModelName}
                            </div>
                          </div>
                          
                          {modelGenError && (
                            <div className="text-sm text-destructive">{modelGenError}</div>
                          )}
                          
                          <div className="flex justify-between pt-2">
                            <Button 
                              variant="outline" 
                              onClick={goToPreviousStep}
                              disabled={isGeneratingModel}
                            >
                              Back
                            </Button>
                            <Button 
                              onClick={handleGenerateModel}
                              disabled={isGeneratingModel || modelGenerated || !newModelName.trim() || !audioBlob}
                              className="min-w-32"
                            >
                              {isGeneratingModel ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : modelGenerated ? (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Created Successfully
                                </>
                              ) : (
                                <>
                                  <Wand2 className="mr-2 h-4 w-4" />
                                  Generate Voice Model
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
                
                <RadioGroup 
                  value={localVoiceModel} 
                  onValueChange={(value) => setLocalVoiceModel(value as VoiceModelType)} 
                  className="flex flex-col space-y-1"
                >
                  {/* First show preset models */}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="male" 
                      id="male" 
                      disabled={!isPresetModelAvailable("male")}
                    />
                    <Label 
                      htmlFor="male" 
                      className={cn(
                        "font-normal cursor-pointer",
                        !isPresetModelAvailable("male") && "text-muted-foreground"
                      )}
                    >
                      Male Voice {!isPresetModelAvailable("male") && "(Unavailable)"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="female" 
                      id="female" 
                      disabled={!isPresetModelAvailable("female")}
                    />
                    <Label 
                      htmlFor="female" 
                      className={cn(
                        "font-normal cursor-pointer",
                        !isPresetModelAvailable("female") && "text-muted-foreground"
                      )}
                    >
                      Female Voice {!isPresetModelAvailable("female") && "(Unavailable)"}
                    </Label>
                  </div>
                  
                  {/* Only show cloned option if there are cloned models */}
                  {clonedModels.length > 0 && (
                    <>
                      <div className="flex items-center space-x-2 mt-4">
                        <RadioGroupItem 
                          value="cloned" 
                          id="cloned" 
                          checked={localVoiceModel === "cloned"}
                        />
                        <Label htmlFor="cloned" className="font-medium cursor-pointer">
                          Custom Voice Models
                        </Label>
                      </div>
                      
                      {/* Cloned model selection */}
                      {localVoiceModel === "cloned" && (
                        <div className="pl-6 space-y-3 mt-2">
                          <Select 
                            value={localSelectedClonedModelId || undefined} 
                            onValueChange={setLocalSelectedClonedModelId}
                            disabled={clonedModels.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a voice model" />
                            </SelectTrigger>
                            <SelectContent>
                              {clonedModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name} ({format(new Date(model.createdAt), "MMM d, yyyy")})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* Model management */}
                          {localSelectedClonedModelId && (
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveModel(localSelectedClonedModelId)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="mr-2 h-3 w-3" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </RadioGroup>
              </div>

              {/* Prompt Processing Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Apply Prompt Processing</Label>
                  <p className="text-sm text-muted-foreground">
                    Clean up transcript with AI to remove fillers, stutters, and improve flow
                  </p>
                </div>
                <Switch 
                  checked={localPromptProcessing}
                  onCheckedChange={setLocalPromptProcessing}
                />
              </div>

              {/* Audio Output Device */}
              <div className="space-y-3">
                <Label className="text-base">Audio Output Device</Label>
                <Select 
                  value={localOutputDevice} 
                  onValueChange={setLocalOutputDevice}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select output device" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Output Device ${device.deviceId.slice(0, 5)}`}
                      </SelectItem>
                    ))}
                    {audioDevices.length === 0 && (
                      <SelectItem value="default" disabled>
                        No output devices found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} className="w-full gap-2">
                <Save className="h-4 w-4" />
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </DrawerContent>
      </Drawer>
    </>
  );
} 