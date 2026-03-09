import { X, Download, Share2, MessageCircle, Instagram, Twitter, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface ShareModalProps {
  mediaUrl: string;
  mediaType: "photo" | "video";
  onClose: () => void;
}

export default function ShareModal({ mediaUrl, mediaType, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const ext = mediaType === "photo" ? "jpg" : "webm";
    const a = document.createElement("a");
    a.href = mediaUrl;
    a.download = `snap-${Date.now()}.${ext}`;
    a.click();
    toast.success("Saved to device!");
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      toast.error("Share not supported on this device");
      return;
    }
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const file = new File(
        [blob],
        `snap-${Date.now()}.${mediaType === "photo" ? "jpg" : "webm"}`,
        { type: blob.type }
      );
      await navigator.share({ files: [file], title: "Check out my Snap!" });
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Sharing failed");
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const socialLinks = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-snap-green",
      url: `https://wa.me/?text=${encodeURIComponent("Check out my Snap! " + window.location.href)}`,
    },
    {
      name: "X / Twitter",
      icon: Twitter,
      color: "bg-foreground",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out my Snap!")}&url=${encodeURIComponent(window.location.href)}`,
    },
    {
      name: "Instagram",
      icon: Instagram,
      color: "snap-gradient-purple",
      url: "#",
      action: () => toast.info("Save the image first, then share to Instagram Stories!"),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-card rounded-t-3xl p-6 pb-8 safe-bottom animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground">Share Your Snap</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Main actions */}
        <div className="flex gap-3 mb-6">
          <Button variant="snap" size="lg" className="flex-1 gap-2" onClick={handleDownload}>
            <Download className="w-5 h-5" />
            Save
          </Button>
          {typeof navigator.share === "function" && (
            <Button variant="snap" size="lg" className="flex-1 gap-2" onClick={handleNativeShare}>
              <Share2 className="w-5 h-5" />
              Share
            </Button>
          )}
        </div>

        {/* Social links */}
        <div className="flex items-center justify-center gap-6 mb-4">
          {socialLinks.map((social) => (
            <button
              key={social.name}
              onClick={() => {
                if (social.action) {
                  social.action();
                } else {
                  window.open(social.url, "_blank");
                }
              }}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`w-12 h-12 rounded-full ${social.color} flex items-center justify-center transition-transform group-active:scale-90`}
              >
                <social.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">{social.name}</span>
            </button>
          ))}
          <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center transition-transform group-active:scale-90">
              {copied ? (
                <Check className="w-5 h-5 text-snap-green" />
              ) : (
                <Link2 className="w-5 h-5 text-foreground" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
