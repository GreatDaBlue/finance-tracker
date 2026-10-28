export interface AnimalAvatar {
  id: string;
  name: string;
  englishName: string;
  group: 'cat' | 'dog' | 'other';
  groupTitle: string;
  description: string;
  emoji: string;
  badge: string;
  bgGradient: string;
  accentColor: string;
}

export const ANIMAL_AVATARS: AnimalAvatar[] = [
  // ── A. 5 Giống Mèo (Cat Squad) ───────────────────────────────────────────
  {
    id: 'cat_tabby',
    name: 'Mèo Mướp',
    englishName: 'Tabby Cat',
    group: 'cat',
    groupTitle: 'Cat Squad (Mèo)',
    description: 'Lông xám sẫm màu tối, chữ M trán, vằn đen, mắt sáng, cười :3',
    emoji: '🐱',
    badge: 'Mèo Mướp',
    bgGradient: 'from-slate-600 via-zinc-700 to-neutral-900',
    accentColor: '#475569'
  },
  {
    id: 'cat_british',
    name: 'Mèo Anh Lông Ngắn',
    englishName: 'British Shorthair',
    group: 'cat',
    groupTitle: 'Cat Squad (Mèo)',
    description: 'Má bánh bao phúng phính bạnh 2 bên, mắt vàng hổ phách, cười :3',
    emoji: '😺',
    badge: 'Mèo Anh Lông Ngắn',
    bgGradient: 'from-slate-400 to-zinc-600',
    accentColor: '#64748b'
  },
  {
    id: 'cat_siamese',
    name: 'Mèo Xiêm',
    englishName: 'Siamese Cat',
    group: 'cat',
    groupTitle: 'Cat Squad (Mèo)',
    description: 'Mặt nạ nâu sẫm seal point, tai nhọn dựng, mắt hạnh nhân sapphire',
    emoji: '😻',
    badge: 'Mèo Xiêm',
    bgGradient: 'from-stone-300 to-amber-700',
    accentColor: '#b45309'
  },
  {
    id: 'cat_calico',
    name: 'Mèo Tam Thể',
    englishName: 'Calico Cat',
    group: 'cat',
    groupTitle: 'Cat Squad (Mèo)',
    description: 'Mặt trắng sữa, chóp tai trái cam, chóp tai phải đen, mắt xanh ngọc',
    emoji: '😸',
    badge: 'Mèo Tam Thể',
    bgGradient: 'from-orange-300 via-stone-400 to-zinc-800',
    accentColor: '#18181b'
  },
  {
    id: 'cat_sphynx',
    name: 'Mèo Sphynx',
    englishName: 'Sphynx Cat',
    group: 'cat',
    groupTitle: 'Cat Squad (Mèo)',
    description: 'Đầu nêm gầy gò, da nhăn nheo, tai dơi khổng lồ, mắt chanh xếch',
    emoji: '🙀',
    badge: 'Mèo Sphynx',
    bgGradient: 'from-pink-300 to-rose-400',
    accentColor: '#f43f5e'
  },

  // ── B. 5 Giống Chó (Dog Squad) ───────────────────────────────────────────
  {
    id: 'dog_corgi',
    name: 'Chó Corgi',
    englishName: 'Corgi',
    group: 'dog',
    groupTitle: 'Dog Squad (Chó)',
    description: 'Tai to vểnh cao, vệt trán trắng, cười toe toét thè lưỡi',
    emoji: '🐶',
    badge: 'Chó Corgi',
    bgGradient: 'from-amber-400 to-yellow-500',
    accentColor: '#eab308'
  },
  {
    id: 'dog_shiba',
    name: 'Chó Shiba Inu',
    englishName: 'Shiba Inu',
    group: 'dog',
    groupTitle: 'Dog Squad (Chó)',
    description: 'Đốm mày trắng tròn, má bầu bĩnh, nụ cười híp mắt meme',
    emoji: '🐕',
    badge: 'Chó Shiba Inu',
    bgGradient: 'from-yellow-500 to-amber-600',
    accentColor: '#d97706'
  },
  {
    id: 'dog_poodle',
    name: 'Chó Poodle',
    englishName: 'Poodle',
    group: 'dog',
    groupTitle: 'Dog Squad (Chó)',
    description: 'Lông xoăn tít bồng bềnh, mặt gấu bông teddy bear thắt nơ',
    emoji: '🐩',
    badge: 'Chó Poodle',
    bgGradient: 'from-rose-300 to-pink-500',
    accentColor: '#ec4899'
  },
  {
    id: 'dog_husky',
    name: 'Chó Husky',
    englishName: 'Husky',
    group: 'dog',
    groupTitle: 'Dog Squad (Chó)',
    description: 'Mắt xanh băng tuyết, mặt nạ đen vệt lửa trán, tai tam giác sói tuyết',
    emoji: '🐺',
    badge: 'Chó Husky',
    bgGradient: 'from-slate-700 via-zinc-800 to-neutral-900',
    accentColor: '#38bdf8'
  },
  {
    id: 'dog_golden',
    name: 'Chó Golden',
    englishName: 'Golden Retriever',
    group: 'dog',
    groupTitle: 'Dog Squad (Chó)',
    description: 'Lông vàng kem sáng, tai cụp xuôi ôm má, thè lưỡi hồng cười tươi',
    emoji: '🦮',
    badge: 'Chó Golden',
    bgGradient: 'from-amber-300 to-yellow-600',
    accentColor: '#ca8a04'
  },

  // ── C. 20 Động vật đa dạng khác (Wild & Farm Animals) ─────────────────────
  {
    id: 'animal_pig',
    name: 'Heo Con',
    englishName: 'Piggy',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Tròn vo múp míp, mũi tròn 2 lỗ, cười tít mắt sung sướng',
    emoji: '🐷',
    badge: 'Heo Con',
    bgGradient: 'from-pink-300 to-rose-400',
    accentColor: '#fb7185'
  },
  {
    id: 'animal_owl',
    name: 'Cú Mèo',
    englishName: 'Owl',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Mắt to tròn long lanh chiếm nửa khuôn mặt, đầu nghiêng tò mò',
    emoji: '🦉',
    badge: 'Cú Mèo',
    bgGradient: 'from-indigo-400 to-purple-600',
    accentColor: '#7c3aed'
  },
  {
    id: 'animal_monkey',
    name: 'Khỉ Con',
    englishName: 'Monkey',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Tai to tròn vểnh, cười toe toét nhăn răng nhí nhảnh',
    emoji: '🐒',
    badge: 'Khỉ Con',
    bgGradient: 'from-amber-400 to-orange-600',
    accentColor: '#ea580c'
  },
  {
    id: 'animal_panda',
    name: 'Gấu Trúc',
    englishName: 'Panda',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Béo tròn núng nính, quầng mắt to, gặm nhánh trúc xanh',
    emoji: '🐼',
    badge: 'Gấu Trúc',
    bgGradient: 'from-slate-300 via-zinc-400 to-neutral-700',
    accentColor: '#404040'
  },
  {
    id: 'animal_fox',
    name: 'Cáo Đỏ',
    englishName: 'Fox',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Lông cam rực rỡ, tai nhọn viền đen, má xù trắng đáng yêu',
    emoji: '🦊',
    badge: 'Cáo Đỏ',
    bgGradient: 'from-orange-400 to-red-500',
    accentColor: '#f97316'
  },
  {
    id: 'animal_polar_bear',
    name: 'Gấu Bắc Cực',
    englishName: 'Polar Bear',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Lông trắng tuyết tròn vo, quàng khăn len đỏ ấm áp',
    emoji: '🐻‍❄️',
    badge: 'Gấu Bắc Cực',
    bgGradient: 'from-sky-200 via-cyan-300 to-blue-400',
    accentColor: '#0284c7'
  },
  {
    id: 'animal_penguin',
    name: 'Chim Cánh Cụt',
    englishName: 'Penguin',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Thân giọt nước xanh đen, bụng trắng tinh quả trứng, mỏ tam giác cam',
    emoji: '🐧',
    badge: 'Chim Cánh Cụt',
    bgGradient: 'from-blue-900 to-slate-900',
    accentColor: '#1e293b'
  },
  {
    id: 'animal_squirrel',
    name: 'Sóc Con',
    englishName: 'Squirrel',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Hai má phồng to tướng, đuôi xù cong vút ôm hạt dẻ',
    emoji: '🐿️',
    badge: 'Sóc Con',
    bgGradient: 'from-amber-500 to-yellow-600',
    accentColor: '#b45309'
  },
  {
    id: 'animal_giraffe',
    name: 'Hươu Cao Cổ',
    englishName: 'Giraffe',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Mắt biếc hàng mi cong, sừng nhỏ xinh, ngậm lá non',
    emoji: '🦒',
    badge: 'Hươu Cao Cổ',
    bgGradient: 'from-yellow-400 to-amber-500',
    accentColor: '#d97706'
  },
  {
    id: 'animal_seal',
    name: 'Hải Cẩu',
    englishName: 'Seal',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Thân ngư lôi, đầu trơn râu cước dày cong, mắt to ướt át',
    emoji: '🦭',
    badge: 'Hải Cẩu',
    bgGradient: 'from-cyan-300 to-blue-500',
    accentColor: '#0ea5e9'
  },
  {
    id: 'animal_rabbit',
    name: 'Thỏ Trắng',
    englishName: 'Rabbit',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Tai dài mềm mại, mắt sapphire long lanh, má hồng phấn kawaii',
    emoji: '🐰',
    badge: 'Thỏ Trắng',
    bgGradient: 'from-pink-300 via-rose-300 to-purple-300',
    accentColor: '#f43f5e'
  },
  {
    id: 'animal_elephant',
    name: 'Voi Con',
    englishName: 'Elephant',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Tai quạt lớn mềm mại, ngà trắng nhỏ xinh, vòi vểnh phun tim tài lộc',
    emoji: '🐘',
    badge: 'Voi Con',
    bgGradient: 'from-sky-500 via-blue-600 to-indigo-700',
    accentColor: '#0284c7'
  },
  {
    id: 'animal_horse',
    name: 'Ngựa Con',
    englishName: 'Horse',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Góc nghiêng tuấn mã, sống mũi dài vệt lang, bờm lộng gió',
    emoji: '🐴',
    badge: 'Ngựa Con',
    bgGradient: 'from-stone-400 to-amber-700',
    accentColor: '#78350f'
  },
  {
    id: 'animal_tiger',
    name: 'Hổ Con',
    englishName: 'Tiger',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Hổ béo chibi, chữ Vương 王 trán, nanh sữa gầm gừ cưng xỉu',
    emoji: '🐯',
    badge: 'Hổ Con',
    bgGradient: 'from-amber-400 to-red-500',
    accentColor: '#ea580c'
  },
  {
    id: 'animal_hamster',
    name: 'Chuột Hamster',
    englishName: 'Hamster',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Tròn vo hạt đậu, má bánh bao phồng, ôm hạt hướng dương',
    emoji: '🐹',
    badge: 'Chuột Hamster',
    bgGradient: 'from-yellow-300 to-orange-400',
    accentColor: '#f59e0b'
  },
  {
    id: 'animal_bee',
    name: 'Ong Mật',
    englishName: 'Bee',
    group: 'other',
    groupTitle: 'Muông thú (Wild & Farm)',
    description: 'Thân mập vàng tươi 2 sọc đen to bản, cánh trắng giọt nước, râu xoắn',
    emoji: '🐝',
    badge: 'Ong Mật',
    bgGradient: 'from-yellow-400 to-amber-500',
    accentColor: '#eab308'
  }
];

export function getAnimalAvatar(avatarId?: string | null): AnimalAvatar | undefined {
  if (!avatarId) return undefined;
  return ANIMAL_AVATARS.find(a => a.id === avatarId);
}
