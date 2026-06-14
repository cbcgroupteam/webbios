import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { User, Mail, Shield, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { webbios } from '../api';

const AccountPage = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const { t } = useTranslation();

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cdnUrl, setCdnUrl] = useState('https://cdn.webbios.dev');

  useEffect(() => {
    webbios.settings.getSettings().then(settings => {
      if (settings['system.cdn_url']) {
        let url = settings['system.cdn_url'];
        // remove quotes if stringified
        if (url.startsWith('"')) url = JSON.parse(url);
        setCdnUrl(url);
      }
    }).catch(console.error);
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', t('Vui lòng chọn file hình ảnh'));
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const res = await webbios.media.upload(file, 'UserProfiles');
      if (res.success && res.data?.url) {
        const updateRes = await webbios.auth.updateProfile({ firstName, lastName, avatarUrl: res.data.url });
        if (updateRes.success) {
          showToast('success', t('Cập nhật ảnh đại diện thành công'));
          await refreshUser();
        } else {
          showToast('error', updateRes.error || t('Có lỗi khi lưu ảnh đại diện'));
        }
      } else {
        showToast('error', res.error || t('Có lỗi khi upload ảnh'));
      }
    } catch (error: any) {
      showToast('error', error.message || t('Lỗi kết nối'));
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateProfile = async () => {
    if (!firstName || !lastName) {
      showToast('error', t('Vui lòng nhập đầy đủ họ và tên'));
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const res = await webbios.auth.updateProfile({ firstName, lastName });
      if (res.success) {
        showToast('success', t('Cập nhật hồ sơ thành công!'));
        await refreshUser();
      } else {
        showToast('error', res.error || t('Cập nhật thất bại'));
      }
    } catch (error: any) {
      showToast('error', error.message || t('Lỗi kết nối'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('error', t('Vui lòng nhập đầy đủ thông tin mật khẩu'));
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', t('Mật khẩu xác nhận không khớp'));
      return;
    }
    if (newPassword.length < 8) {
      showToast('error', t('Mật khẩu mới phải từ 8 ký tự trở lên'));
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const res = await webbios.auth.changePassword({ currentPassword, newPassword });
      if (res.success) {
        showToast('success', t('Đổi mật khẩu thành công!'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast('error', res.error || t('Đổi mật khẩu thất bại'));
      }
    } catch (error: any) {
      showToast('error', error.message || t('Lỗi kết nối'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg text-white z-50 transition-opacity animate-in fade-in ${toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toastMessage.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-cf-text">{t('account.title')}</h1>
        <p className="text-sm text-cf-gray-text mt-1">{t('account.description')}</p>
      </div>

      <div className="bg-surface border border-cf-border rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-cf-border bg-gray-50/50 flex overflow-x-auto">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3.5 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <User size={16} />
            <span>{t('account.tabs.profile')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('password')}
            className={`px-6 py-3.5 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'password' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <Shield size={16} />
            <span>{t('account.tabs.security')}</span>
          </button>
        </div>

        <div className="p-6 md:p-8">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center space-x-6">
                <div 
                  onClick={handleAvatarClick}
                  className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 text-3xl font-bold border-4 border-white shadow-md relative group cursor-pointer overflow-hidden"
                >
                  {isUploadingAvatar ? (
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : user?.avatarUrl ? (
                    <img src={`${cdnUrl.replace(/\/$/, '')}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}`} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />
                  ) : (
                    <span>{firstName.charAt(0) || 'U'}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">{t('users.actions.edit')}</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{firstName} {lastName}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Mail size={14} className="mr-1.5" />
                    {user?.email}
                  </div>
                  <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {t('account.profile.role')} {user?.roleName || (user?.role === 'owner' ? t('system.roles.modal.namePlaceholder', 'Admin') : user?.role)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('account.profile.firstName')}</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 bg-background border border-cf-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('account.profile.lastName')}</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 bg-background border border-cf-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('account.profile.email')}</label>
                  <input type="email" value={user?.email || ''} disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 cursor-not-allowed" />
                  <p className="text-xs text-gray-500 mt-1">{t('account.profile.emailNote')}</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-cf-border">
                <button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md transition-colors shadow-sm font-medium disabled:opacity-50">
                  <Save size={16} />
                  <span>{isUpdatingProfile ? t('Đang lưu...') : t('account.profile.update')}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-6 max-w-md animate-in fade-in duration-300">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('account.security.currentPassword')}</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-background border border-cf-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('account.security.newPassword')}</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-background border border-cf-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('account.security.confirmPassword')}</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-background border border-cf-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="pt-4">
                <button onClick={handleUpdatePassword} disabled={isUpdatingPassword} className="w-full flex justify-center items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md transition-colors shadow-sm font-medium disabled:opacity-50">
                  <Shield size={16} />
                  <span>{isUpdatingPassword ? t('Đang đổi...') : t('account.security.update')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
