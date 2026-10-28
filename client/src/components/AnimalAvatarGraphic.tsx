import React from 'react';
import { getAnimalAvatar } from '../lib/animalAvatars';

interface Props {
  avatarId?: string | null;
  className?: string;
  size?: number | string;
}

/**
 * AnimalAvatarGraphic:
 * Render vector minh họa động vật phong cách hoạt hình (chibi/cartoon),
 * siêu đáng yêu, vui nhộn, thể hiện rõ nét đặc điểm nhận diện từng giống loài.
 * Không còn đồng tiền hay phong cách tối giản.
 */
export default function AnimalAvatarGraphic({ avatarId, className = 'w-full h-full', size }: Props) {
  const avatar = getAnimalAvatar(avatarId);
  if (!avatar) return null;

  const style = size ? { width: size, height: size } : undefined;

  switch (avatar.id) {
    // ═══════════════════════════════════════════════════════════════════════
    // A. 5 GIỐNG MÈO (CAT SQUAD) — SIÊU ĐÁNG YÊU & BIỂU CẢM VUI NHỘN
    // ═══════════════════════════════════════════════════════════════════════

    // 1. Mèo Mướp (Tabby Cat): Màu tối xám sẫm/than chì, chữ M đen trên trán, vằn đen 2 bên má, mắt xanh lá sáng, cười :3
    case 'cat_tabby':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai mèo xám sẫm viền đen */}
          <polygon points="18,10 38,36 12,38" fill="#334155" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="20,16 34,34 16,36" fill="#475569" />
          <polygon points="82,10 88,38 62,36" fill="#334155" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="80,16 84,36 66,34" fill="#475569" />

          {/* Đầu tròn xoe màu xám tối (dark slate/charcoal) */}
          <ellipse cx="50" cy="54" rx="40" ry="36" fill="#475569" stroke="#0f172a" strokeWidth="2.5" />

          {/* CHỮ M TO RÕ ĐẶC TRƯNG MÈO MƯỚP MÀU ĐEN TUYỀN */}
          <path d="M36 24 L43 38 L50 28 L57 38 L64 24" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Vằn mướp đen 2 bên má */}
          <path d="M14 52 L26 54 M12 60 L24 61 M15 68 L26 66" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M86 52 L74 54 M88 60 L76 61 M85 68 L74 66" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />

          {/* Vùng đệm mõm xám sáng nhẹ */}
          <ellipse cx="44" cy="65" rx="7.5" ry="5.5" fill="#64748b" />
          <ellipse cx="56" cy="65" rx="7.5" ry="5.5" fill="#64748b" />

          {/* Đôi mắt to tròn sáng màu xanh ngọc bích nổi bật trên nền lông tối */}
          <circle cx="34" cy="50" r="8.5" fill="#84cc16" stroke="#4d7c0f" strokeWidth="1.5" />
          <circle cx="66" cy="50" r="8.5" fill="#84cc16" stroke="#4d7c0f" strokeWidth="1.5" />
          <circle cx="34" cy="50" r="4.5" fill="#0f172a" />
          <circle cx="66" cy="50" r="4.5" fill="#0f172a" />
          <circle cx="32" cy="48" r="1.8" fill="#ffffff" />
          <circle cx="64" cy="48" r="1.8" fill="#ffffff" />

          {/* Hai má hồng đào nhẹ */}
          <circle cx="24" cy="65" r="5" fill="#fb7185" opacity="0.4" />
          <circle cx="76" cy="65" r="5" fill="#fb7185" opacity="0.4" />

          {/* Mũi tam giác hồng nhỏ */}
          <polygon points="50,61 46,57 54,57" fill="#f43f5e" />

          {/* Miệng cười hình số 3 nằm ngang (:3) */}
          <path d="M42 64 Q46 69 50 65 Q54 69 58 64" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Ria mép trắng sáng vểnh nổi bật trên nền lông tối */}
          <path d="M24 64 L10 62 M24 68 L10 70" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M76 64 L90 62 M76 68 L90 70" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    // 2. Mèo Anh Lông Ngắn (British Shorthair): Mặt tròn phính má bánh bao bạnh 2 bên, tai tam giác bo tròn chếch 45 độ, lông xám xanh, mắt hổ phách đơn sắc con ngươi đen, cười :3
    case 'cat_british':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Đôi tai hình tam giác đỉnh bo tròn, dựng đứng chếch 45 độ rõ ràng */}
          <path d="M22 36 L26 14 C27 12 30 12 32 15 L44 32 Z" fill="#64748b" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="27,17 31,17 40,30 25,30" fill="#fbcfe8" />
          <path d="M78 36 L74 14 C73 12 70 12 68 15 L56 32 Z" fill="#64748b" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="73,17 69,17 60,30 75,30" fill="#fbcfe8" />

          {/* Khuôn mặt tròn xoe, 2 má phính to bạnh sang 2 bên (solid slate/blue-gray) */}
          <path d="M24 38 C32 26 68 26 76 38 C90 48 94 72 78 84 C68 90 32 90 22 84 C6 72 10 48 24 38 Z" fill="#94a3b8" stroke="#334155" strokeWidth="2.5" />

          {/* Đôi má hồng phấn nhẹ nhàng */}
          <circle cx="22" cy="66" r="6" fill="#fb7185" opacity="0.45" />
          <circle cx="78" cy="66" r="6" fill="#fb7185" opacity="0.45" />

          {/* Đôi mắt vàng hổ phách (amber) tròn to đơn sắc với con ngươi đen ở giữa */}
          <circle cx="35" cy="50" r="9" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          <circle cx="65" cy="50" r="9" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          <circle cx="35" cy="50" r="4.5" fill="#1c1917" />
          <circle cx="65" cy="50" r="4.5" fill="#1c1917" />
          <circle cx="33" cy="48" r="1.8" fill="#ffffff" />
          <circle cx="63" cy="48" r="1.8" fill="#ffffff" />

          {/* Mũi tam giác hồng nhỏ */}
          <polygon points="50,60 46,56 54,56" fill="#f43f5e" />

          {/* Miệng cười hình số 3 nằm ngang (:3) */}
          <path d="M42 63 Q46 68 50 64 Q54 68 58 63" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Ria mép trắng thanh thoát */}
          <path d="M24 64 L10 62 M24 68 L10 70" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M76 64 L90 62 M76 68 L90 70" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    // 3. Mèo Xiêm (Siamese Cat): Mặt nạ đen (seal point) quanh mũi miệng, viền ngoài kem sữa, tai nhọn nâu sẫm, mắt hạnh nhân sapphire
    case 'cat_siamese':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Đôi tai to hình tam giác nhọn màu nâu sẫm dựng đứng */}
          <polygon points="18,10 40,34 14,38" fill="#451a03" stroke="#291205" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="20,16 35,33 17,35" fill="#78350f" />
          <polygon points="82,10 86,38 60,34" fill="#451a03" stroke="#291205" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="80,16 83,35 65,33" fill="#78350f" />

          {/* Khuôn mặt thanh tú màu be sáng/kem sữa */}
          <ellipse cx="50" cy="56" rx="38" ry="34" fill="#fef3c7" stroke="#b45309" strokeWidth="2.5" />

          {/* MẶT NẠ NÂU SẪM (SEAL POINT MASK): Vùng chính giữa khuôn mặt quanh mũi và miệng */}
          <path d="M50 40 C42 40 34 46 32 58 C30 70 40 82 50 82 C60 82 70 70 68 58 C66 46 58 40 50 40 Z" fill="#451a03" />

          {/* Đôi mắt hình hạt hạnh nhân (almond eyes) màu xanh sapphire đậm đặc trưng */}
          <path d="M26 52 C30 46 39 48 43 54 C39 60 30 58 26 52 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="1.8" />
          <ellipse cx="34.5" cy="53" rx="3" ry="4" fill="#082f49" />
          <circle cx="33" cy="51" r="1.3" fill="#ffffff" />

          <path d="M74 52 C70 46 61 48 57 54 C61 60 70 58 74 52 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="1.8" />
          <ellipse cx="65.5" cy="53" rx="3" ry="4" fill="#082f49" />
          <circle cx="64" cy="51" r="1.3" fill="#ffffff" />

          {/* Mũi đen nhỏ ở trung tâm mặt nạ */}
          <polygon points="50,65 47,62 53,62" fill="#1c1917" />

          {/* Miệng cười sáng màu kem trên nền mặt nạ */}
          <path d="M45 68 Q48 72 50 69 Q52 72 55 68" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Ria mép trắng thanh thoát */}
          <path d="M30 67 L14 65 M30 71 L16 73" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M70 67 L86 65 M70 71 L84 73" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    // 4. Mèo Tam Thể (Calico Cat): Mặt trắng sữa chủ đạo, 2 đốm tai tự nhiên (cam chóp tai trái, đen chóp tai phải), mắt to cân đối
    case 'cat_calico':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai trái với đốm cam nhạt ở chóp */}
          <polygon points="20,12 40,34 14,36" fill="#ffffff" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="20,12 28,21 16,25" fill="#fb923c" />
          <polygon points="23,22 35,32 18,33" fill="#fbcfe8" />

          {/* Tai phải với đốm đen ở chóp */}
          <polygon points="80,12 86,36 60,34" fill="#ffffff" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="80,12 84,24 72,20" fill="#18181b" />
          <polygon points="77,22 82,33 65,32" fill="#fbcfe8" />

          {/* Khuôn mặt màu trắng sữa chủ đạo */}
          <ellipse cx="50" cy="56" rx="38" ry="32" fill="#ffffff" stroke="#334155" strokeWidth="2.5" />

          {/* Đốm cam nhạt góc trán trái (không che mắt) */}
          <path d="M34 26 C30 32 24 34 18 32 C16 38 20 44 26 44 C30 42 32 36 34 26 Z" fill="#fb923c" />

          {/* Đốm đen/xám đậm góc trán phải (không che mắt) */}
          <path d="M64 26 C68 32 76 34 82 30 C86 36 84 42 78 44 C72 44 68 38 64 26 Z" fill="#18181b" />

          {/* Hai mắt mèo mở to cân đối màu xanh ngọc bích */}
          <circle cx="34" cy="54" r="8" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
          <circle cx="66" cy="54" r="8" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
          <circle cx="34" cy="54" r="4.5" fill="#0f172a" />
          <circle cx="66" cy="54" r="4.5" fill="#0f172a" />
          <circle cx="32" cy="52" r="2" fill="#ffffff" />
          <circle cx="64" cy="52" r="2" fill="#ffffff" />

          {/* Hai má hồng đào */}
          <circle cx="24" cy="65" r="6" fill="#fb7185" opacity="0.45" />
          <circle cx="76" cy="65" r="6" fill="#fb7185" opacity="0.45" />

          {/* Mũi tam giác hồng nhỏ & Miệng cười :3 */}
          <polygon points="50,63 46,59 54,59" fill="#f43f5e" />
          <path d="M42 66 Q46 71 50 67 Q54 71 58 66" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Râu mèo mảnh */}
          <path d="M22 66 L10 64 M22 71 L10 73" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M78 66 L90 64 M78 71 L90 73" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    // 5. Mèo Không Lông Sphynx: Mặt nêm góc cạnh, tai dơi khổng lồ vân sụn, da nhăn nheo, mắt quả chanh to xếch
    case 'cat_sphynx':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cổ thon với nếp gấp da gầy gò đặc trưng */}
          <path d="M40 76 L36 96 L64 96 L60 76" fill="#fbcfe8" stroke="#db2777" strokeWidth="2" />
          <path d="M38 84 Q50 90 62 84" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M40 90 Q50 95 60 90" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* ĐÔI TAI DƠI SIÊU KHỔNG LỒ RỘNG ĐÁY VỚI CÁC ĐƯỜNG GÂN SỤN */}
          {/* Tai trái */}
          <path d="M32 40 C28 22 18 4 6 6 C2 24 14 44 26 50 Z" fill="#f472b6" stroke="#db2777" strokeWidth="2" strokeLinejoin="round" />
          <path d="M28 38 C25 22 18 10 10 10 C8 24 16 40 24 46 Z" fill="#fbcfe8" />
          <path d="M14 18 C18 28 22 36 24 44" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M20 18 C22 26 24 32 25 38" stroke="#db2777" strokeWidth="1" strokeLinecap="round" fill="none" />

          {/* Tai phải */}
          <path d="M68 40 C72 22 82 4 94 6 C98 24 86 44 74 50 Z" fill="#f472b6" stroke="#db2777" strokeWidth="2" strokeLinejoin="round" />
          <path d="M72 38 C75 22 82 10 90 10 C92 24 84 40 76 46 Z" fill="#fbcfe8" />
          <path d="M86 18 C82 28 78 36 76 44" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M80 18 C78 26 76 32 75 38" stroke="#db2777" strokeWidth="1" strokeLinecap="round" fill="none" />

          {/* Đầu hình nêm (modified wedge) với gò má cao & cằm nhọn */}
          <path d="M28 44 C26 52 30 62 36 68 C42 74 44 80 50 82 C56 80 58 74 64 68 C70 62 74 52 72 44 C66 38 34 38 28 44 Z" fill="#fbcfe8" stroke="#db2777" strokeWidth="2.5" />

          {/* Các nếp nhăn trán và gò má đặc trưng của Sphynx */}
          <path d="M38 36 Q50 32 62 36" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M42 40 Q50 37 58 40" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M45 44 Q50 42 55 44" stroke="#db2777" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M48 47 L50 51 L52 47" stroke="#db2777" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Đôi mắt to hình quả chanh xếch nhẹ lên góc tai màu xanh chanh trong vắt */}
          <ellipse cx="36" cy="54" rx="8.5" ry="10" fill="#a3e635" stroke="#65a30d" strokeWidth="1.5" transform="rotate(-12 36 54)" />
          <ellipse cx="64" cy="54" rx="8.5" ry="10" fill="#a3e635" stroke="#65a30d" strokeWidth="1.5" transform="rotate(12 64 54)" />
          <ellipse cx="36" cy="54" rx="4" ry="8" fill="#14532d" transform="rotate(-12 36 54)" />
          <ellipse cx="64" cy="54" rx="4" ry="8" fill="#14532d" transform="rotate(12 64 54)" />
          <circle cx="34" cy="50" r="2.5" fill="#ffffff" />
          <circle cx="62" cy="50" r="2.5" fill="#ffffff" />

          {/* Mõm gầy & Mũi màu hồng sẫm */}
          <polygon points="50,65 46,62 54,62" fill="#be185d" />
          <path d="M44 68 Q50 72 56 68" stroke="#be185d" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M42 66 L38 68 M58 66 L62 68" stroke="#db2777" strokeWidth="1" strokeLinecap="round" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════════════
    // B. 5 GIỐNG CHÓ (DOG SQUAD) — HỚN HỞ, NGÁO NGƠ & ĐÁNG YÊU
    // ═══════════════════════════════════════════════════════════════════════

    // 6. Chó Corgi: Tai to nhọn vểnh, vệt trắng từ trán xuống mõm, cười toe toét thè lưỡi hồng hớn hở
    case 'dog_corgi':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Đôi tai to dựng đứng viền tròn */}
          <polygon points="16,8 38,36 10,38" fill="#ea580c" stroke="#9a3412" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="18,14 34,34 14,36" fill="#fbcfe8" />
          <polygon points="84,8 90,38 62,36" fill="#ea580c" stroke="#9a3412" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="82,14 86,36 66,34" fill="#fbcfe8" />

          {/* Đầu lông vàng cam rực rỡ */}
          <ellipse cx="50" cy="54" rx="40" ry="36" fill="#f97316" stroke="#9a3412" strokeWidth="3" />

          {/* VỆT LÔNG TRẮNG TỪ ĐỈNH TRÁN XUỐNG MÕM (ĐẶC TRƯNG CORGI) */}
          <path d="M46 20 L54 20 L58 48 C70 48 80 58 80 72 C80 82 66 88 50 88 C34 88 20 82 20 72 C20 58 30 48 42 48 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

          {/* Mắt cười híp tít vui vẻ ^v^ */}
          <path d="M28 50 Q34 42 40 50" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M60 50 Q66 42 72 50" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" fill="none" />

          {/* Má hồng đào hớn hở */}
          <circle cx="24" cy="65" r="7" fill="#fb7185" opacity="0.45" />
          <circle cx="76" cy="65" r="7" fill="#fb7185" opacity="0.45" />

          {/* Mũi đen bóng */}
          <ellipse cx="50" cy="60" rx="7" ry="5" fill="#18181b" />

          {/* Miệng cười toe toét thè lưỡi dài hớn hở */}
          <path d="M40 66 Q50 74 60 66" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M44 68 C44 86 56 86 56 68 Z" fill="#f43f5e" stroke="#be123c" strokeWidth="1.5" />
          <line x1="50" y1="70" x2="50" y2="80" stroke="#be123c" strokeWidth="1" />
        </svg>
      );

    // 7. Chó Shiba Inu: Đốm mày trắng tròn, má bầu bĩnh, nụ cười híp mắt meme siêu cưng
    case 'dog_shiba':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai tam giác nhọn đứng màu cam */}
          <polygon points="18,12 36,36 12,36" fill="#d97706" stroke="#92400e" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="20,16 32,34 16,34" fill="#ffffff" />
          <polygon points="82,12 88,36 64,36" fill="#d97706" stroke="#92400e" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="80,16 84,34 68,34" fill="#ffffff" />

          {/* Khuôn mặt cáo lông vàng cam Shiba */}
          <ellipse cx="50" cy="54" rx="40" ry="36" fill="#f59e0b" stroke="#92400e" strokeWidth="3" />

          {/* Má bầu bĩnh màu trắng muốt (Urajiro) */}
          <path d="M16 54 Q10 76 34 82 Q50 82 50 70 Q50 82 66 82 Q90 76 84 54 Q76 42 66 48 Q50 54 34 48 Z" fill="#ffffff" stroke="#fed7aa" strokeWidth="1" />

          {/* ĐỐM MÀY TRẮNG TRÒN ĐẶC TRƯNG CHÓ SHIBA */}
          <circle cx="34" cy="38" r="5" fill="#ffffff" />
          <circle cx="66" cy="38" r="5" fill="#ffffff" />

          {/* Mắt cười híp tít trăng khuyết meme kinh điển ^_^ */}
          <path d="M26 50 Q34 42 42 50" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M58 50 Q66 42 74 50" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" fill="none" />

          {/* Hai má hồng nắn phúng phính */}
          <circle cx="22" cy="65" r="8" fill="#fb7185" opacity="0.45" />
          <circle cx="78" cy="65" r="8" fill="#fb7185" opacity="0.45" />

          {/* Mũi đen nhỏ & Nụ cười mãn nguyện */}
          <ellipse cx="50" cy="60" rx="6" ry="4" fill="#18181b" />
          <path d="M43 65 Q47 71 50 67 Q53 71 57 65" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      );

    // 8. Chó Poodle: Lông xù xoăn tít bồng bềnh (puff cloud), mặt gấu bông teddy bear, thắt nơ đỏ xinh
    case 'dog_poodle':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* HAI TAI LÔNG XOĂN DÀI BỒNG BỀNH RỦ 2 BÊN */}
          <ellipse cx="14" cy="52" rx="12" ry="24" fill="#d97706" stroke="#92400e" strokeWidth="2.5" />
          <circle cx="12" cy="40" r="9" fill="#f59e0b" />
          <circle cx="12" cy="56" r="9" fill="#f59e0b" />
          <circle cx="14" cy="70" r="8" fill="#f59e0b" />
          <ellipse cx="86" cy="52" rx="12" ry="24" fill="#d97706" stroke="#92400e" strokeWidth="2.5" />
          <circle cx="88" cy="40" r="9" fill="#f59e0b" />
          <circle cx="88" cy="56" r="9" fill="#f59e0b" />
          <circle cx="86" cy="70" r="8" fill="#f59e0b" />

          {/* Đầu gấu bông tròn */}
          <circle cx="50" cy="56" r="36" fill="#f59e0b" stroke="#92400e" strokeWidth="3" />

          {/* CHỎM LÔNG XOĂN BỒNG BỀNH TRÊN ĐỈNH ĐẦU (POODLE PUFF) */}
          <circle cx="34" cy="24" r="14" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
          <circle cx="66" cy="24" r="14" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
          <circle cx="50" cy="18" r="15" fill="#fde68a" stroke="#92400e" strokeWidth="2" />

          {/* Chiếc nơ đỏ xinh trên chỏm lông */}
          <polygon points="44,28 56,36 56,28 44,36" fill="#ef4444" />
          <circle cx="50" cy="32" r="3" fill="#b91c1c" />

          {/* Mắt to tròn đen láy long lanh hạt nhãn */}
          <circle cx="35" cy="52" r="8" fill="#18181b" />
          <circle cx="65" cy="52" r="8" fill="#18181b" />
          <circle cx="33" cy="49" r="3" fill="#ffffff" />
          <circle cx="63" cy="49" r="3" fill="#ffffff" />
          <circle cx="37" cy="54" r="1.2" fill="#ffffff" />
          <circle cx="67" cy="54" r="1.2" fill="#ffffff" />

          {/* Má hồng baby */}
          <circle cx="25" cy="65" r="7" fill="#fb7185" opacity="0.5" />
          <circle cx="75" cy="65" r="7" fill="#fb7185" opacity="0.5" />

          {/* Mõm gấu bông tròn & Mũi đen */}
          <ellipse cx="50" cy="66" rx="14" ry="10" fill="#fef3c7" />
          <ellipse cx="50" cy="62" rx="5.5" ry="4" fill="#18181b" />
          <path d="M46 68 Q50 72 54 68" stroke="#451a03" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );

    // 9. Chó Husky: Chuẩn Siberian Husky với mặt nạ xám đen, ngọn lửa trán, mắt xanh băng tuyết & đốm lông mày trắng
    case 'dog_husky':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* ĐÔI TAI SÓI HUSKY TAM GIÁC DỰNG ĐỨNG, VIỀN XÁM ĐEN */}
          <polygon points="17,12 38,36 12,38" fill="#1e293b" stroke="#090d16" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="20,17 34,34 16,35" fill="#fca5a5" opacity="0.9" />
          <polygon points="83,12 88,38 62,36" fill="#1e293b" stroke="#090d16" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="80,17 84,35 66,34" fill="#fca5a5" opacity="0.9" />
          <path d="M22 28 Q26 34 30 32" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <path d="M78 28 Q74 34 70 32" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

          {/* KHỐI ĐẦU HUSKY: MÀU XÁM ĐEN SÓI TUYẾT */}
          <ellipse cx="50" cy="54" rx="40" ry="36" fill="#334155" stroke="#090d16" strokeWidth="2.8" />

          {/* VỆT LÔNG TRẮNG MẶT NẠ ĐẶC TRƯNG HUSKY (MẶT KÍNH & VỆT LỬA TRÁN 3 CHẠC) */}
          <path d="M18 56 C16 74 30 88 50 88 C70 88 84 74 82 56 C80 46 72 44 64 48 C56 52 54 44 52 28 C51 24 49 24 48 28 C46 44 44 52 36 48 C28 44 20 46 18 56 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* MẶT NẠ ĐEN QUANH MẮT HUSKY TÁCH BIỆT */}
          <path d="M26 38 C30 32 40 34 44 44 C38 48 28 46 26 38 Z" fill="#1e293b" />
          <path d="M74 38 C70 32 60 34 56 44 C62 48 72 46 74 38 Z" fill="#1e293b" />
          {/* Đốm lông mày trắng (trang điểm tự nhiên của Husky) */}
          <circle cx="34" cy="36" r="3" fill="#ffffff" />
          <circle cx="66" cy="36" r="3" fill="#ffffff" />

          {/* ĐÔI MẮT XANH BĂNG TUYẾT (ARCTIC ICE BLUE) */}
          <path d="M26 52 Q35 45 44 52 Q35 59 26 52 Z" fill="#ffffff" stroke="#090d16" strokeWidth="2.5" />
          <circle cx="35" cy="52" r="6" fill="#38bdf8" />
          <circle cx="35" cy="52" r="3.2" fill="#0369a1" />
          <circle cx="35" cy="52" r="1.8" fill="#082f49" />
          <circle cx="33.5" cy="50" r="1.5" fill="#ffffff" />

          <path d="M56 52 Q65 45 74 52 Q65 59 56 52 Z" fill="#ffffff" stroke="#090d16" strokeWidth="2.5" />
          <circle cx="65" cy="52" r="6" fill="#38bdf8" />
          <circle cx="65" cy="52" r="3.2" fill="#0369a1" />
          <circle cx="65" cy="52" r="1.8" fill="#082f49" />
          <circle cx="63.5" cy="50" r="1.5" fill="#ffffff" />

          {/* MŨI ĐEN HÌNH TRÁI TIM CỦA CHÓ TUYẾT */}
          <path d="M44 65 C44 62 46 60 50 60 C54 60 56 62 56 65 C56 68 51 71 50 71 C49 71 44 68 44 65 Z" fill="#090d16" />
          <ellipse cx="48" cy="63" rx="1.5" ry="0.8" fill="#64748b" />

          {/* KHÓE MIỆNG CƯỜI NGÁO & LƯỠI HỒNG THÈ RA */}
          <path d="M40 70 Q50 75 60 70" stroke="#090d16" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M47 73 C47 83 55 83 55 73 Z" fill="#fb7185" stroke="#e11d48" strokeWidth="1.5" />
          <line x1="51" y1="73" x2="51" y2="79" stroke="#be123c" strokeWidth="1" />
        </svg>
      );

    // 10. Chó Golden Retriever: Lông vàng kem sáng, tai dài tam giác xuôi rủ mềm ôm sát má, mõm to kem sáng, mũi đen to, miệng mở thè lưỡi hồng cười rạng rỡ
    case 'dog_golden':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Đầu tròn chó Golden màu vàng kem sáng */}
          <ellipse cx="50" cy="50" rx="34" ry="30" fill="#fde047" stroke="#ca8a04" strokeWidth="2.5" />

          {/* ĐÔI TAI DÀI HÌNH TAM GIÁC XUÔI, RỦ MỀM MẠI ÔM SÁT HAI BÊN MÁ */}
          <path d="M22 30 C12 34 8 50 12 70 C16 76 22 76 24 66 C26 56 26 40 24 30 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M78 30 C88 34 92 50 88 70 C84 76 78 76 76 66 C74 56 74 40 76 30 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="2.5" strokeLinejoin="round" />

          {/* Mõm to tròn màu kem sáng hơn thân */}
          <ellipse cx="50" cy="62" rx="18" ry="14" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.8" />

          {/* Đôi mắt to tròn đen láy hiền từ */}
          <circle cx="36" cy="44" r="6.5" fill="#1c1917" />
          <circle cx="64" cy="44" r="6.5" fill="#1c1917" />
          <circle cx="34" cy="42" r="2.2" fill="#ffffff" />
          <circle cx="62" cy="42" r="2.2" fill="#ffffff" />

          {/* Mũi to tròn màu đen bóng */}
          <path d="M44 57 C44 54 56 54 56 57 C56 62 52 64 50 64 C48 64 44 62 44 57 Z" fill="#0f172a" />
          <ellipse cx="48" cy="57" rx="2" ry="1" fill="#64748b" />

          {/* Hai má ửng hồng ấm áp */}
          <circle cx="28" cy="56" r="5" fill="#fb7185" opacity="0.4" />
          <circle cx="72" cy="56" r="5" fill="#fb7185" opacity="0.4" />

          {/* Nụ cười rạng rỡ mở to thè chiếc lưỡi hồng thương hiệu Golden */}
          <path d="M40 64 C40 70 46 72 50 72 C54 72 60 70 60 64" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M44 68 C44 78 56 78 56 68 Z" fill="#991b1b" />
          <path d="M45 70 C45 82 55 82 55 70 Z" fill="#fb7185" stroke="#f43f5e" strokeWidth="1.2" />
          <line x1="50" y1="71" x2="50" y2="78" stroke="#f43f5e" strokeWidth="1.2" />
        </svg>
      );

    // ═══════════════════════════════════════════════════════════════════════
    // C. 20 ĐỘNG VẬT ĐA DẠNG KHÁC — HOẠT HÌNH VUI TƯƠI, ĐÁNG YÊU
    // ═══════════════════════════════════════════════════════════════════════

    // 11. Heo Con (Pig): Tròn vo múp míp, mũi to tròn 2 lỗ, cười híp mắt sung sướng
    case 'animal_pig':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai heo cụp xinh */}
          <polygon points="20,16 36,36 14,40" fill="#f472b6" stroke="#db2777" strokeWidth="2.5" />
          <polygon points="80,16 86,40 64,36" fill="#f472b6" stroke="#db2777" strokeWidth="2.5" />

          {/* Thân heo tròn vo hồng hào */}
          <circle cx="50" cy="54" r="40" fill="#fbcfe8" stroke="#db2777" strokeWidth="3" />

          {/* Mắt cười tít hạnh phúc ^‿^ */}
          <path d="M30 46 Q38 38 46 46" stroke="#831843" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M54 46 Q62 38 70 46" stroke="#831843" strokeWidth="3.5" strokeLinecap="round" fill="none" />

          {/* Má hồng đào tròn xoe */}
          <circle cx="24" cy="58" r="8" fill="#f43f5e" opacity="0.45" />
          <circle cx="76" cy="58" r="8" fill="#f43f5e" opacity="0.45" />

          {/* Chiếc mũi heo to tròn 2 lỗ rõ rệt */}
          <ellipse cx="50" cy="62" rx="16" ry="12" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
          <ellipse cx="44" cy="62" rx="4" ry="5" fill="#831843" />
          <ellipse cx="56" cy="62" rx="4" ry="5" fill="#831843" />
        </svg>
      );

    // 12. Cú Mèo (Owl): Đôi mắt to tròn long lanh chiếm nửa khuôn mặt, đầu nghiêng tò mò
    case 'animal_owl':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai lông vểnh nhọn */}
          <polygon points="24,14 40,36 16,36" fill="#78350f" stroke="#451a03" strokeWidth="2.5" />
          <polygon points="76,14 84,36 60,36" fill="#78350f" stroke="#451a03" strokeWidth="2.5" />

          {/* Thân tròn lông nâu ấm */}
          <circle cx="50" cy="54" r="40" fill="#a16207" stroke="#451a03" strokeWidth="3" />
          {/* Bụng lông đốm hình trái tim */}
          <ellipse cx="50" cy="68" rx="24" ry="20" fill="#fef3c7" />
          <path d="M42 66 Q45 70 48 66 M52 66 Q55 70 58 66" stroke="#a16207" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* ĐÔI MẮT CÚ TO TRÒN LONG LANH KHỔNG LỒ */}
          <circle cx="34" cy="46" r="15" fill="#fef08a" stroke="#ca8a04" strokeWidth="2.5" />
          <circle cx="66" cy="46" r="15" fill="#fef08a" stroke="#ca8a04" strokeWidth="2.5" />
          <circle cx="34" cy="46" r="9.5" fill="#18181b" />
          <circle cx="66" cy="46" r="9.5" fill="#18181b" />
          <circle cx="30" cy="42" r="4.5" fill="#ffffff" />
          <circle cx="62" cy="42" r="4.5" fill="#ffffff" />
          <circle cx="37" cy="49" r="1.8" fill="#ffffff" />
          <circle cx="69" cy="49" r="1.8" fill="#ffffff" />

          {/* Mỏ vàng cam nhỏ xinh */}
          <polygon points="50,58 45,50 55,50" fill="#ea580c" stroke="#9a3412" strokeWidth="1.5" />
        </svg>
      );

    // 13. Cá Nóc (Blowfish): Phồng to tròn xoe như quả bóng, mắt to tròn, thổi bong bóng nước o O °
    case 'animal_blowfish':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Vây đuôi nhỏ xíu vẫy lia lịa */}
          <polygon points="12,46 2,36 2,56" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
          {/* Vây bên nhỏ xíu */}
          <ellipse cx="28" cy="66" rx="8" ry="5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />

          {/* Thân cá nóc tròn xoe căng phồng */}
          <circle cx="54" cy="52" r="38" fill="#fde047" stroke="#ca8a04" strokeWidth="3" />
          {/* Bụng trắng phồng */}
          <ellipse cx="56" cy="65" rx="26" ry="18" fill="#ffffff" />

          {/* Các gai mềm nhỏ dễ thương */}
          <circle cx="44" cy="22" r="2.5" fill="#eab308" />
          <circle cx="60" cy="20" r="2.5" fill="#eab308" />
          <circle cx="76" cy="28" r="2.5" fill="#eab308" />
          <circle cx="36" cy="34" r="2.5" fill="#eab308" />

          {/* Mắt to tròn xoe ngơ ngác */}
          <circle cx="62" cy="42" r="10" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
          <circle cx="62" cy="42" r="6" fill="#082f49" />
          <circle cx="59" cy="39" r="3" fill="#ffffff" />

          {/* Má hồng phấn */}
          <circle cx="50" cy="55" r="7" fill="#fb7185" opacity="0.5" />

          {/* Miệng chu tròn thổi bong bóng */}
          <ellipse cx="88" cy="54" rx="4.5" ry="6" fill="#f43f5e" stroke="#be123c" strokeWidth="1.5" />
          {/* Bong bóng nước bay lên o O */}
          <circle cx="94" cy="42" r="3" fill="#bae6fd" stroke="#38bdf8" strokeWidth="1" opacity="0.8" />
          <circle cx="92" cy="32" r="4.5" fill="#bae6fd" stroke="#38bdf8" strokeWidth="1" opacity="0.8" />
        </svg>
      );

    // 14. Con Lười (Sloth): Nụ cười mỉm chậm rãi siêu chill, mắt lim dim ngủ gật
    case 'animal_sloth':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Thân và đầu lông nâu sáng */}
          <ellipse cx="50" cy="54" rx="40" ry="36" fill="#d6d3d1" stroke="#78716c" strokeWidth="3" />
          {/* Vùng mặt trắng kem */}
          <ellipse cx="50" cy="56" rx="28" ry="24" fill="#fafaf9" />

          {/* Hai mảng sẫm quanh mắt đặc trưng của lười */}
          <ellipse cx="36" cy="52" rx="9" ry="6" fill="#78716c" transform="rotate(-15 36 52)" />
          <ellipse cx="64" cy="52" rx="9" ry="6" fill="#78716c" transform="rotate(15 64 52)" />

          {/* Mắt lim dim ngủ gật siêu chill */}
          <path d="M30 52 Q36 56 42 52" stroke="#292524" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M58 52 Q64 56 70 52" stroke="#292524" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Má ửng hồng dễ chịu */}
          <circle cx="28" cy="62" r="6" fill="#fb7185" opacity="0.45" />
          <circle cx="72" cy="62" r="6" fill="#fb7185" opacity="0.45" />

          {/* Mũi đen & Nụ cười mỉm thanh thản */}
          <ellipse cx="50" cy="60" rx="6" ry="4" fill="#292524" />
          <path d="M44 67 Q50 72 56 67" stroke="#292524" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      );

    // 15. Khỉ (Monkey): Tai to vểnh, cười toe toét nhăn răng tinh nghịch
    case 'animal_monkey':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Đôi tai tròn to vểnh 2 bên */}
          <circle cx="14" cy="52" r="14" fill="#92400e" stroke="#78350f" strokeWidth="2.5" />
          <circle cx="14" cy="52" r="8" fill="#fed7aa" />
          <circle cx="86" cy="52" r="14" fill="#92400e" stroke="#78350f" strokeWidth="2.5" />
          <circle cx="86" cy="52" r="8" fill="#fed7aa" />

          {/* Đầu tròn lông nâu */}
          <circle cx="50" cy="52" r="38" fill="#92400e" stroke="#78350f" strokeWidth="3" />

          {/* Vùng mặt hình trái đào màu da hồng */}
          <path d="M50 36 C42 26 28 28 28 44 C28 62 40 76 50 78 C60 76 72 62 72 44 C72 28 58 26 50 36 Z" fill="#fed7aa" />

          {/* Mắt to đen láy long lanh */}
          <circle cx="38" cy="46" r="6.5" fill="#18181b" />
          <circle cx="62" cy="46" r="6.5" fill="#18181b" />
          <circle cx="36" cy="44" r="2.5" fill="#ffffff" />
          <circle cx="60" cy="44" r="2.5" fill="#ffffff" />

          {/* Má hồng đào tinh nghịch */}
          <circle cx="28" cy="56" r="6" fill="#fb7185" opacity="0.5" />
          <circle cx="72" cy="56" r="6" fill="#fb7185" opacity="0.5" />

          {/* Mũi & Nụ cười ngoác miệng khoe răng nhí nhảnh */}
          <circle cx="47" cy="56" r="1.5" fill="#78350f" />
          <circle cx="53" cy="56" r="1.5" fill="#78350f" />
          <path d="M38 64 Q50 76 62 64 Z" fill="#ffffff" stroke="#78350f" strokeWidth="2" />
          <line x1="50" y1="64" x2="50" y2="70" stroke="#fed7aa" strokeWidth="1.5" />
        </svg>
      );

    // 16. Gấu Trúc (Panda): Béo tròn núng nính, quầng mắt đen to, đang gặm nhánh trúc xanh ngon lành
    case 'animal_panda':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai gấu đen tròn */}
          <circle cx="22" cy="22" r="12" fill="#18181b" />
          <circle cx="78" cy="22" r="12" fill="#18181b" />

          {/* Đầu tròn trắng muốt */}
          <circle cx="50" cy="54" r="40" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />

          {/* Hai quầng mắt đen to đặc trưng Panda */}
          <ellipse cx="34" cy="48" rx="11" ry="14" fill="#18181b" transform="rotate(-15 34 48)" />
          <ellipse cx="66" cy="48" rx="11" ry="14" fill="#18181b" transform="rotate(15 66 48)" />

          {/* Mắt to long lanh bên trong quầng đen */}
          <circle cx="34" cy="48" r="5" fill="#ffffff" />
          <circle cx="66" cy="48" r="5" fill="#ffffff" />
          <circle cx="34" cy="48" r="3.5" fill="#18181b" />
          <circle cx="66" cy="48" r="3.5" fill="#18181b" />
          <circle cx="32" cy="46" r="1.5" fill="#ffffff" />
          <circle cx="64" cy="46" r="1.5" fill="#ffffff" />

          {/* Má hồng phúng phính */}
          <circle cx="24" cy="65" r="7" fill="#fb7185" opacity="0.45" />
          <circle cx="76" cy="65" r="7" fill="#fb7185" opacity="0.45" />

          {/* Mũi đen & Miệng cười */}
          <ellipse cx="50" cy="62" rx="6" ry="4.5" fill="#18181b" />
          <path d="M45 68 Q50 72 55 68" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Nhánh trúc xanh non ngậm ở miệng */}
          <path d="M44 70 L28 82" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="26" cy="80" rx="6" ry="3" fill="#22c55e" transform="rotate(-30 26 80)" />
          <ellipse cx="32" cy="85" rx="6" ry="3" fill="#22c55e" transform="rotate(20 32 85)" />
        </svg>
      );

    // 17. Cáo (Fox): Lông cam rực rỡ, tai nhọn viền đen, má xù trắng, mắt cười tinh ranh đáng yêu
    case 'animal_fox':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai to nhọn chỏm đen */}
          <polygon points="16,8 38,36 10,38" fill="#ea580c" stroke="#9a3412" strokeWidth="2.5" />
          <polygon points="14,6 22,20 10,22" fill="#18181b" />
          <polygon points="20,16 32,32 16,34" fill="#ffffff" />
          <polygon points="84,8 90,38 62,36" fill="#ea580c" stroke="#9a3412" strokeWidth="2.5" />
          <polygon points="86,6 90,22 78,20" fill="#18181b" />
          <polygon points="80,16 84,34 68,32" fill="#ffffff" />

          {/* Đầu cáo thon nhọn lông cam rực rỡ */}
          <polygon points="50,86 10,40 90,40" fill="#f97316" stroke="#9a3412" strokeWidth="3" strokeLinejoin="round" />
          {/* Mảng má trắng xù đặc trưng loài cáo */}
          <polygon points="50,86 14,46 36,54 50,70 64,54 86,46" fill="#ffffff" />

          {/* Mắt cười híp mắt tinh anh đáng yêu ^‿^ */}
          <path d="M26 48 Q34 40 42 48" stroke="#18181b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M58 48 Q66 40 74 48" stroke="#18181b" strokeWidth="3.5" strokeLinecap="round" fill="none" />

          {/* Má hồng đào */}
          <circle cx="24" cy="58" r="6" fill="#fb7185" opacity="0.45" />
          <circle cx="76" cy="58" r="6" fill="#fb7185" opacity="0.45" />

          {/* Mũi đen nhỏ xinh & Miệng mỉm */}
          <circle cx="50" cy="74" r="4.5" fill="#18181b" />
        </svg>
      );

    // 18. Gấu Bắc Cực (Polar Bear): Lông trắng như tuyết tròn vo, quàng khăn len đỏ ấm áp, mắt cười ấm áp
    case 'animal_polar_bear':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai gấu tròn nhỏ xinh */}
          <circle cx="24" cy="20" r="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          <circle cx="24" cy="20" r="5" fill="#fbcfe8" />
          <circle cx="76" cy="20" r="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          <circle cx="76" cy="20" r="5" fill="#fbcfe8" />

          {/* Đầu tròn lông trắng tuyết */}
          <circle cx="50" cy="50" r="38" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />

          {/* Mắt to đen láy long lanh */}
          <circle cx="36" cy="44" r="6" fill="#0f172a" />
          <circle cx="64" cy="44" r="6" fill="#0f172a" />
          <circle cx="34" cy="42" r="2.5" fill="#ffffff" />
          <circle cx="62" cy="42" r="2.5" fill="#ffffff" />

          {/* Má hồng đào ấm áp giữa tuyết */}
          <circle cx="26" cy="54" r="7" fill="#fb7185" opacity="0.45" />
          <circle cx="74" cy="54" r="7" fill="#fb7185" opacity="0.45" />

          {/* Mũi đen to tròn & Miệng cười */}
          <ellipse cx="50" cy="54" rx="7" ry="5" fill="#0f172a" />
          <path d="M44 60 Q50 65 56 60" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Khăn len đỏ ấm áp quàng quanh cổ */}
          <path d="M20 74 C30 82 70 82 80 74 C82 82 78 92 68 94 L32 94 C22 92 18 82 20 74 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
          <rect x="60" y="78" width="12" height="18" rx="2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
          <line x1="63" y1="92" x2="63" y2="96" stroke="#fef08a" strokeWidth="1.5" />
          <line x1="66" y1="92" x2="66" y2="96" stroke="#fef08a" strokeWidth="1.5" />
          <line x1="69" y1="92" x2="69" y2="96" stroke="#fef08a" strokeWidth="1.5" />
        </svg>
      );

    // 19. Chim Cánh Cụt (Penguin): Thân giọt nước tròn trịa xanh đen/than chì, bụng trắng tinh to bản hình quả trứng tương phản cao, mỏ tam giác cam chỉa xuống, má cam đào, cánh vẫy tay
    case 'animal_penguin':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Hai cánh ngắn vươn giang nhẹ tạo dáng vẫy tay dễ thương */}
          <path d="M22 48 C12 54 8 66 12 72 C16 72 22 64 24 56 Z" fill="#0f172a" stroke="#020617" strokeWidth="2" strokeLinejoin="round" />
          <path d="M78 48 C88 44 94 52 92 60 C88 64 80 62 76 56 Z" fill="#0f172a" stroke="#020617" strokeWidth="2" strokeLinejoin="round" />

          {/* Thân hình giọt nước tròn trịa màu than chì/xanh đen mượt mà */}
          <path d="M50 14 C32 14 20 32 20 58 C20 82 32 94 50 94 C68 94 80 82 80 58 C80 32 68 14 50 14 Z" fill="#0f172a" stroke="#020617" strokeWidth="2.5" />

          {/* BỤNG VÀ MẶT TRẮNG TINH HÌNH QUẢ TRỨNG (ĐỘ TƯƠNG PHẢN CAO) */}
          <ellipse cx="50" cy="62" rx="22" ry="26" fill="#ffffff" />
          {/* Mảng trắng trên khuôn mặt kết nối liền mạch */}
          <ellipse cx="42" cy="40" rx="9" ry="12" fill="#ffffff" />
          <ellipse cx="58" cy="40" rx="9" ry="12" fill="#ffffff" />

          {/* Hai bàn chân nhỏ màu cam tươi đỡ bên dưới */}
          <ellipse cx="40" cy="94" rx="6" ry="3.5" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
          <ellipse cx="60" cy="94" rx="6" ry="3.5" fill="#f97316" stroke="#c2410c" strokeWidth="1" />

          {/* Đôi mắt đen láy chấm tròn hiền hòa */}
          <circle cx="43" cy="40" r="3.5" fill="#0f172a" />
          <circle cx="57" cy="40" r="3.5" fill="#0f172a" />
          <circle cx="42" cy="38.5" r="1.2" fill="#ffffff" />
          <circle cx="56" cy="38.5" r="1.2" fill="#ffffff" />

          {/* Mỏ hình tam giác nhỏ màu cam tươi chỉa xuống */}
          <polygon points="50,49 45,43 55,43" fill="#f97316" stroke="#ea580c" strokeWidth="1" />

          {/* Hai má ửng đốm cam/hồng đào tròn xinh xắn */}
          <circle cx="36" cy="48" r="4.5" fill="#fb923c" opacity="0.6" />
          <circle cx="64" cy="48" r="4.5" fill="#fb923c" opacity="0.6" />
        </svg>
      );

    // 20. Sóc (Squirrel): Hai má phồng to tướng, đuôi xù cong vút, hai tay ôm hạt dẻ gặm ngon lành
    case 'animal_squirrel':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Đuôi xù khổng lồ cong vút ra phía sau */}
          <path d="M72 74 C96 60 96 16 72 12 C60 10 56 20 66 32" fill="#b45309" stroke="#78350f" strokeWidth="3" />

          {/* Tai nhọn có chỏm lông */}
          <polygon points="24,14 38,34 18,36" fill="#d97706" stroke="#78350f" strokeWidth="2.5" />
          <polygon points="56,14 68,34 48,36" fill="#d97706" stroke="#78350f" strokeWidth="2.5" />

          {/* Đầu & Hai má phồng to tướng như hai cái bánh bao */}
          <ellipse cx="44" cy="54" rx="34" ry="30" fill="#d97706" stroke="#78350f" strokeWidth="3" />
          <circle cx="24" cy="62" r="15" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
          <circle cx="64" cy="62" r="15" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />

          {/* Mắt to đen láy long lanh */}
          <circle cx="34" cy="46" r="6" fill="#18181b" />
          <circle cx="54" cy="46" r="6" fill="#18181b" />
          <circle cx="32" cy="44" r="2.5" fill="#ffffff" />
          <circle cx="52" cy="44" r="2.5" fill="#ffffff" />

          {/* Má hồng hào */}
          <circle cx="20" cy="64" r="6" fill="#fb7185" opacity="0.45" />
          <circle cx="68" cy="64" r="6" fill="#fb7185" opacity="0.45" />

          {/* Mũi đen nhỏ & Hai răng cửa thỏ nhỏ gặm hạt dẻ */}
          <circle cx="44" cy="56" r="3" fill="#18181b" />
          <rect x="42" y="60" width="4" height="4" rx="1" fill="#ffffff" stroke="#78350f" strokeWidth="1" />

          {/* Hạt dẻ to tròn hai tay ôm chặt */}
          <ellipse cx="44" cy="76" rx="11" ry="12" fill="#78350f" stroke="#451a03" strokeWidth="2" />
          <path d="M33 70 Q44 66 55 70" stroke="#b45309" strokeWidth="2.5" fill="#a16207" />
        </svg>
      );

    // 21. Hươu Cao Cổ (Giraffe): Đôi mắt biếc hàng mi cong, sừng nhỏ xinh, ngậm chiếc lá xanh non
    case 'animal_giraffe':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cổ dài & Đầu hươu */}
          <path d="M34 95 L40 40 Q42 26 54 26 L64 26 Q74 30 68 44 L60 95 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="2.5" />

          {/* Đốm sao cam nâu dễ thương */}
          <circle cx="48" cy="76" r="6" fill="#b45309" opacity="0.85" />
          <circle cx="54" cy="56" r="5" fill="#b45309" opacity="0.85" />
          <circle cx="46" cy="44" r="4" fill="#b45309" opacity="0.85" />

          {/* Hai sừng nhỏ tròn (ossicones) */}
          <line x1="48" y1="26" x2="44" y2="10" stroke="#b45309" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="43" cy="9" r="4" fill="#78350f" />
          <line x1="62" y1="26" x2="64" y2="10" stroke="#b45309" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="65" cy="9" r="4" fill="#78350f" />

          {/* Đôi tai vểnh sang hai bên */}
          <polygon points="40,26 24,22 32,32" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
          <polygon points="68,26 84,22 76,32" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />

          {/* Mắt to biếc tròn xoe có hàng mi cong vút */}
          <circle cx="48" cy="30" r="5" fill="#1e293b" />
          <circle cx="46" cy="28" r="2" fill="#ffffff" />
          <path d="M44 26 L42 23 M48 25 L48 22" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />

          {/* Mõm tròn màu kem sữa */}
          <ellipse cx="60" cy="36" rx="12" ry="8" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
          <circle cx="56" cy="36" r="2" fill="#78350f" />
          <circle cx="64" cy="36" r="2" fill="#78350f" />

          {/* Má hồng đào */}
          <circle cx="46" cy="36" r="4" fill="#fb7185" opacity="0.5" />

          {/* Chiếc lá xanh non ngậm ở miệng */}
          <path d="M66 38 Q78 36 82 28 Q78 42 66 40 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
        </svg>
      );

    // 22. Hải Cẩu (Seal): Thân thon ngư lôi, đầu trơn không vành tai, đệm râu dày râu cước cong dài, mắt to ướt át lòng đại dương
    case 'animal_seal':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tảng băng trôi xanh ngọc phía dưới */}
          <path d="M10 88 C20 82 80 82 90 88 L94 98 L6 98 Z" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5" />

          {/* Thân hải cẩu thuôn mượt hình ngư lôi (torpedo shape) */}
          <path d="M26 84 C20 74 24 50 32 38 C40 26 60 26 68 38 C76 50 80 74 74 84 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" />

          {/* Đốm xám tự nhiên trên lưng hải cẩu */}
          <circle cx="34" cy="42" r="2" fill="#94a3b8" />
          <circle cx="66" cy="42" r="2" fill="#94a3b8" />
          <circle cx="50" cy="36" r="1.5" fill="#94a3b8" />
          <circle cx="30" cy="56" r="2.5" fill="#94a3b8" />
          <circle cx="70" cy="56" r="2.5" fill="#94a3b8" />

          {/* Hai vây trước có móng vuốt nhỏ úp vào ngực */}
          <path d="M26 78 C28 66 38 70 42 76 C38 82 28 82 26 78 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M74 78 C72 66 62 70 58 76 C62 82 72 82 74 78 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Đôi mắt to tròn đen láy, ươn ướt, sâu thẳm như đại dương */}
          <ellipse cx="38" cy="46" rx="7.5" ry="8.5" fill="#0f172a" stroke="#020617" strokeWidth="1.5" />
          <ellipse cx="62" cy="46" rx="7.5" ry="8.5" fill="#0f172a" stroke="#020617" strokeWidth="1.5" />
          <circle cx="35" cy="43" r="3" fill="#ffffff" />
          <circle cx="59" cy="43" r="3" fill="#ffffff" />
          <circle cx="40" cy="49" r="1.5" fill="#ffffff" />
          <circle cx="64" cy="49" r="1.5" fill="#ffffff" />

          {/* KHỐI ĐỆM RÂU DÀY PHỒNG ĐẶC TRƯNG HẢI CẨU (VIBRISSAE PADS) */}
          <path d="M42 56 C36 56 32 64 38 70 C44 74 48 68 50 63 C52 68 56 74 62 70 C68 64 64 56 58 56 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* Mũi đen hình chữ V (lỗ mũi khép kín) */}
          <path d="M46 59 L50 64 L54 59" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* RÂU CƯỚC TRẮNG DÀI CONG VÚT RỦ XUỐNG */}
          <path d="M38 64 C26 64 16 70 12 76" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M38 67 C24 69 16 76 10 82" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M62 64 C74 64 84 70 88 76" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M62 67 C76 69 84 76 90 82" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );

    // 23. Rùa Con (Turtle): Góc nhìn ngang (side-view), mai vòm bán nguyệt xanh rêu vân lục giác tối giản, đầu nhô cổ ngắn mắt tròn chấm đen, chân mái chèo
    case 'animal_turtle':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Đuôi rùa nhỏ nhọn phía sau */}
          <path d="M16 68 L8 70 L16 72 Z" fill="#6ee7b7" stroke="#064e3b" strokeWidth="1.8" />

          {/* 2 chân bè dạng mái chèo dễ thương */}
          <path d="M26 70 C24 78 28 84 32 84 C36 84 36 76 34 70 Z" fill="#6ee7b7" stroke="#064e3b" strokeWidth="2" strokeLinejoin="round" />
          <path d="M64 70 C66 78 72 84 76 84 C80 84 78 76 74 70 Z" fill="#6ee7b7" stroke="#064e3b" strokeWidth="2" strokeLinejoin="round" />

          {/* Đầu rùa nhô ra phía trước với cổ ngắn */}
          <path d="M72 62 C74 54 78 50 84 50 C91 50 96 55 96 62 C96 68 89 72 74 70 Z" fill="#6ee7b7" stroke="#064e3b" strokeWidth="2.5" />
          {/* Mắt tròn chấm đen thân thiện */}
          <circle cx="86" cy="57" r="3.5" fill="#0f172a" />
          <circle cx="85" cy="55.5" r="1.2" fill="#ffffff" />
          {/* Má hồng nhẹ & Miệng cười hiền hòa */}
          <circle cx="82" cy="63" r="2.2" fill="#fb7185" opacity="0.6" />
          <path d="M86 64 Q90 66 93 63" stroke="#064e3b" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* MAI RÙA VÒM BÁN NGUYỆT MÀU XANH RÊU ĐẬM (FLAT PROFILE) */}
          <path d="M18 68 C18 36 78 36 78 68 Z" fill="#059669" stroke="#064e3b" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Gờ viền mai dưới */}
          <rect x="16" y="65" width="64" height="6" rx="3" fill="#10b981" stroke="#064e3b" strokeWidth="2" />

          {/* ĐƯỜNG LINE KẺ VÂN LỤC GIÁC TỐI GIẢN TRÊN MAI */}
          <path d="M34 65 L40 48 L56 48 L62 65" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M48 48 L48 37" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M28 56 L40 48" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M68 56 L56 48" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );

    // 24. Thỏ Trắng (Rabbit): Tai dài mềm mại duyên dáng, mắt sapphire long lanh, má hồng phấn ngọt ngào, miệng xinh :3
    case 'animal_rabbit':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* ĐÔI TAI THỎ DÀI MỀM MẠI, BO TRÒN DỄ THƯƠNG */}
          {/* Tai trái: Dựng thẳng duyên dáng */}
          <path d="M30 46 C22 30 22 6 32 4 C42 2 44 24 38 46 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M31 40 C26 28 26 10 32 8 C38 6 39 24 35 40 Z" fill="#fbcfe8" />

          {/* Tai phải: Hơi nghiêng nhẹ điệu đà */}
          <path d="M60 46 C56 26 62 6 72 8 C80 10 76 32 68 46 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M62 40 C59 26 64 12 70 13 C75 14 72 30 66 40 Z" fill="#fbcfe8" />

          {/* KHUÔN MẶT THỎ TRÒN TRĨNH, MÁ BẦU BĨNH KAWAII */}
          <ellipse cx="50" cy="62" rx="36" ry="30" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />

          {/* CHỎM LÔNG TƠ GIỮA TRÁN */}
          <path d="M47 38 C49 33 51 33 53 38" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* ĐÔI MẮT LONG LANH TO TRÒN ÁNH ĐEN SAPPHIRE & 2 ĐIỂM SÁNG LẤP LÁNH */}
          <circle cx="34" cy="58" r="6.5" fill="#1e1b4b" />
          <circle cx="32" cy="55.5" r="2.5" fill="#ffffff" />
          <circle cx="36" cy="60" r="1.2" fill="#ffffff" />

          <circle cx="66" cy="58" r="6.5" fill="#1e1b4b" />
          <circle cx="64" cy="55.5" r="2.5" fill="#ffffff" />
          <circle cx="68" cy="60" r="1.2" fill="#ffffff" />

          {/* LÔNG MI CONG NHẸ CỰC ĐÁNG YÊU */}
          <path d="M28 53 L26 50 M32 51 L31 48" stroke="#1e1b4b" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M72 53 L74 50 M68 51 L69 48" stroke="#1e1b4b" strokeWidth="1.8" strokeLinecap="round" />

          {/* HAI ĐỐM MÁ HỒNG PHẤN TRÒN XOE NGỌT NGÀO */}
          <circle cx="23" cy="67" r="7" fill="#fb7185" opacity="0.45" />
          <circle cx="77" cy="67" r="7" fill="#fb7185" opacity="0.45" />

          {/* MŨI HỒNG HÌNH TIM NHỎ & NỤ CƯỜI CHỮ :3 SIÊU XINH */}
          <path d="M47 64 C47 62 48.5 61 50 62.5 C51.5 61 53 62 53 64 C53 66 50.5 67.5 50 67.5 C49.5 67.5 47 66 47 64 Z" fill="#f43f5e" />
          <path d="M44 68 Q50 72 50 68 Q50 72 56 68" stroke="#64748b" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* RIA MÉP MẢNH MAI */}
          <line x1="22" y1="64" x2="12" y2="62" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="68" x2="14" y2="70" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="78" y1="64" x2="88" y2="62" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="78" y1="68" x2="86" y2="70" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    // 25. Voi Con (Elephant): Bé Dumbo má tròn phúng phính, tai to quạt mềm, mắt boba long lanh, vòi cong phun giọt nước may mắn
    case 'animal_elephant':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* ĐÔI TAI VOI TO TRÒN HÌNH QUẠT SIÊU ĐÁNG YÊU (DUMBO STYLE) */}
          <ellipse cx="20" cy="48" rx="16" ry="22" fill="#94a3b8" stroke="#334155" strokeWidth="2.5" transform="rotate(-10 20 48)" />
          <ellipse cx="21" cy="48" rx="11" ry="16" fill="#fbcfe8" transform="rotate(-10 21 48)" />

          <ellipse cx="80" cy="48" rx="16" ry="22" fill="#94a3b8" stroke="#334155" strokeWidth="2.5" transform="rotate(10 80 48)" />
          <ellipse cx="79" cy="48" rx="11" ry="16" fill="#fbcfe8" transform="rotate(10 79 48)" />

          {/* KHỐI ĐẦU TRÒN BẦU BĨNH MÀU XANH XÁM PASTEL */}
          <circle cx="50" cy="52" r="32" fill="#cbd5e1" stroke="#334155" strokeWidth="2.5" />

          {/* CHỎM TÓC MỀM TRÊN ĐỈNH ĐẦU */}
          <path d="M47 22 C48 16 50 16 51 22 M50 16 C52 13 54 17 53 22" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* ĐÔI MẮT LONG LANH TO TRÒN ĐEN LÁY (KAWAII BOBA EYES) */}
          <circle cx="35" cy="46" r="6" fill="#0f172a" />
          <circle cx="33" cy="43.5" r="2.2" fill="#ffffff" />
          <circle cx="36.5" cy="47.5" r="1.2" fill="#ffffff" />

          <circle cx="65" cy="46" r="6" fill="#0f172a" />
          <circle cx="63" cy="43.5" r="2.2" fill="#ffffff" />
          <circle cx="66.5" cy="47.5" r="1.2" fill="#ffffff" />

          {/* HAI GÒ MÁ ỬNG HỒNG BẦU BĨNH */}
          <circle cx="27" cy="56" r="6.5" fill="#fb7185" opacity="0.45" />
          <circle cx="73" cy="56" r="6.5" fill="#fb7185" opacity="0.45" />

          {/* KHÓE MIỆNG CƯỜI TƯƠI MỈM DƯỚI GỐC VÒI */}
          <path d="M42 63 Q50 68 58 63" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* CHIẾC VÒI VOI THON MỀM, UỐN CONG VỂNH LÊN ĐÁNG YÊU */}
          <path d="M46 50 C46 64 48 76 56 76 C63 76 67 69 64 61 C61 54 55 57 56 62 C57 65 60 65 61 63 C61.5 62 61 61 60 61 C59 61 58 63 60 64 C60 66 57 69 54 69 C49 69 49 60 49 50 Z" fill="#94a3b8" stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
          <line x1="47" y1="56" x2="51" y2="56" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="47.5" y1="62" x2="52" y2="62" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

          {/* GIỌT NƯỚC / HẠT NGỌC MAY MẮN PHUN RA TỪ ĐẦU VÒI */}
          <circle cx="65" cy="48" r="2.5" fill="#38bdf8" />
          <circle cx="71" cy="43" r="1.8" fill="#38bdf8" />
          <circle cx="67" cy="40" r="1.2" fill="#38bdf8" />
        </svg>
      );

    // 26. Ngựa (Horse): Tuấn mã góc nghiêng dũng mãnh, sống mũi dài vệt lang trắng, mõm mềm lỗ mũi to, bờm cuồn cuộn bay trong gió, tai vểnh tinh anh
    case 'animal_horse':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* CỔ & THÂN NGỰA NÂU HẠT DẺ UỐN LƯỢN KIÊU HÃNH */}
          <path d="M22 96 C24 74 30 52 42 36 L52 36 C42 56 38 76 34 96 Z" fill="#b45309" stroke="#78350f" strokeWidth="2.5" />

          {/* KHỐI ĐẦU TUẤN MÃ THON DÀI CHUẨN DÁNG EQUINE */}
          <path d="M36 96 C32 76 36 52 44 32 C48 30 54 28 58 28 C62 32 68 42 74 50 L84 62 C88 66 86 72 80 76 L72 78 C64 80 50 78 44 68 C38 78 34 88 36 96 Z" fill="#d97706" stroke="#78350f" strokeWidth="3" strokeLinejoin="round" />

          {/* VÙNG QUAI HÀM NỞ NANG MẠNH MẼ (MANDIBLE JAW) */}
          <circle cx="50" cy="58" r="14" fill="#b45309" stroke="#78350f" strokeWidth="1.5" opacity="0.6" />

          {/* VỆT LANG TRẮNG QUÝ PHÁI TRÊN SỐNG MŨI (BLAZE MARKING) */}
          <path d="M54 34 L62 48 L68 58 L62 58 L54 46 L48 34 Z" fill="#ffffff" opacity="0.95" />

          {/* MÕM MỀM MÀI MÀU KEM HỒNG & LỖ MŨI PHẬP PHỒNG (FLARED NOSTRIL) */}
          <path d="M68 56 L84 64 C88 68 86 74 80 77 L70 77 C66 72 64 64 68 56 Z" fill="#fef3c7" stroke="#78350f" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="80" cy="69" rx="3" ry="4.5" fill="#78350f" transform="rotate(-20 80 69)" />
          {/* Khóe môi cười tuấn tú */}
          <path d="M74 74 Q77 76 81 72" stroke="#78350f" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* ĐÔI TAI NGỰA BÚP MĂNG VỂNH NGHE NGÓNG */}
          {/* Tai sau */}
          <path d="M40 14 C38 20 40 28 44 30 C48 28 46 20 44 14 Z" fill="#b45309" stroke="#78350f" strokeWidth="2" />
          {/* Tai trước */}
          <path d="M48 10 C46 16 48 26 54 28 C58 26 56 16 52 10 Z" fill="#d97706" stroke="#78350f" strokeWidth="2" />
          <path d="M50 14 C49 18 50 24 53 26 C55 24 54 18 52 14 Z" fill="#fde68a" />

          {/* MẮT NGỰA TO SÁNG THÔNG MINH CÓ MI TRÊN SẮC NÉT */}
          <ellipse cx="56" cy="42" rx="6" ry="7" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
          <path d="M49 39 Q56 36 63 41" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="54" cy="40" r="2.5" fill="#ffffff" />
          <circle cx="58" cy="44" r="1.2" fill="#ffffff" />

          {/* TÓC MÁI (FORELOCK) RỦ XUỐNG TRÁN */}
          <path d="M48 22 C52 26 58 32 54 38 C50 36 48 28 46 24 Z" fill="#451a03" stroke="#270e02" strokeWidth="1" />

          {/* BỜM NGỰA DÀY CUỒN CUỘN UỐN LƯỢN BAY THEO GIÓ (FLOWING MANE) */}
          <path d="M42 26 C30 24 22 32 24 40 C32 40 38 34 40 30 Z" fill="#451a03" stroke="#270e02" strokeWidth="1" />
          <path d="M38 34 C24 34 16 44 18 54 C28 52 34 44 36 38 Z" fill="#78350f" stroke="#451a03" strokeWidth="1" />
          <path d="M34 48 C18 48 10 60 12 70 C24 66 30 58 32 52 Z" fill="#451a03" stroke="#270e02" strokeWidth="1" />
          <path d="M30 62 C14 64 6 76 8 86 C20 82 28 72 28 66 Z" fill="#78350f" stroke="#451a03" strokeWidth="1" />
          <path d="M26 78 C12 82 6 92 6 98 C18 94 24 88 26 82 Z" fill="#451a03" stroke="#270e02" strokeWidth="1" />
        </svg>
      );

    // 27. Hổ Con (Tiger): Hổ béo chibi, chữ Vương 王 nhỏ xíu trên trán, nhe 2 răng nanh sữa làm bộ gầm gừ cưng xỉu
    case 'animal_tiger':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai hổ tròn xoe */}
          <circle cx="22" cy="20" r="12" fill="#ea580c" stroke="#9a3412" strokeWidth="2.5" />
          <circle cx="22" cy="20" r="6" fill="#18181b" />
          <circle cx="78" cy="20" r="12" fill="#ea580c" stroke="#9a3412" strokeWidth="2.5" />
          <circle cx="78" cy="20" r="6" fill="#18181b" />

          {/* Mặt hổ tròn to núng nính */}
          <circle cx="50" cy="54" r="40" fill="#f97316" stroke="#9a3412" strokeWidth="3" />

          {/* CHỮ VƯƠNG (王) TRÊN TRÁN CỦA CHÚA SƠN LÂM */}
          <line x1="42" y1="20" x2="58" y2="20" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="44" y1="25" x2="56" y2="25" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
          <line x1="40" y1="30" x2="60" y2="30" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="20" x2="50" y2="30" stroke="#18181b" strokeWidth="2.5" />

          {/* Vằn hổ 2 bên má */}
          <path d="M14 48 L24 50 M12 56 L22 57 M14 64 L24 63" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
          <path d="M86 48 L76 50 M88 56 L78 57 M86 64 L76 63" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />

          {/* Mắt to hổ phách vàng rực long lanh */}
          <circle cx="34" cy="48" r="9" fill="#fde047" stroke="#ca8a04" strokeWidth="2" />
          <circle cx="66" cy="48" r="9" fill="#fde047" stroke="#ca8a04" strokeWidth="2" />
          <circle cx="34" cy="48" r="5" fill="#0f172a" />
          <circle cx="66" cy="48" r="5" fill="#0f172a" />
          <circle cx="31" cy="45" r="3" fill="#ffffff" />
          <circle cx="63" cy="45" r="3" fill="#ffffff" />

          {/* Má trắng phồng */}
          <ellipse cx="38" cy="65" rx="10" ry="8" fill="#ffffff" />
          <ellipse cx="62" cy="65" rx="10" ry="8" fill="#ffffff" />

          {/* Mũi hồng & Hai răng nanh sữa bé xíu làm bộ gầm "gừ gừ" */}
          <polygon points="50,60 44,54 56,54" fill="#ea580c" />
          <path d="M43 65 Q50 72 57 65" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <polygon points="44,66 46,71 48,66" fill="#ffffff" />
          <polygon points="52,66 54,71 56,66" fill="#ffffff" />
        </svg>
      );

    // 28. Chuột Hamster (Hamster): Thân tròn vo hạt đậu, má phồng căng, hai tay nhỏ ôm hạt hướng dương
    case 'animal_hamster':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tai chuột tròn xoe */}
          <circle cx="24" cy="20" r="10" fill="#f97316" stroke="#c2410c" strokeWidth="2" />
          <circle cx="24" cy="20" r="5.5" fill="#fbcfe8" />
          <circle cx="76" cy="20" r="10" fill="#f97316" stroke="#c2410c" strokeWidth="2" />
          <circle cx="76" cy="20" r="5.5" fill="#fbcfe8" />

          {/* Thân tròn xoe núng nính lông vàng mơ */}
          <ellipse cx="50" cy="56" rx="38" ry="34" fill="#fb923c" stroke="#c2410c" strokeWidth="3" />
          {/* Hai má bánh bao phồng tướng phúng phính */}
          <circle cx="24" cy="62" r="16" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.5" />
          <circle cx="76" cy="62" r="16" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.5" />
          <ellipse cx="50" cy="66" rx="22" ry="18" fill="#fff7ed" />

          {/* Mắt to đen láy long lanh hai đốm sáng */}
          <circle cx="34" cy="46" r="6.5" fill="#0f172a" />
          <circle cx="66" cy="46" r="6.5" fill="#0f172a" />
          <circle cx="32" cy="44" r="2.5" fill="#ffffff" />
          <circle cx="64" cy="44" r="2.5" fill="#ffffff" />

          {/* Má hồng đào */}
          <circle cx="22" cy="64" r="7" fill="#fb7185" opacity="0.5" />
          <circle cx="78" cy="64" r="7" fill="#fb7185" opacity="0.5" />

          {/* Mũi hồng nhỏ */}
          <circle cx="50" cy="54" r="3" fill="#f43f5e" />

          {/* Hạt hướng dương to bự ôm trước ngực */}
          <polygon points="50,62 40,78 50,86 60,78" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="50" y1="64" x2="50" y2="84" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      );

    // 29. Ếch (Frog): Xanh ngọc bích tròn vo, mắt lồi long lanh đỉnh đầu, cười ngoác miệng tới mang tai
    case 'animal_frog':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* ĐÔI MẮT LỒI TRÒN XOE LONG LANH TRÊN ĐỈNH ĐẦU */}
          <circle cx="28" cy="28" r="16" fill="#22c55e" stroke="#15803d" strokeWidth="3" />
          <circle cx="72" cy="28" r="16" fill="#22c55e" stroke="#15803d" strokeWidth="3" />
          <circle cx="28" cy="28" r="10" fill="#fef08a" />
          <circle cx="72" cy="28" r="10" fill="#fef08a" />
          <circle cx="28" cy="28" r="6" fill="#0f172a" />
          <circle cx="72" cy="28" r="6" fill="#0f172a" />
          <circle cx="25" cy="25" r="3" fill="#ffffff" />
          <circle cx="69" cy="25" r="3" fill="#ffffff" />

          {/* Đầu & Thân ếch to bè màu xanh nõn chuối */}
          <ellipse cx="50" cy="60" rx="42" ry="32" fill="#22c55e" stroke="#15803d" strokeWidth="3" />
          {/* Bụng vàng chanh */}
          <ellipse cx="50" cy="68" rx="26" ry="20" fill="#bef264" />

          {/* Hai má hồng tròn xoe đào ngọt ngào */}
          <circle cx="22" cy="60" r="8" fill="#fb7185" opacity="0.6" />
          <circle cx="78" cy="60" r="8" fill="#fb7185" opacity="0.6" />

          {/* Nụ cười ngoác miệng tới mang tai cực kỳ vui vẻ */}
          <path d="M22 56 Q50 82 78 56" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </svg>
      );

    // 30. Ong Mật (Bee): Thân bầu dục mập mạp nằm ngang màu vàng tươi, 2 sọc đen to bản rõ ràng, cánh trắng trong suốt giọt nước dựng đứng, râu xoắn ốc nhẹ, mặt cười chấm tròn
    case 'animal_bee':
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cặp cánh trắng trong suốt hình giọt nước dựng đứng trên lưng viền xanh dương nhạt */}
          <path d="M46 36 C42 16 28 10 24 16 C20 24 34 36 46 38 Z" fill="#ffffff" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" />
          <path d="M56 36 C52 14 66 8 70 14 C74 22 62 34 54 38 Z" fill="#ffffff" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" />

          {/* Thân ong hình bầu dục mập mạp (chubby bumblebee) nằm ngang */}
          <ellipse cx="50" cy="58" rx="36" ry="28" fill="#facc15" stroke="#18181b" strokeWidth="2.5" />

          {/* ĐÚNG 2 SỌC ĐEN TO BẢN RÕ RÀNG */}
          <path d="M42 31 C46 45 46 71 42 85 L50 86 C54 72 54 44 50 30 Z" fill="#18181b" />
          <path d="M60 33 C64 47 64 69 60 83 L68 81 C72 67 72 47 68 35 Z" fill="#18181b" />

          {/* Ngòi ong nhỏ xíu ở đuôi bên phải */}
          <polygon points="86,58 92,58 86,61" fill="#18181b" />

          {/* Mắt chấm tròn đơn giản hiền lành */}
          <circle cx="28" cy="52" r="3.5" fill="#18181b" />
          <circle cx="27" cy="50.5" r="1.2" fill="#ffffff" />

          {/* Hai má hồng tươi */}
          <circle cx="24" cy="62" r="4.5" fill="#fb7185" opacity="0.6" />

          {/* Nụ cười cong vui tươi */}
          <path d="M26 60 Q30 65 34 60" stroke="#18181b" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Đôi râu cong xoắn ốc nhẹ trên đỉnh đầu */}
          <path d="M30 32 C26 22 18 20 20 16 C22 12 28 14 26 18" stroke="#18181b" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M36 30 C34 18 28 14 30 10 C32 6 38 8 36 12" stroke="#18181b" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );

    // Default fallback
    default:
      return (
        <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="44" fill={avatar.accentColor} opacity="0.15" />
          <circle cx="50" cy="50" r="40" stroke={avatar.accentColor} strokeWidth="3" />
          <text x="50" y="66" fontSize="50" textAnchor="middle" dominantBaseline="central">
            {avatar.emoji}
          </text>
        </svg>
      );
  }
}
