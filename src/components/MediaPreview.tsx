import { ArrowLeft, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareModal from "./ShareModal";
import { useState } from "react";

interface MediaPreviewProps {
  mediaUrl: string;
  mediaType: "photo" | "video";
  onBack: () => void;
}

export default function MediaPreview({ mediaUrl, mediaType, onBack }: MediaPreviewProps) {
  const [showShare, setShowShare] = useState(false);

  const handleDownload = () => {
    const ext = mediaType === "photo" ? "jpg" : "webm";
    const a = document.createElement("a");
    a.href = mediaUrl;
    a.download = `snap-${Date.now()}.${ext}`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 safe-top">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center p-4">
        {mediaType === "photo" ? (
          <img
            src={mediaUrl}
            alt="Captured snap"
            className="max-w-full max-h-full rounded-2xl object-contain"
          />
        ) : (
          <video
            src={mediaUrl}
            controls
            autoPlay
            loop
            playsInline
            className="max-w-full max-h-full rounded-2xl object-contain"
          />
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-4 pb-6 safe-bottom flex gap-3">
        <Button variant="glass" size="lg" className="flex-1 gap-2" onClick={handleDownload}>
          <Download className="w-5 h-5" />
          Save
        </Button>
        <Button variant="snap" size="lg" className="flex-1 gap-2" onClick={() => setShowShare(true)}>
          <Share2 className="w-5 h-5" />
          Share
        </Button>
      </div>

      {showShare && (
        <ShareModal mediaUrl={mediaUrl} mediaType={mediaType} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
