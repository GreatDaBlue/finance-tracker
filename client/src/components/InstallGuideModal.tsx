import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  CheckCircle2,
  Sparkles,
  Laptop,
  AlertCircle,
  ExternalLink,
  Layers,
  Zap,
  Check
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any; // beforeinstallprompt event
  onInstallSuccess?: () => void;
}

export default function InstallGuideModal({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess
}: Props) {
  // Tự động nhận diện thiết bị của người dùng
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('ios');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      setActiveTab('ios');
    } else if (isAndroid) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Xử lý nút cài đặt 1 chạm nếu trình duyệt hỗ trợ beforeinstallprompt (Chrome / Android / Desktop)
  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    try {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalledNotice(true);
        if (onInstallSuccess) onInstallSuccess();
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (e) {
      console.error('Lỗi khi kích hoạt cài đặt PWA:', e);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-start justify-between gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/25 shadow-md shrink-0">
              <img
                src="/logo.png"
                alt="Tiền Đâu Rồi Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-base sm:text-lg leading-tight">
                  Cài Đặt App Trên Điện Thoại
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-md shadow-xs">
                  Miễn phí
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 font-medium leading-relaxed">
                Mở toàn màn hình, mượt mà như app tải từ Store
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/90 hover:text-white cursor-pointer shrink-0"
            title="Đóng hướng dẫn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LỢI ÍCH KHI CÀI VÀO MÀN HÌNH CHÍNH */}
        <div className="bg-blue-50/70 dark:bg-blue-950/40 px-4 py-2.5 border-b border-blue-100/60 dark:border-blue-900/40 grid grid-cols-3 gap-2 text-center shrink-0">
          <div className="flex flex-col items-center justify-center py-1">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-0.5" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 leading-tight">
              Toàn màn hình
            </span>
            <span className="text-[9.5px] text-slate-500 dark:text-zinc-400">Ẩn thanh duyệt web</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1 border-x border-blue-100 dark:border-blue-900/60">
            <Sparkles className="w-4 h-4 text-amber-500 mb-0.5" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 leading-tight">
              0MB Bộ nhớ
            </span>
            <span className="text-[9.5px] text-slate-500 dark:text-zinc-400">Không nặng máy</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <Layers className="w-4 h-4 text-emerald-500 mb-0.5" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 leading-tight">
              Tự cập nhật
            </span>
            <span className="text-[9.5px] text-slate-500 dark:text-zinc-400">Luôn bản mới nhất</span>
          </div>
        </div>

        {/* NÚT CÀI ĐẶT 1 CHẠM (NẾU TRÌNH DUYỆT HỖ TRỢ EVENT) */}
        {deferredPrompt && (
          <div className="p-3.5 mx-4 mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                  Trình duyệt hỗ trợ cài đặt tự động!
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                  Bấm cài đặt để thêm ngay vào máy không cần làm thủ công.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNativeInstall}
              disabled={isInstalling || installedNotice}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {installedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Đã cài!
                </>
              ) : isInstalling ? (
                'Đang cài...'
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Cài Đặt Ngay
                </>
              )}
            </button>
          </div>
        )}

        {/* CHỌN HỆ ĐIỀU HÀNH */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ios'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone (iOS)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'android'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'desktop'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Máy tính</span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG TỪNG TAB */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-slate-700 dark:text-zinc-300">
          {/* TAB 1: IPHONE (IOS SAFARI) */}
          {activeTab === 'ios' && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Quan trọng:</strong> Apple chỉ cho phép thêm app qua trình duyệt <strong>Safari</strong>. Nếu bạn đang mở link trong Zalo, Facebook hoặc Chrome, hãy bấm menu chọn <strong>"Mở bằng Safari"</strong> trước nhé!
                </p>
              </div>

              {/* BƯỚC 1 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  1
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Bấm nút Chia sẻ (Share) ở Safari
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Ở thanh công cụ dưới đáy màn hình Safari, bấm vào biểu tượng hình <strong>ô vuông có mũi tên chỉ lên</strong> <Share className="inline w-3.5 h-3.5 text-blue-600 mx-1 align-baseline" />.
                  </p>
                </div>
              </div>

              {/* BƯỚC 2 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  2
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Chọn "Thêm vào MH chính"
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Cuộn bảng tính năng xuống phía dưới và tìm dòng có biểu tượng <PlusSquare className="inline w-3.5 h-3.5 text-slate-700 dark:text-zinc-300 mx-1 align-baseline" /> <strong>"Thêm vào MH chính"</strong> (Add to Home Screen).
                  </p>
                </div>
              </div>

              {/* BƯỚC 3 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  3
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Nhấn "Thêm" ở góc trên bên phải
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Giữ tên hiển thị mặc định <strong>"Tiền Đâu Rồi?"</strong> và bấm nút <strong>Thêm</strong> (Add). Xong! Icon app sẽ xuất hiện ngay trên màn hình chính iPhone của bạn.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID (GOOGLE CHROME) */}
          {activeTab === 'android' && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              {/* BƯỚC 1 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  1
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Bấm vào Menu 3 chấm ở góc Chrome
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Trên trình duyệt <strong>Google Chrome</strong> (hoặc Cốc Cốc, Samsung Internet), bấm vào nút <strong>3 dấu chấm thẳng hàng (⋮)</strong> <MoreVertical className="inline w-3.5 h-3.5 text-slate-700 dark:text-zinc-300 mx-1 align-baseline" /> ở góc trên bên phải màn hình.
                  </p>
                </div>
              </div>

              {/* BƯỚC 2 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  2
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Chọn "Cài đặt ứng dụng" hoặc "Thêm vào MH chính"
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Trong menu vừa mở ra, nhấn vào dòng <Download className="inline w-3.5 h-3.5 text-blue-600 mx-1 align-baseline" /> <strong>"Cài đặt ứng dụng"</strong> (Install App) hoặc <strong>"Thêm vào màn hình chính"</strong>.
                  </p>
                </div>
              </div>

              {/* BƯỚC 3 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  3
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Bấm xác nhận "Cài đặt"
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Điện thoại sẽ tự động cài ứng dụng và ghim biểu tượng <strong>"Tiền Đâu Rồi?"</strong> lên màn hình chính. Khi mở sẽ chạy độc lập toàn màn hình!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MÁY TÍNH (DESKTOP CHROME / EDGE) */}
          {activeTab === 'desktop' && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  1
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Nhìn vào góc phải thanh địa chỉ URL
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Trên trình duyệt Chrome hoặc Edge ở máy tính, ở cuối thanh nhập đường dẫn URL sẽ có biểu tượng <strong>Cài đặt ứng dụng</strong> (hình máy tính nhỏ có mũi tên xuống).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  2
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Bấm "Cài đặt" (Install)
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    App sẽ mở trong một cửa sổ riêng biệt giống như ứng dụng Windows/Mac thực thụ, bạn có thể ghim vào Taskbar để mở hàng ngày!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Đã hỗ trợ chuẩn Progressive Web App</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            Đã Hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
