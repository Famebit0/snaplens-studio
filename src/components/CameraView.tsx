import { useEffect, useRef, useState, useCallback } from "react";
import { initCameraKit, loadLenses, createMediaStreamSource, Lens, CameraKit, CameraKitSession } from "@/lib/camera-kit";
import LensCarousel from "./LensCarousel";
import CaptureControls from "./CaptureControls";
import MediaPreview from "./MediaPreview";
import { Loader2, AlertCircle, Ghost } from "lucide-react";
import { toast } from "sonner";

type CameraFacing = "user" | "environment";

export default function CameraView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1920 });

  // Resize canvas to fill container
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current?.parentElement) {
        const parent = canvasRef.current.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const w = parent.clientWidth * dpr;
        const h = parent.clientHeight * dpr;
        setCanvasSize({ width: w, height: h });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Timer for recording
  useEffect(() => {
    if (!isRecording) {
      setRecordingTime(0);
      return;
    }
    const interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Initialize Camera Kit
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const ck = await initCameraKit();
        if (cancelled) return;
        setCameraKit(ck);

        const sess = await ck.createSession({ liveRenderTarget: canvasRef.current! });
        if (cancelled) return;
        setSession(sess);
        sess.play("live");

        const loadedLenses = await loadLenses(ck);
        if (cancelled) return;
        setLenses(loadedLenses);

        // Start camera
        await startCamera(sess, ck, "user");
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

  const startCamera = async (sess: CameraKitSession, ck: CameraKit, facingMode: CameraFacing) => {
    try {
      // Stop existing stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      const source = createMediaStreamSource(stream, { cameraType: facingMode === "user" ? "front" : "back" } as any);
      await sess.setSource(source);
      if (!sess.isPlaying) sess.play("live");
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
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedMedia({ url: dataUrl, type: "photo" });
    toast.success("📸 Snap captured!");
  };

  const startRecording = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const stream = canvas.captureStream(30);

    // Add audio if available
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => stream.addTrack(t));
    }

    const recorder = new MediaRecorder(stream, {
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
    if (!session || !cameraKit) return;
    const newFacing = facing === "user" ? "environment" : "user";
    setFacing(newFacing);
    try {
      await startCamera(session, cameraKit, newFacing);
    } catch {
      toast.error("Failed to switch camera");
      setFacing(facing);
    }
  }, [session, cameraKit, facing]);

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

      {/* Camera canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
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
