import { useState, useEffect, useCallback } from "react";

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