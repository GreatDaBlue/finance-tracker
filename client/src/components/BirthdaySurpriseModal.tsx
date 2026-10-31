import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Heart, Gift, Cake, PartyPopper } from 'lucide-react';

export default function BirthdaySurpriseModal() {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // 1. Kiểm tra ngày: Chỉ hiện trong ngày 31/10/2026 (giờ địa phương)
    const now = new Date();
    const isBirthdayDate = now.getFullYear() === 2026 && now.getMonth() === 9 && now.getDate() === 31;
    
    // Nếu bạn muốn test luôn hoặc ép mở bằng query param ?birthday=1
    const urlParams = new URLSearchParams(window.location.search);
    const forceShow = urlParams.get('birthday') === '1';

    if (isBirthdayDate || forceShow) {
      // Delay nhỏ 400ms để trang tải xong giao diện nền rồi mới bật bất ngờ
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. Hiệu ứng pháo hoa giấy (Canvas Confetti) tự động bắn rực rỡ
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Mảng các hạt confetti
    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#fbbf24', '#f59e0b', '#38bdf8', '#34d399'];
    interface Particle {
      x: number;
      y: number;
      r: number;
      d: number;
      color: string;
      tilt: number;
      tiltAngleIncremental: number;
      tiltAngle: number;
      vx: number;
      vy: number;
    }

    const particles: Particle[] = [];
    const count = 120;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 8 + 4,
        d: Math.random() * count + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
        tiltAngle: 0,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2.5
      });
    }

    let start = Date.now();
    const duration = 8000; // chạy trong 8s

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.d);
        p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;

        // Tái tạo khi rơi quá màn hình nếu vẫn trong thời gian bắn
        if (p.y > canvas.height) {
          if (Date.now() - start < duration) {
            p.x = Math.random() * canvas.width;
            p.y = -20;
          }
        }
      }

      animId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Canvas bắn pháo hoa toàn màn hình */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10 w-full h-full"
      />

      {/* Thẻ thiệp chúc mừng sinh nhật */}
      <div className="relative z-20 w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border-2 border-pink-300/80 dark:border-pink-500/40 overflow-hidden text-center transform transition-all animate-scale-up">
        
        {/* Nút đóng góc phải */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3.5 right-3.5 z-30 p-2 rounded-full bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 shadow-sm transition-colors cursor-pointer"
          title="Đóng thiệp"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Khung ảnh bánh sinh nhật 18 tuổi nghệ thuật */}
        <div className="relative w-full h-56 sm:h-64 bg-gradient-to-b from-pink-100 via-rose-50 to-white dark:from-pink-950/40 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden flex items-center justify-center">
          <img
            src="/birthday-be-hien.png"
            alt="Chúc mừng sinh nhật Bé Hiền 18 tuổi"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              // Fallback nếu ảnh chưa tải xong hoặc đường dẫn dự phòng
              (e.currentTarget as HTMLImageElement).src = '/birthday-be-hien.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-900 via-transparent to-transparent opacity-80" />
          
          {/* Huy hiệu tuổi 18 lấp lánh */}
          <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/90 text-white text-xs font-bold tracking-wide shadow-lg backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>SWEET 18</span>
          </div>
        </div>

        {/* Nội dung lời chúc */}
        <div className="p-6 pt-2 space-y-4">
          <div>
            <div className="flex items-center justify-center gap-2 mb-1.5 text-pink-500 dark:text-pink-400 font-bold text-xs uppercase tracking-widest">
              <PartyPopper className="w-4 h-4" />
              <span>Happy Birthday</span>
              <Cake className="w-4 h-4" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-zinc-100">
              Bé Hiền <span className="text-pink-500">✨</span>
            </h2>
          </div>

          {/* Hộp lời chúc nổi bật */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50/50 to-amber-50/40 dark:from-pink-950/30 dark:via-zinc-800/50 dark:to-zinc-800/30 border border-pink-200/80 dark:border-pink-800/40 shadow-xs">
            <p className="text-base sm:text-lg font-bold text-pink-600 dark:text-pink-300 leading-relaxed">
              “Chúc bé Hiền sinh nhật 18 tuổi vui vẻ, tuổi mới nhiều tiền nhiều xinh đẹp! 💖💸”
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 text-slate-400 dark:text-zinc-500 text-xs">
            <span className="flex items-center gap-1">🎂 Tuổi 18 rực rỡ</span>
            <span>•</span>
            <span className="flex items-center gap-1">✨ Xinh đẹp vẹn tròn</span>
            <span>•</span>
            <span className="flex items-center gap-1">💰 Tiền tài rủng rỉnh</span>
          </div>

          {/* Nút bấm cảm ơn & mở app */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:via-rose-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4 fill-current text-white animate-pulse" />
            <span>Cảm ơn món quà & Khám phá ứng dụng</span>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}