"use client";

import { Button } from "@/components/ui/button";
import { Settings, HelpCircle, Info, X } from "lucide-react";
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

export function AppHeader() {
  return (
    <header className="flex justify-between items-center w-full py-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Voice Mirror
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Settings">
                    <Settings className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>
                      Configure your voice mirroring experience
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <p className="text-muted-foreground">Settings content will go here</p>
                  </div>
                </SheetContent>
              </Sheet>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Help">
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Help</SheetTitle>
                    <SheetDescription>
                      How to use Voice Mirror
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <p className="text-muted-foreground">Help content will go here</p>
                  </div>
                </SheetContent>
              </Sheet>
            </TooltipTrigger>
            <TooltipContent>
              <p>Help</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="About">
                    <Info className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>About Voice Mirror</SheetTitle>
                    <SheetDescription>
                      Information about this application
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <p className="text-muted-foreground">
                      Voice Mirror is an application that allows you to record your voice,
                      transcribe it, and play it back with different voices.
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </TooltipTrigger>
            <TooltipContent>
              <p>About</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Quit">
                <X className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Quit</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
} 