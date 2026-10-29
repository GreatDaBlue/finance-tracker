import React, { useState, useEffect, useRef } from 'react';
import {
  api,
  getUserDisplayName,
  type User
} from '../lib/api';
import {
  ANIMAL_AVATARS,
  getAnimalAvatar,
  type AnimalAvatar
} from '../lib/animalAvatars';
import AnimalAvatarGraphic from './AnimalAvatarGraphic';
import {
  getAllCategories,
  getCustomCategories,
  addCustomCategory,
  deleteCustomCategory,
  type CustomCategory
} from '../lib/customCategories';
import {
  X,
  Edit3,
  Check,
  Lock,
  Tag,
  Download,
  Upload,
  Sun,
  Moon,
  LogOut,
  Info,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Shield,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileJson,
  Key,
  Heart,
  Loader2,
  Smartphone
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenImport: () => void;
  onOpenInstallGuide?: () => void;
}

export default function SideDrawer({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onLogout,
  theme,
  onToggleTheme,
  onOpenImport,
  onOpenInstallGuide
}: Props) {
  const userName = getUserDisplayName(user);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Inline edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Sub-modals
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(user?.avatar || '');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAppInfoModal, setShowAppInfoModal] = useState(false);

  // Đồng bộ selectedAvatarId khi mở popup avatar
  useEffect(() => {
    if (showAvatarPicker) {
      setSelectedAvatarId(user?.avatar || '');
      setAvatarError('');
      setAvatarSuccess(false);
    }
  }, [showAvatarPicker, user?.avatar]);

  // Change password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [isSavingPw, setIsSavingPw] = useState(false);

  // Custom category form
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  // Feedback form
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    if (user) {
      setNameInput(user.name || user.username);
    }
  }, [user]);

  useEffect(() => {
    setCategories(getAllCategories());
  }, [showCategoryModal]);

  // Đóng drawer khi ấn Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showAvatarPicker) setShowAvatarPicker(false);
        else if (showCategoryModal) setShowCategoryModal(false);
        else if (showExportModal) setShowExportModal(false);
        else if (showPasswordModal) setShowPasswordModal(false);
        else if (showFeedbackModal) setShowFeedbackModal(false);
        else if (showAppInfoModal) setShowAppInfoModal(false);
        else if (isOpen) onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showAvatarPicker, showCategoryModal, showExportModal, showPasswordModal, showFeedbackModal, showAppInfoModal]);

  if (!isOpen) return null;

  const currentAvatar = getAnimalAvatar(user?.avatar);
  const selectedAnimal = getAnimalAvatar(selectedAvatarId);

  // Lưu tên trực tiếp
  async function handleSaveName() {
    if (!nameInput.trim()) return;
    setIsSavingName(true);
    try {
      const res = await api.updateProfile({ name: nameInput.trim() });
      onUserUpdated(res.user);
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
      alert('Không thể lưu tên, vui lòng thử lại.');
    } finally {
      setIsSavingName(false);
    }
  }

  // Xác nhận lưu Avatar (Optimistic Update 0ms)
  async function handleConfirmAvatar() {
    if (isSavingAvatar) return;
    setIsSavingAvatar(true);
    setAvatarError('');

    const previousAvatar = user?.avatar;
    // Cập nhật giao diện tức thì để người dùng thấy đổi ngay lập tức
    if (user) {
      onUserUpdated({ ...user, avatar: selectedAvatarId });
    }

    try {
      const res = await api.updateProfile({ avatar: selectedAvatarId });
      onUserUpdated(res.user);
      setAvatarSuccess(true);
      setTimeout(() => {
        setShowAvatarPicker(false);
        setAvatarSuccess(false);
      }, 350);
    } catch (err: unknown) {
      console.error(err);
      // Rollback lại avatar cũ nếu gặp lỗi
      if (user && previousAvatar !== undefined) {
        onUserUpdated({ ...user, avatar: previousAvatar });
      }
      setAvatarError(err instanceof Error ? err.message : 'Không thể cập nhật avatar, vui lòng thử lại.');
    } finally {
      setIsSavingAvatar(false);
    }
  }

  // Đổi mật khẩu
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 4) {
      setPwError('Mật khẩu mới phải có ít nhất 4 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsSavingPw(true);
    try {
      await api.changePassword({ oldPassword, newPassword });
      setPwSuccess('Đã đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwSuccess('');
      }, 1500);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Có lỗi khi đổi mật khẩu');
    } finally {
      setIsSavingPw(false);
    }
  }

  // Thêm danh mục mới
  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCustomCategory({
      name: newCatName.trim(),
      icon: newCatIcon || '🏷️',
      color: '#3b82f6',
      type: newCatType
    });
    setNewCatName('');
    setCategories(getAllCategories());
  }

  // Xóa danh mục
  function handleDeleteCategory(id: string) {
    deleteCustomCategory(id);
    setCategories(getAllCategories());
  }

  // Xuất file CSV / JSON
  function handleExportFile(format: 'json' | 'csv') {
    window.open(`/api/transactions/export?format=${format}`, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Side Drawer container — Chỉ chiếm 2/3 màn hình mobile (66.7vw), trên desktop tối đa 320px */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 left-0 z-50 flex"
      >
        <div className="w-[66.7vw] max-w-xs sm:w-80 h-full bg-white dark:bg-zinc-900 shadow-2xl border-r border-slate-200/80 dark:border-zinc-800 flex flex-col justify-between animate-in slide-in-from-left duration-250 select-none overflow-hidden">
          {/* ═════════ HEADER NGĂN KÉO: HỒ SƠ CÁ NHÂN ═════════ */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-zinc-800 bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-blue-950/20 dark:via-zinc-900 dark:to-zinc-900">
            <div className="flex items-center justify-between pb-2.5">
              <span className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wider truncate">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Hồ sơ tài khoản
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="Đóng menu"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Avatar & Tên & Email — Avatar bé gọn gàng */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-0.5">
              {/* Avatar với nút đổi: bé hẳn lại (44px - 48px) */}
              <div className="relative group shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center p-0.5 shadow-sm transition-transform hover:scale-105 active:scale-95 overflow-hidden border border-black/5 dark:border-white/10 ${
                    currentAvatar
                      ? `bg-gradient-to-br ${currentAvatar.bgGradient}`
                      : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-sm sm:text-base'
                  }`}
                  title="Nhấn để đổi Avatar con vật tài chính"
                >
                  {currentAvatar ? (
                    <AnimalAvatarGraphic avatarId={currentAvatar.id} className="w-full h-full object-contain filter drop-shadow-xs" />
                  ) : (
                    userName.charAt(0).toUpperCase() || 'U'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs border border-white dark:border-zinc-900 text-[8px]"
                  title="Đổi Avatar"
                >
                  ✏️
                </button>
              </div>

              {/* Tên & Inline Edit */}
              <div className="min-w-0 flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      className="w-full px-1.5 py-0.5 text-xs font-bold rounded-lg border border-blue-400 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shrink-0"
                      title="Lưu tên"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group/name">
                    <h3
                      className="font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => setIsEditingName(true)}
                      title="Nhấn để đổi tên hiển thị"
                    >
                      {userName}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors shrink-0"
                      title="Chỉnh sửa tên hiển thị"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Tên linh vật */}
                {currentAvatar && (
                  <span className="inline-block mt-0.5 text-[9.5px] sm:text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 px-1.5 py-0.5 rounded truncate max-w-full">
                    🐾 {currentAvatar.name}
                  </span>
                )}

                {/* Email / ID đăng nhập */}
                <p className="text-[10px] sm:text-[10.5px] text-slate-400 dark:text-zinc-500 truncate mt-0.5" title={`Tài khoản: @${user?.username}`}>
                  @{user?.username || 'khach'} {user?.email ? `• ${user.email}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* ═════════ BODY NGĂN KÉO: DANH SÁCH TIỆN ÍCH ═════════ */}
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 space-y-1">
            {/* 1. Quản lý danh mục */}
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                    Quản lý danh mục
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                    Thêm, sửa, xóa danh mục
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* 2. Sao lưu & Xuất dữ liệu */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                    Sao lưu & Xuất file
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                    Xuất Excel, JSON, Import
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* 3. Đổi mật khẩu */}
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    Đổi mật khẩu
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                    Tăng cường bảo mật
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* 4. Cài đặt App trên điện thoại (PWA) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenInstallGuide) {
                  onOpenInstallGuide();
                }
              }}
              className="w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      Cài đặt App điện thoại
                    </h4>
                    <span className="text-[9px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1 py-0.2 rounded-sm shrink-0">
                      PWA
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                    Thêm vào màn hình chính
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* 5. Gửi góp ý & Báo lỗi */}
            <button
              type="button"
              onClick={() => setShowFeedbackModal(true)}
              className="w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors truncate">
                    Góp ý & Báo lỗi
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                    Chia sẻ ý kiến phản hồi
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* 6. Thông tin ứng dụng */}
            <button
              type="button"
              onClick={() => setShowAppInfoModal(true)}
              className="w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center font-bold shrink-0">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    Thông tin ứng dụng
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                    Tiền Đâu Rồi? • v1.2.0
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>

          {/* ═════════ FOOTER NGĂN KÉO: THEME & ĐĂNG XUẤT ═════════ */}
          <div className="p-3 sm:p-3.5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60 space-y-2">
            {/* Chuyển đổi giao diện Sáng / Tối */}
            <div
              onClick={onToggleTheme}
              className="flex items-center justify-between p-2 sm:p-2.5 bg-white dark:bg-zinc-800/90 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors select-none"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  theme === 'dark' ? 'bg-indigo-950/60 text-indigo-400' : 'bg-amber-50 text-amber-500'
                }`}>
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">
                    {theme === 'dark' ? 'Giao diện Tối' : 'Giao diện Sáng'}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                    {theme === 'dark' ? 'Chế độ Dark Mode' : 'Chế độ Light Mode'}
                  </p>
                </div>
              </div>

              <div
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                  theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  style={{ transform: theme === 'dark' ? 'translateX(22px)' : 'translateX(2px)' }}
                  className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out"
                >
                  {theme === 'dark' ? (
                    <Moon className="w-2.5 h-2.5 text-indigo-600" />
                  ) : (
                    <Sun className="w-2.5 h-2.5 text-amber-500" />
                  )}
                </span>
              </div>
            </div>

            {/* Nút Đăng xuất viền đỏ */}
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-rose-300 dark:border-rose-900/80 bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs font-bold transition-all shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Đăng xuất tài khoản</span>
            </button>

            {/* Watermark tác giả */}
            <div className="pt-1 pb-0.5 text-center select-none">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 text-[10.5px] text-slate-500 dark:text-zinc-400 font-medium shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Designed &amp; Crafted by</span>
                <strong className="text-slate-800 dark:text-zinc-100 font-bold">Hoàng</strong>
                <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500 shrink-0 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════ MODAL: CHỌN AVATAR ĐỘNG VẬT TÀI CHÍNH (30 AVATARS) ═════════ */}
      {showAvatarPicker && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          style={{ zIndex: 70 }}
          onClick={() => setShowAvatarPicker(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-xl max-h-[90vh] flex flex-col p-4 sm:p-5 space-y-3 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>🐾</span> Chọn Avatar Đại Diện
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">
                  Chọn con vật bạn yêu thích rồi nhấn Xác nhận đổi Avatar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thanh xem trước Avatar đang chọn */}
            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center p-1 shrink-0 shadow-sm overflow-hidden ${
                  selectedAnimal
                    ? `bg-gradient-to-br ${selectedAnimal.bgGradient}`
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base'
                }`}>
                  {selectedAnimal ? (
                    <AnimalAvatarGraphic avatarId={selectedAnimal.id} className="w-full h-full object-contain filter drop-shadow-xs" />
                  ) : (
                    userName.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                    <span>{selectedAnimal ? `${selectedAnimal.emoji} ${selectedAnimal.name}` : 'Chữ cái mặc định'}</span>
                    {selectedAnimal && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full bg-blue-100/70 dark:bg-blue-950/60 shrink-0">
                        {selectedAnimal.englishName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                    {selectedAnimal ? selectedAnimal.description : 'Sử dụng chữ cái đầu tiên làm đại diện mặc định'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAvatarId('');
                  setAvatarError('');
                }}
                className={`text-xs px-2.5 py-1.5 rounded-xl border transition-colors shrink-0 ml-2 ${
                  selectedAvatarId === ''
                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
                title="Bỏ avatar con vật, dùng chữ cái đầu tiên"
              >
                Chữ mặc định
              </button>
            </div>

            {/* Grid Avatars — Bấm chọn để xem trước */}
            <div className="flex-1 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 sm:gap-3 p-1 max-h-[46vh]">
              {ANIMAL_AVATARS.map(avatar => {
                const isSelected = selectedAvatarId === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatarId(avatar.id);
                      setAvatarError('');
                    }}
                    className={`group relative p-1.5 rounded-2xl border flex items-center justify-center transition-all cursor-pointer aspect-square ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/60 shadow-md scale-102'
                        : 'bg-slate-50/60 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-700/60 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-blue-400'
                    }`}
                    title={avatar.name}
                  >
                    {/* Hình avatar đáng yêu */}
                    <div className={`w-full h-full rounded-xl bg-gradient-to-br ${avatar.bgGradient} flex items-center justify-center p-1.5 shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-transform group-hover:scale-105`}>
                      <AnimalAvatarGraphic avatarId={avatar.id} className="w-full h-full object-contain filter drop-shadow-xs" />
                    </div>

                    {/* Checkmark đang chọn */}
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs text-[11px] font-black border-2 border-white dark:border-zinc-900 animate-in zoom-in-50 duration-150">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {avatarError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {avatarError}
              </div>
            )}

            {/* Footer avatar picker với NÚT XÁC NHẬN */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAvatarPicker(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAvatar}
                disabled={isSavingAvatar}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSavingAvatar ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu Avatar...</span>
                  </>
                ) : avatarSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Đã lưu thành công!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Xác nhận đổi Avatar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ MODAL: QUẢN LÝ DANH MỤC CHI TIÊU ═════════ */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          style={{ zIndex: 70 }}
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-lg max-h-[85vh] flex flex-col p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Quản lý danh mục chi tiêu & thu nhập
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form thêm danh mục mới */}
            <form onSubmit={handleAddCategory} className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200/80 dark:border-purple-900/60 space-y-2.5">
              <div className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Thêm danh mục riêng:
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={e => setNewCatIcon(e.target.value)}
                    placeholder="Icon"
                    className="w-full text-center px-1 py-2 text-base rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-800 focus:outline-none"
                    title="Biểu tượng Emoji"
                  />
                </div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Tên danh mục (ví dụ: Gym, Thú cưng...)"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
                <div className="col-span-4">
                  <select
                    value={newCatType}
                    onChange={e => setNewCatType(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs font-medium rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="expense">Chi tiêu</option>
                    <option value="income">Thu nhập</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
              >
                + Thêm danh mục này
              </button>
            </form>

            {/* Danh sách danh mục */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">{cat.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                      cat.type === 'expense'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : cat.type === 'income'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}>
                      {cat.type === 'expense' ? 'Chi tiêu' : cat.type === 'income' ? 'Thu nhập' : 'Cả hai'}
                    </span>
                  </div>

                  <div>
                    {cat.isDefault ? (
                      <span className="text-[10px] text-slate-400 font-medium italic">Mặc định</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                        title="Xóa danh mục tự tạo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═════════ MODAL: SAO LƯU & XUẤT DỮ LIỆU ═════════ */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          style={{ zIndex: 70 }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Sao lưu & Xuất dữ liệu
              </h3>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Dữ liệu tài chính là của bạn. Bạn có thể tải toàn bộ lịch sử thu chi về máy để lưu trữ hoặc nhập lại khi cần.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleExportFile('csv')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 hover:bg-emerald-100 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Xuất báo cáo Excel / CSV</h4>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">Mở được trên Excel, Google Sheets</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => handleExportFile('json')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-100 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">Sao lưu file JSON chuẩn</h4>
                    <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80">Lưu trọn vẹn mọi trường dữ liệu</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  onOpenImport();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60 hover:bg-purple-100 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">Nhập dữ liệu từ file (Import)</h4>
                    <p className="text-[11px] text-purple-700/80 dark:text-purple-400/80">Khôi phục dữ liệu từ file sao lưu</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ MODAL: ĐỔI MẬT KHẨU ═════════ */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          style={{ zIndex: 70 }}
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Đổi mật khẩu tài khoản
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  Mật khẩu hiện tại:
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu đang dùng"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  Mật khẩu mới:
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 4 ký tự"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  Xác nhận mật khẩu mới:
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {pwError && (
                <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl">{pwError}</p>
              )}
              {pwSuccess && (
                <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl font-bold">{pwSuccess}</p>
              )}

              <button
                type="submit"
                disabled={isSavingPw}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isSavingPw ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═════════ MODAL: GÓP Ý & BÁO LỖI ═════════ */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          style={{ zIndex: 70 }}
          onClick={() => setShowFeedbackModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                Gửi góp ý & Báo lỗi
              </h3>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedbackSent ? (
              <div className="text-center py-6 space-y-2">
                <span className="text-4xl">💌</span>
                <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-100">Cảm ơn bạn rất nhiều!</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Góp ý của bạn đã được ghi nhận để cải tiến ứng dụng tốt hơn mỗi ngày.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackSent(false);
                    setShowFeedbackModal(false);
                  }}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-zinc-300">
                  Bạn gặp sự cố, thấy tính năng cần cải thiện hoặc muốn đề xuất ý tưởng mới cho <strong>Tiền Đâu Rồi?</strong>:
                </p>
                <textarea
                  value={feedbackContent}
                  onChange={e => setFeedbackContent(e.target.value)}
                  placeholder="Nhập nội dung góp ý hoặc mô tả lỗi tại đây..."
                  rows={4}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (feedbackContent.trim()) {
                      setFeedbackSent(true);
                      setFeedbackContent('');
                    }
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Gửi phản hồi ngay
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════ MODAL: THÔNG TIN ỨNG DỤNG ═════════ */}
      {showAppInfoModal && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
          style={{ zIndex: 70 }}
          onClick={() => setShowAppInfoModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto shadow-xl border border-slate-200 dark:border-zinc-800">
              <img src="/logo.png" alt="Tiền Đâu Rồi Logo" className="w-full h-full object-cover" />
            </div>

            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-zinc-100">
                Tiền Đâu Rồi?
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                Quản lý Thu Chi & Tài Chính Cá Nhân Thông Minh
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-2xl text-xs space-y-1.5 text-left border border-slate-100 dark:border-zinc-800">
              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                <span>Thiết kế &amp; Tác giả:</span>
                <strong className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                  Hoàng <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
                </strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                <span>Phiên bản:</span>
                <strong className="text-blue-600">v1.2.5</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                <span>Ngày cập nhật:</span>
                <strong>29/10/2026</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                <span>Cơ sở dữ liệu:</span>
                <strong>SQLite / PostgreSQL Cloud</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-relaxed">
              Ứng dụng hỗ trợ ghi chép giọng nói tiếng Việt, phân tích chuẩn vàng 50/30/20, sổ nợ cá nhân và quản lý nợ thẻ tín dụng.
            </p>

            <button
              type="button"
              onClick={() => setShowAppInfoModal(false)}
              className="w-full py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
