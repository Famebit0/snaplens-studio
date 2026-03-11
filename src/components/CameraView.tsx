import { useEffect, useRef, useState, useCallback } from "react";
import { initCameraKit, loadLenses, createMediaStreamSource, Transform2D, Lens, CameraKit, CameraKitSession } from "@/lib/camera-kit";
import LensCarousel from "./LensCarousel";
import CaptureControls from "./CaptureControls";
import MediaPreview from "./MediaPreview";
import { Loader2, AlertCircle, Ghost } from "lucide-react";
import { toast } from "sonner";

type CameraFacing = "user" | "environment";

export default function CameraView() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const sessionRef = useRef<CameraKitSession | null>(null);

  const [cameraKit, setCameraKit] = useState<CameraKit | null>(null);
  const [session, setSession] = useState<CameraKitSession | null>(null);
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [activeLensId, setActiveLensId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState<CameraFacing>("user");
  const [capturedMedia, setCapturedMedia] = useState<{ url: string; type: "photo" | "video" } | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Timer for recording
  useEffect(() => {
    if (!isRecording) {
      setRecordingTime(0);
      return;
    }
    const interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Initialize Camera Kit — per official React tutorial:
  // 1. createSession() WITHOUT passing a canvas
  // 2. Append session.output.live to container div
  // 3. Call session.play("live")
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const ck = await initCameraKit();
        if (cancelled) return;
        setCameraKit(ck);

        // Create session WITHOUT a canvas — SDK creates its own managed canvas
        const sess = await ck.createSession();
        if (cancelled) return;
        sessionRef.current = sess;
        setSession(sess);

        // Append SDK's output canvas to our container
        if (canvasContainerRef.current) {
          // Clear any previous canvases
          canvasContainerRef.current.innerHTML = "";
          const liveCanvas = sess.output.live;
          // Style the SDK canvas to fill the container
          liveCanvas.style.width = "100%";
          liveCanvas.style.height = "100%";
          liveCanvas.style.objectFit = "cover";
          canvasContainerRef.current.appendChild(liveCanvas);
        }

        const loadedLenses = await loadLenses(ck);
        if (cancelled) return;
        setLenses(loadedLenses);

        // Start camera
        await startCamera(sess, "user");
        setLoading(false);
      } catch (e) {
        console.error("Camera Kit init error:", e);
        if (!cancelled) {
          setError("Failed to initialize camera. Please allow camera access and reload.");
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCamera = async (sess: CameraKitSession, facingMode: CameraFacing) => {
    try {
      // Pause session and stop existing tracks before switching (per SDK docs)
      if (mediaStreamRef.current) {
        sess.pause();
        mediaStreamRef.current.getVideoTracks()[0]?.stop();
      }

      // Always request standard LANDSCAPE dimensions — device handles orientation
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      const source = createMediaStreamSource(stream, {
        cameraType: facingMode === "user" ? "user" : "environment",
      } as any);

      await sess.setSource(source);

      // Mirror front camera using Transform2D (per SDK docs)
      if (facingMode === "user") {
        source.setTransform(Transform2D.MirrorX);
      }

      // Play the live output canvas (per official React tutorial)
      sess.play("live" as any);
    } catch (e) {
      console.error("Camera start error:", e);
      throw e;
    }
  };

  const handleSelectLens = useCallback(
    async (lens: Lens | null) => {
      if (!session) return;
      try {
        if (lens) {
          await session.applyLens(lens);
          setActiveLensId(lens.id);
          toast.success(`${lens.name || "Filter"} applied!`);
        } else {
          await session.removeLens();
          setActiveLensId(null);
        }
      } catch (e) {
        console.error("Lens apply error:", e);
        toast.error("Failed to apply filter");
      }
    },
    [session]
  );

  const handleCapture = useCallback(() => {
    if (mode === "photo") {
      capturePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  }, [mode, isRecording]);

  const capturePhoto = () => {
    // Use the SDK's live output canvas for capture
    const canvas = sessionRef.current?.output.live;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedMedia({ url: dataUrl, type: "photo" });
    toast.success("📸 Snap captured!");
  };

  const startRecording = () => {
    const canvas = sessionRef.current?.output.live;
    if (!canvas) return;
    const canvasStream = canvas.captureStream(30);

    // Combine canvas video with original audio if available
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => canvasStream.addTrack(t));
    }

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
    });

    recordedChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setCapturedMedia({ url, type: "video" });
      toast.success("🎬 Video recorded!");
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleFlipCamera = useCallback(async () => {
    if (!session) return;
    const newFacing = facing === "user" ? "environment" : "user";
    setFacing(newFacing);
    try {
      await startCamera(session, newFacing);
    } catch {
      toast.error("Failed to switch camera");
      setFacing(facing);
    }
  }, [session, facing]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full lens-ring animate-spin" />
          <Ghost className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-medium">Loading Camera Kit...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-snap-red" />
        <h2 className="text-xl font-bold text-foreground">Oops!</h2>
        <p className="text-muted-foreground max-w-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold active:scale-95 transition-transform"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <div className="glass-card px-3 py-1.5 rounded-full">
          <span className="text-xs font-bold text-primary">SNAP</span>
          <span className="text-xs font-medium text-foreground"> CAM</span>
        </div>
        {isRecording && (
          <div className="glass-card px-3 py-1.5 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-snap-red animate-recording-pulse" />
            <span className="text-xs font-mono font-bold text-snap-red">{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>

      {/* Camera canvas container — SDK appends its own canvas here */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasContainerRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-6 pt-4 safe-bottom space-y-4">
        {/* Mode indicator */}
        <div className="flex justify-center gap-6">
          <button
            onClick={() => setMode("photo")}
            className={`text-xs font-bold uppercase tracking-wider transition-all ${
              mode === "photo" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Photo
          </button>
          <button
            onClick={() => setMode("video")}
            className={`text-xs font-bold uppercase tracking-wider transition-all ${
              mode === "video" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Video
          </button>
        </div>

        {/* Lens carousel */}
        {!isRecording && (
          <LensCarousel lenses={lenses} activeLensId={activeLensId} onSelectLens={handleSelectLens} />
        )}

        {/* Capture controls */}
        <CaptureControls
          mode={mode}
          isRecording={isRecording}
          onCapture={handleCapture}
          onToggleMode={() => setMode((m) => (m === "photo" ? "video" : "photo"))}
          onFlipCamera={handleFlipCamera}
        />
      </div>

      {/* Media preview overlay */}
      {capturedMedia && (
        <MediaPreview
          mediaUrl={capturedMedia.url}
          mediaType={capturedMedia.type}
          onBack={() => setCapturedMedia(null)}
        />
      )}
    </div>
  );
}
