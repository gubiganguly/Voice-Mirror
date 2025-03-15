"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

// Voice model type
export type VoiceModelType = "cloned" | "male" | "female";

// Define available preset models - these need to be real IDs from Fish Audio
export const PRESET_VOICE_MODELS = {
  // Note: Replace these with actual working IDs from your Fish Audio account
  male: process.env.NEXT_PUBLIC_FISH_AUDIO_MALE_MODEL_ID || "",
  female: process.env.NEXT_PUBLIC_FISH_AUDIO_FEMALE_MODEL_ID || ""
};

// Context interface
interface VoiceSettingsContextType {
  voiceModel: VoiceModelType;
  setVoiceModel: (model: VoiceModelType) => void;
  promptProcessing: boolean;
  setPromptProcessing: (value: boolean) => void;
  outputDevice: string;
  setOutputDevice: (deviceId: string) => void;
  getActiveModelId: (clonedModelId: string | null) => string | null;
  isPresetModelAvailable: (model: "male" | "female") => boolean;
}

// Create context with default values
const VoiceSettingsContext = createContext<VoiceSettingsContextType>({
  voiceModel: "cloned",
  setVoiceModel: () => {},
  promptProcessing: true,
  setPromptProcessing: () => {},
  outputDevice: "",
  setOutputDevice: () => {},
  getActiveModelId: () => null,
  isPresetModelAvailable: () => false,
});

// Provider component
export function VoiceSettingsProvider({ children }: { children: ReactNode }) {
  const [voiceModel, setVoiceModel] = useState<VoiceModelType>("cloned");
  const [promptProcessing, setPromptProcessing] = useState<boolean>(true);
  const [outputDevice, setOutputDevice] = useState<string>("");

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("voiceSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.voiceModel) setVoiceModel(parsed.voiceModel);
        if (parsed.promptProcessing !== undefined) setPromptProcessing(parsed.promptProcessing);
        if (parsed.outputDevice) setOutputDevice(parsed.outputDevice);
      } catch (e) {
        console.error("Error parsing saved settings:", e);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      voiceModel,
      promptProcessing,
      outputDevice
    };
    localStorage.setItem("voiceSettings", JSON.stringify(settings));
  }, [voiceModel, promptProcessing, outputDevice]);

  // Check if a preset model ID is available
  const isPresetModelAvailable = (model: "male" | "female"): boolean => {
    return !!PRESET_VOICE_MODELS[model] && PRESET_VOICE_MODELS[model].length > 0;
  };

  // Helper function to get the appropriate model ID based on selected voice type
  const getActiveModelId = (clonedModelId: string | null): string | null => {
    if (voiceModel === "cloned") {
      return clonedModelId;
    } else {
      return PRESET_VOICE_MODELS[voiceModel] || null;
    }
  };

  return (
    <VoiceSettingsContext.Provider 
      value={{
        voiceModel,
        setVoiceModel,
        promptProcessing,
        setPromptProcessing,
        outputDevice,
        setOutputDevice,
        getActiveModelId,
        isPresetModelAvailable
      }}
    >
      {children}
    </VoiceSettingsContext.Provider>
  );
}

// Custom hook to use the context
export const useVoiceSettings = () => useContext(VoiceSettingsContext); 