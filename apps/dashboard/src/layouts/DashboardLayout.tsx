import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import * as LucideIcons from 'lucide-react';
import { Search, Cloud, ChevronRight, ChevronDown, Menu, HelpCircle, User, PanelLeftClose, PanelLeftOpen, Bell, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { webbios } from '../api';
import { useEffect } from 'react';
import { useUpdateChecker } from '../hooks/useUpdateChecker';

interface LayoutProps {
  children: ReactNode;
}

type MenuItemType = {
  id: string;
  label: string;
  title?: string;
  icon?: any;
  iconName?: string;
  children?: MenuItemType[];
  isCategory?: boolean;
  isActive?: boolean;
  isBeta?: boolean;
  path?: string;
  permission?: string;
};

export const DashboardLayout = ({ children }: LayoutProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissions, logout } = useAuth();
  const { hasUpdate } = useUpdateChecker();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [cdnUrl, setCdnUrl] = useState('https://cdn.webbios.dev');

  useEffect(() => {
    webbios.settings.getSettings().then(settings => {
      if (settings['system.cdn_url']) {
        let url = settings['system.cdn_url'];
        if (url.startsWith('"')) url = JSON.parse(url);
        setCdnUrl(url);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'investigate': true,
    'logExplorer': true,
    'commerce': true,
    'webbios': true
  });
  const [dynamicMenus, setDynamicMenus] = useState<any[]>([]);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const res = await webbios.menus.getMenus();
        setDynamicMenus(res.data || []);
      } catch (error) {
        console.error('Failed to load menus:', error);
      }
    };
    if (user) {
      fetchMenus();
    }

    const handleUpdate = () => fetchMenus();
    window.addEventListener('menusUpdated', handleUpdate);
    return () => window.removeEventListener('menusUpdated', handleUpdate);
  }, [user]);

  const effectivelyCollapsed = isSidebarCollapsed && !isHoverExpanded;


  const toggleMenu = (id: string) => {
    if (effectivelyCollapsed) {
      setIsSidebarCollapsed(false);
      setIsHoverExpanded(false);
    }
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const hasPermission = (perm?: string) => {
    if (!perm) return true;
    if (user?.role === 'owner') return true;
    return permissions?.includes(perm);
  };

  // Map API menu format to MenuItemType
  const mapApiMenu = (apiItem: any): MenuItemType => {
    // Determine icon component
    const IconCmp = apiItem.icon ? (LucideIcons as any)[apiItem.icon] : null;

    // Determine localized label
    const currentLang = i18n.language; // 'en' or 'vi'
    
    let translationsObj: any = apiItem.translations;
    if (typeof translationsObj === 'string') {
      try {
        translationsObj = JSON.parse(translationsObj);
      } catch (e) {
        translationsObj = {};
      }
    }
    
    const localizedLabel = translationsObj?.[currentLang] || apiItem.label || apiItem.title;

    // Determine if it's a category
    const isCategory = translationsObj?.isCategory || false;

    let iconEl = IconCmp ? <IconCmp size={16} strokeWidth={1.5} /> : null;

    if (apiItem.path === '/webbios/updates' && hasUpdate) {
      iconEl = (
        <div className="relative">
          {iconEl}
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-surface"></span>
        </div>
      );
    }

    return {
      id: apiItem.id,
      label: localizedLabel,
      icon: iconEl,
      path: apiItem.path,
      isBeta: apiItem.isBeta,
      children: apiItem.children ? [...apiItem.children].sort((a, b) => (a.position || 0) - (b.position || 0)).map(mapApiMenu) : [],
      isCategory
    };
  };

  const menuData: MenuItemType[] = [
    ...[...dynamicMenus].sort((a, b) => (a.position || 0) - (b.position || 0)).map(mapApiMenu)
  ];

  const renderMenuItem = (item: MenuItemType, level: number = 0) => {
    // Permission check
    if (!hasPermission(item.permission)) return null;

    if (item.isCategory) {
      const visibleChildren = item.children?.filter(child => hasPermission(child.permission)) || [];
      return (
        <div key={item.id} className="flex flex-col space-y-0.5">
          {!effectivelyCollapsed && (
            <div className="px-3 text-[11px] font-semibold text-cf-gray-text pt-4 pb-2 text-[#6b7280] uppercase tracking-wider">
              {item.label}
            </div>
          )}
          {effectivelyCollapsed && <div className="pt-2" />}
          {visibleChildren.map(child => renderMenuItem(child, level))}
        </div>
      );
    }

    const visibleChildren = item.children?.filter(child => hasPermission(child.permission)) || [];
    const hasChildren = visibleChildren.length > 0;
    const isExpanded = expandedMenus[item.id];

    const isActive = item.path ? location.pathname === item.path : item.isActive;

    const activeStyle = isActive && !effectivelyCollapsed
      ? 'bg-[#f3f4f6] text-[#1f2937]'
      : effectivelyCollapsed && isActive
        ? 'text-[#6b7280] bg-transparent'
        : 'text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#1f2937]';

    const paddingClass = level === 0 ? 'px-3' : 'pl-2 pr-3';

    return (
      <div key={item.id} className="flex flex-col space-y-0.5">
        <button
          onClick={() => {
            if (hasChildren) toggleMenu(item.id);
            else if (item.path) navigate(item.path);
          }}
          className={`flex items-center justify-between py-1.5 rounded-md transition-colors w-full ${paddingClass} ${activeStyle} ${effectivelyCollapsed ? 'justify-center !px-0' : ''}`}
        >
          <div className={`flex items-center truncate ${effectivelyCollapsed ? 'w-full justify-center' : 'space-x-3'}`}>
            {item.icon && <div className="flex-shrink-0 text-[#6b7280]">{item.icon}</div>}
            {!item.icon && level > 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mx-[5px]"></div>}

            {!effectivelyCollapsed && (
              <span className="truncate text-[13px] font-medium">{item.label}</span>
            )}
            {!effectivelyCollapsed && item.isBeta && (
              <span className="text-[10px] bg-gray-100 text-cf-gray-text px-1.5 py-0.5 rounded border border-gray-200">Beta</span>
            )}
          </div>
          {!effectivelyCollapsed && hasChildren && (
            <div className="flex-shrink-0 text-cf-gray-text">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          )}
        </button>

        {!effectivelyCollapsed && hasChildren && isExpanded && (
          <div className="flex flex-col space-y-0.5 mt-0.5 ml-[19px] border-l border-cf-border pl-2">
            {visibleChildren.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-background font-sans text-cf-text">
      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => { if (isSidebarCollapsed && !isMobile) setIsHoverExpanded(true); }}
        onMouseLeave={() => { if (isSidebarCollapsed && !isMobile) setIsHoverExpanded(false); }}
        className={`bg-surface border-r border-cf-border flex-col flex-shrink-0 transition-all duration-300 h-full 
          ${isMobile ? 'absolute z-50' : 'relative z-20'}
          ${isMobile ? (isMobileMenuOpen ? 'flex w-64 translate-x-0' : 'hidden -translate-x-full') : 'flex'} 
          ${effectivelyCollapsed && !isMobile ? 'w-[56px]' : 'w-64'}`}
      >
        <div className="p-4 border-b border-cf-border flex items-center justify-center h-14">
          <div className="flex items-center space-x-3 w-full justify-center">
            <div className="text-[#F38020] flex-shrink-0">
              <Cloud fill="currentColor" size={28} />
            </div>
            {!effectivelyCollapsed && (
              <div className="truncate text-sm font-medium text-cf-gray-text flex-1">
                WebbiOS
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 thin-scrollbar">
          <div className="pt-3 pb-2">
            <div className={`flex items-center space-x-2 bg-surface border border-cf-border rounded-md px-3 py-1.5 text-[#6b7280] text-sm ${effectivelyCollapsed ? 'justify-center !px-0 bg-transparent border-transparent hover:bg-cf-hover' : ''}`}>
              <Search size={16} strokeWidth={1.5} className="text-[#6b7280] flex-shrink-0" />
              {!effectivelyCollapsed && (
                <>
                  <span className="flex-1 truncate text-gray-400">{t('sidebar.quickSearch')}</span>
                  <span className="text-xs flex items-center space-x-1 text-gray-400 flex-shrink-0">
                    <span>Ctrl</span>
                    <span className="text-cf-text font-medium border border-cf-border rounded px-1.5 py-0.5 bg-background shadow-sm">K</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-0.5">
            {menuData.map(item => renderMenuItem(item))}
          </div>
        </nav>

        {/* Collapse Button */}
        <div className="p-3 border-t border-cf-border">
          <button
            onClick={() => {
              setIsSidebarCollapsed(!isSidebarCollapsed);
              setIsHoverExpanded(false);
            }}
            className={`flex items-center w-full p-2 text-cf-gray-text hover:bg-cf-hover rounded-md hover:text-cf-text transition-colors ${effectivelyCollapsed ? 'justify-center' : 'justify-start space-x-3'}`}
            title={isSidebarCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
          >
            {effectivelyCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
            {!effectivelyCollapsed && <span className="text-[13px] font-medium">{t('sidebar.collapseSidebar')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#f9fafb]">
        <header className="h-14 bg-surface border-b border-cf-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center space-x-4">
            <button 
              className="md:hidden text-cf-gray-text"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center text-sm text-cf-gray-text space-x-2">
              <span></span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm font-medium">
            <button className="flex items-center space-x-2 text-cf-gray-text hover:text-cf-text">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white">✨</span>
              <span>{t('header.askAI')}</span>
            </button>
              <button 
                onClick={() => navigate('/webbios/updates')}
                className="flex items-center space-x-2 text-cf-gray-text hover:text-cf-text relative"
              >
                <Bell size={20} strokeWidth={1.5} />
              {hasUpdate && (
                <span className="absolute -top-1 left-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-surface"></span>
              )}
              <span>{t('header.notifications')}</span>
            </button>
            <button className="flex items-center space-x-2 text-cf-gray-text hover:text-cf-text">
              <HelpCircle size={16} strokeWidth={1.5} />
              <span>{t('header.support')}</span>
            </button>

            <div className="relative">
              <button 
                className="flex items-center space-x-2 text-cf-gray-text hover:text-cf-text ml-2 focus:outline-none"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold border border-blue-200 overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={`${cdnUrl.replace(/\/$/, '')}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    user?.firstName?.charAt(0) || <User size={14} />
                  )}
                </div>
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-surface border border-cf-border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-cf-border bg-gray-50/50">
                      <p className="text-sm font-medium text-cf-text truncate">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button 
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigate('/account');
                        }}
                      >
                        <SettingsIcon size={16} className="text-gray-400" />
                        <span>{t('header.account')}</span>
                      </button>
                    </div>
                    <div className="py-1 border-t border-cf-border">
                      <button 
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors font-medium"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                          navigate('/login');
                        }}
                      >
                        <LogOut size={16} />
                        <span>{t('header.logout')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
