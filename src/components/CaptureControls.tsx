import { cn } from "@/lib/utils";
import { Camera, Video, SwitchCamera } from "lucide-react";

interface CaptureControlsProps {
  mode: "photo" | "video";
  isRecording: boolean;
  onCapture: () => void;
  onToggleMode: () => void;
  onFlipCamera: () => void;
}

export default function CaptureControls({
  mode,
  isRecording,
  onCapture,
  onToggleMode,
  onFlipCamera,
}: CaptureControlsProps) {
  return (
    <div className="flex items-center justify-center gap-8 animate-slide-up">
      {/* Mode toggle */}
      <button
        onClick={onToggleMode}
        className="w-12 h-12 rounded-full glass-card flex items-center justify-center transition-all active:scale-90"
        disabled={isRecording}
      >
        {mode === "photo" ? (
          <Video className="w-5 h-5 text-foreground" />
        ) : (
          <Camera className="w-5 h-5 text-foreground" />
        )}
      </button>

      {/* Main capture button */}
      <button
        onClick={onCapture}
        className="relative group"
        aria-label={mode === "photo" ? "Take photo" : isRecording ? "Stop recording" : "Start recording"}
      >
        {/* Outer ring */}
        <div
          className={cn(
            "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all",
            isRecording
              ? "border-snap-red"
              : "border-foreground group-active:scale-95"
          )}
        >
          {/* Inner button */}
          <div
            className={cn(
              "transition-all duration-200",
              mode === "photo"
                ? "w-14 h-14 rounded-full bg-foreground group-active:bg-primary"
                : isRecording
                ? "w-6 h-6 rounded-sm bg-snap-red animate-recording-pulse"
                : "w-14 h-14 rounded-full bg-snap-red"
            )}
          />
        </div>
        {isRecording && (
          <div className="absolute -inset-2 rounded-full border-2 border-snap-red/40 animate-pulse-ring" />
        )}
      </button>

      {/* Flip camera */}
      <button
        onClick={onFlipCamera}
        className="w-12 h-12 rounded-full glass-card flex items-center justify-center transition-all active:scale-90"
        disabled={isRecording}
      >
        <SwitchCamera className="w-5 h-5 text-foreground" />
      </button>
    </div>
  );
}
