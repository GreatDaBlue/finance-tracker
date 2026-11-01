import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download, Sparkles } from 'lucide-react';

interface Props {
  onOpenGuide: () => void;
  deferredPrompt?: any;
  onInstallSuccess?: () => void;
}

export default function InstallSmartBanner({ onOpenGuide, deferredPrompt, onInstallSuccess }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // 1. Nếu đang chạy ở chế độ App độc lập (Standalone PWA) thì không bao giờ hiện banner
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Kiểm tra xem người dùng đã từng tắt banner trong 5 ngày qua chưa
    try {
      const dismissedTime = localStorage.getItem('pwa_banner_dismissed_at');
      if (dismissedTime) {
        const diffDays = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
        if (diffDays < 5) {
          return;
        }
      }
    } catch {}

    // Hiển thị banner với delay nhẹ để không làm giật giao diện khi trang vừa tải
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('pwa_banner_dismissed_at', Date.now().toString());
    } catch {}
  };

  // Cài đặt 1-chạm trực tiếp:
  const handleDirectInstall = async () => {
    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsVisible(false);
          if (onInstallSuccess) onInstallSuccess();
          try {
            localStorage.setItem('pwa_installed', 'true');
          } catch {}
        }
      } catch (err) {
        console.error('Direct install error:', err);
        onOpenGuide();
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Nếu là iOS hoặc trình duyệt chưa nổ prompt, mở hướng dẫn
      onOpenGuide();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md border-b border-blue-500/30 animate-in slide-in-from-top-2 duration-300 relative z-30">
      <div className="max-w-7xl mx-auto px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 sm:gap-4">
        {/* LOGO & THÔNG ĐIỆP */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/30 shadow-xs shrink-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm leading-tight truncate">
                Cài đặt App trên điện thoại
              </span>
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-md">
                <Sparkles className="w-2.5 h-2.5" /> Chuẩn PWA
              </span>
            </div>
            <p className="text-[11px] text-blue-100 font-medium truncate leading-tight mt-0.5">
              Thêm vào Màn hình chính để mở toàn màn hình, mượt mà hơn
            </p>
          </div>
        </div>

        {/* NÚT HÀNH ĐỘNG & NÚT ĐÓNG */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDirectInstall}
            disabled={isInstalling}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstalling ? 'Đang cài...' : deferredPrompt ? 'Cài đặt ngay' : 'Cài đặt App'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
