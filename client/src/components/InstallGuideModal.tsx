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
  AlertTriangle,
  Copy,
  Check,
  Zap,
  Layers,
  ArrowRight
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
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const ua = navigator.userAgent || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroidDevice = /Android/.test(ua);

    // Phát hiện nếu đang mở bằng trình duyệt con bên trong Zalo, Facebook, Messenger, v.v.
    const inApp = /Zalo|FBAN|FBAV|Messenger|Instagram|Line|Kakaotalk/i.test(ua);
    setIsInAppBrowser(inApp);

    if (isIOSDevice) {
      setActiveTab('ios');
    } else if (isAndroidDevice) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Xử lý nút cài đặt 1 chạm nếu trình duyệt hỗ trợ (Chrome / Android / Máy tính)
  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    try {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setInstalledNotice(true);
        if (onInstallSuccess) onInstallSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (e) {
      console.error('Lỗi khi kích hoạt cài đặt ứng dụng:', e);
    } finally {
      setIsInstalling(false);
    }
  };

  // Nút sao chép liên kết nhanh
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = window.location.origin;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* TIÊU ĐỀ BẢNG HƯỚNG DẪN */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-start justify-between gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/25 shadow-md shrink-0 bg-white">
              <img
                src="/logo.png"
                alt="Logo Tiền Đâu Rồi"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-base sm:text-lg leading-tight">
                  Cài Đặt Ứng Dụng Lên Màn Hình
                </h3>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 font-medium leading-relaxed">
                Mở ứng dụng toàn màn hình, mượt mà và không tốn bộ nhớ máy
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

        {/* NÚT CÀI ĐẶT TỰ ĐỘNG 1-CHẠM (DÀNH CHO ANDROID / CHROME / MÁY TÍNH) */}
        {deferredPrompt && (
          <div className="p-3.5 mx-4 mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                  Máy của bạn hỗ trợ cài đặt tự động!
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                  Bấm nút bên cạnh để thêm ngay ra màn hình trong 1 giây.
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
                  Đã cài xong!
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

        {/* CHỌN HỆ ĐIỀU HÀNH THIẾT BỊ */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

        {/* NỘI DUNG HƯỚNG DẪN CHI TIẾT */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-slate-700 dark:text-zinc-300">
          
          {/* TAB 1: IPHONE (APPLE SAFARI) */}
          {activeTab === 'ios' && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              
              {/* LƯU Ý SỐ 1 NẾU ĐANG MỞ TRONG ZALO / MESSENGER */}
              {isInAppBrowser ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>BẠN ĐANG MỞ LINK TRONG ZALO HOẶC MESSENGER!</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Trình duyệt của Zalo không có nút thêm vào màn hình chính. Hãy mở bằng trình duyệt <strong>Safari</strong> theo 1 trong 2 cách:
                  </p>
                  <div className="text-xs space-y-1.5 bg-white/70 dark:bg-zinc-800/80 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <p>
                      👉 <strong>Cách nhanh nhất:</strong> Bấm vào dấu <strong>3 chấm (...)</strong> ở góc trên bên phải màn hình ➔ Chọn <strong>"Mở bằng trình duyệt"</strong> (hoặc "Mở bằng Safari").
                    </p>
                    <p className="pt-1 border-t border-slate-200/60 dark:border-zinc-700 flex items-center justify-between gap-2">
                      <span>👉 Hoặc bấm nút này để chép link rồi dán vào Safari:</span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedLink ? 'Đã chép' : 'Chép link'}
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <span className="font-bold shrink-0">Yêu cầu:</span>
                  <span>Đảm bảo bạn đang mở trang web bằng trình duyệt <strong>Safari</strong> của iPhone.</span>
                </div>
              )}

              {/* BƯỚC 1: BẤM NÚT CHIA SẺ SAFARI */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  1
                </span>
                <div className="text-xs space-y-1.5 flex-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                    Bấm vào nút Chia sẻ ở Safari
                  </p>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    Nhìn xuống <strong>thanh công cụ dưới đáy màn hình Safari</strong>, bạn sẽ thấy biểu tượng hình <strong>ô vuông có mũi tên chỉ thẳng lên trên</strong>:
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-2xs font-bold text-blue-600 dark:text-blue-400">
                    <Share className="w-4 h-4" />
                    <span>Nút Chia sẻ [↑]</span>
                  </div>
                </div>
              </div>

              {/* BƯỚC 2: VUỐT MENU LÊN VÀ CHỌN THÊM VÀO MÀN HÌNH CHÍNH */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  2
                </span>
                <div className="text-xs space-y-1.5 flex-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                    Vuốt bảng chia sẻ lên &amp; chọn "Thêm vào Màn hình chính"
                  </p>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    Khi bảng menu bật lên, hãy <strong>dùng ngón tay vuốt bảng lên phía trên (cuộn xuống dưới một chút)</strong>. Tìm và nhấn vào dòng chữ:
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-2xs font-bold text-slate-800 dark:text-zinc-100">
                    <PlusSquare className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                    <span>Thêm vào Màn hình chính</span>
                  </div>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                    (Lưu ý: Nếu không vuốt lên bạn sẽ không thấy dòng này vì nó nằm ở dưới danh sách liên hệ).
                  </p>
                </div>
              </div>

              {/* BƯỚC 3: BẤM NÚT THÊM Ở GÓC TRÊN CÙNG BÊN PHẢI */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  3
                </span>
                <div className="text-xs space-y-1.5 flex-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                    Bấm chữ "Thêm" ở góc trên cùng bên phải
                  </p>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    Một màn hình xác nhận sẽ hiện ra. Hãy nhìn lên <strong>góc trên cùng bên phải màn hình</strong> và nhấn vào chữ:
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 text-white font-black text-xs shadow-xs">
                    <span>Thêm</span>
                  </div>
                  <p className="text-slate-500 dark:text-zinc-400 text-[11px] pt-1">
                    🎉 Hoàn thành! Safari sẽ tự động đóng lại và biểu tượng ứng dụng <strong>Tiền Đâu Rồi?</strong> đã nằm ngay trên màn hình chính của bạn.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID (GOOGLE CHROME / CỐC CỐC) */}
          {activeTab === 'android' && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              {/* BƯỚC 1 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  1
                </span>
                <div className="text-xs space-y-1 flex-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Bấm vào Menu 3 dấu chấm ở góc Chrome
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Trên trình duyệt <strong>Google Chrome</strong> (hoặc Cốc Cốc, Samsung Internet), bấm vào nút <strong>3 dấu chấm thẳng hàng (⋮)</strong> ở góc trên bên phải màn hình.
                  </p>
                </div>
              </div>

              {/* BƯỚC 2 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  2
                </span>
                <div className="text-xs space-y-1 flex-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính"
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Trong danh sách vừa mở ra, nhấn vào dòng có chữ <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.
                  </p>
                </div>
              </div>

              {/* BƯỚC 3 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  3
                </span>
                <div className="text-xs space-y-1 flex-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Bấm xác nhận "Cài đặt"
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Điện thoại sẽ tự động cài ứng dụng và ghim biểu tượng <strong>Tiền Đâu Rồi?</strong> lên màn hình chính. Ứng dụng sẽ chạy độc lập toàn màn hình!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MÁY TÍNH (GOOGLE CHROME / MICROSOFT EDGE) */}
          {activeTab === 'desktop' && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  1
                </span>
                <div className="text-xs space-y-1 flex-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Nhìn vào góc phải thanh nhập địa chỉ trang web
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Trên trình duyệt Chrome hoặc Edge ở máy tính, ở cuối thanh nhập đường dẫn sẽ xuất hiện biểu tượng <strong>Cài đặt ứng dụng</strong> (hình màn hình máy tính có mũi tên tải xuống).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  2
                </span>
                <div className="text-xs space-y-1 flex-1">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">
                    Bấm "Cài đặt"
                  </p>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Ứng dụng sẽ mở trong một cửa sổ riêng biệt giống như phần mềm máy tính, bạn có thể ghim vào thanh tác vụ (Taskbar) để mở hàng ngày!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PHẦN CHÂN BẢNG HƯỚNG DẪN */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Đã sao chép link' : 'Sao chép link web'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            Đã Hiểu
          </button>
        </div>
      </div>
    </div>
  );
}