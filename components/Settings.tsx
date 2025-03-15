"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Settings as SettingsIcon } from "lucide-react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerTrigger,
  DrawerTitle,
  DrawerHeader
} from "@/components/ui/drawer";
import { useVoiceSettings, VoiceModelType } from "@/contexts/VoiceSettingsContext";
import { cn } from "@/lib/utils";

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
    isPresetModelAvailable
  } = useVoiceSettings();
  
  const [localVoiceModel, setLocalVoiceModel] = useState<VoiceModelType>(voiceModel);
  const [localPromptProcessing, setLocalPromptProcessing] = useState<boolean>(promptProcessing);
  const [localOutputDevice, setLocalOutputDevice] = useState<string>(outputDevice);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [open, setOpen] = useState(false);

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
    }
  }, [open, voiceModel, promptProcessing, outputDevice]);

  const handleSave = () => {
    // Save to context which will update localStorage
    setVoiceModel(localVoiceModel);
    setPromptProcessing(localPromptProcessing);
    setOutputDevice(localOutputDevice);
    setOpen(false);
  };

  return (
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
              <Label className="text-base">Voice Model</Label>
              <RadioGroup 
                value={localVoiceModel} 
                onValueChange={(value) => setLocalVoiceModel(value as VoiceModelType)} 
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cloned" id="cloned" />
                  <Label htmlFor="cloned" className="font-normal cursor-pointer">
                    Cloned (Your Voice)
                  </Label>
                </div>
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
  );
} 