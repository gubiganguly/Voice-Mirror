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
  CheckCircle 
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
  const audioBlobRef = useRef<Blob | null>(null);

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

  const getAudioBlob = async (): Promise<Blob | null> => {
    // Check if we already have a cached blob
    if (audioBlobRef.current) {
      return audioBlobRef.current;
    }
    
    // Otherwise fetch from session storage (would be set in the main page)
    try {
      const storedAudio = sessionStorage.getItem("lastRecordedAudio");
      if (!storedAudio) {
        return null;
      }
      
      // Convert base64 to blob
      const byteString = atob(storedAudio.split(',')[1]);
      const mimeString = storedAudio.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      audioBlobRef.current = blob;
      return blob;
    } catch (error) {
      console.error("Error retrieving audio blob:", error);
      return null;
    }
  };

  const handleGenerateModel = async () => {
    if (!newModelName.trim()) {
      setModelGenError("Please provide a name for your voice model");
      return;
    }

    setIsGeneratingModel(true);
    setModelGenError(null);
    
    try {
      // Get the audio from sessionStorage
      const audioData = sessionStorage.getItem("lastRecordedAudio");
      const transcription = sessionStorage.getItem("lastTranscription") || "";
      
      if (!audioData) {
        throw new Error("No audio data available. Please record audio first.");
      }
      
      console.log("Retrieved audio data from session storage", { 
        dataLength: audioData.length,
        hasTranscription: !!transcription 
      });
      
      // Convert the base64 data back to a blob with explicit type
      // The format needs to match what was originally recorded (likely webm)
      const base64Data = audioData.split(',')[1]; // Remove the data URL prefix
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob with explicit MIME type
      const audioBlob = new Blob([bytes], { type: 'audio/webm' });
      
      console.log("Created audio blob", { 
        size: audioBlob.size, 
        type: audioBlob.type 
      });
      
      if (audioBlob.size === 0) {
        throw new Error("Audio data is empty. Please try recording again.");
      }
      
      // Create FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Add transcription if available
      if (transcription) {
        formData.append('transcription', transcription);
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
        setShowModelDialog(false);
        
        // Set the voice model to cloned
        setLocalVoiceModel("cloned");
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
                  <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Voice Model
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Voice Model</DialogTitle>
                        <DialogDescription>
                          Create a custom voice model based on your recorded audio.
                        </DialogDescription>
                      </DialogHeader>
                      
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
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          onClick={handleGenerateModel}
                          disabled={isGeneratingModel || modelGenerated || !newModelName.trim()}
                          className="w-full"
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
                      </DialogFooter>
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