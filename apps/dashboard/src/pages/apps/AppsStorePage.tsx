import * as LucideIcons from 'lucide-react';
import { Search, Download, Star, CheckCircle, ArrowUpCircle, RefreshCw, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef } from 'react';
import { webbios } from '../../api';

// Helper: Compare semver versions (returns true if v2 > v1)
function isNewerVersion(v1: string, v2: string): boolean {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (b > a) return true;
    if (b < a) return false;
  }
  return false;
}

const AppsStorePage = () => {
  const { t, i18n } = useTranslation();
  const [storeApps, setStoreApps] = useState<any[]>([]);
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingAppId, setInstallingAppId] = useState<string | null>(null);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<Record<string, { status: string, progress: number, isError: boolean }>>({});
  const intervalRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const getLocalizedText = (text: string) => {
    if (!text) return '';
    try {
      const parsed = JSON.parse(text);
      return parsed[i18n.resolvedLanguage || 'en'] || parsed['en'] || text;
    } catch {
      return text;
    }
  };

  const mapStatusToProgress = (status: string): { label: string; progress: number } => {
    switch (status) {
      case 'in_progress': return { label: t('webbios.updates.progress.inProgress'), progress: 5 };
      case 'downloading': return { label: t('webbios.updates.progress.downloading'), progress: 20 };
      case 'extracting': return { label: t('webbios.updates.progress.extracting'), progress: 40 };
      case 'installing': return { label: t('webbios.updates.progress.installing'), progress: 50 };
      case 'deploying_api': return { label: t('webbios.updates.progress.deployingApi'), progress: 70 };
      case 'deploying_dashboard': return { label: t('webbios.updates.progress.deployingDashboard'), progress: 90 };
      case 'success': return { label: t('webbios.updates.progress.success'), progress: 100 };
      default: return { label: t('webbios.updates.progress.default'), progress: 10 };
    }
  };

  const startPolling = useCallback((appId: string, jobId: string) => {
    if (intervalRefs.current[appId]) clearInterval(intervalRefs.current[appId]);
    
    intervalRefs.current[appId] = setInterval(async () => {
      try {
        const jobRes = await fetch(`https://platform.webbios.dev/api/v1/platform/jobs/${jobId}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        const jobData = await jobRes.json();
        if (jobData.success && jobData.job) {
          const mapped = mapStatusToProgress(jobData.job.status);

          if (jobData.job.status === 'success') {
            clearInterval(intervalRefs.current[appId]);
            delete intervalRefs.current[appId];
            
            setActiveJobs(prev => ({
              ...prev,
              [appId]: { status: mapped.label, progress: 100, isError: false }
            }));
            
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else if (jobData.job.status === 'failed') {
            clearInterval(intervalRefs.current[appId]);
            delete intervalRefs.current[appId];
            
            setActiveJobs(prev => ({
              ...prev,
              [appId]: { status: t('webbios.updates.progress.errorPrefix') + (jobData.job.errorMessage || t('webbios.updates.progress.errorFailed')), progress: 0, isError: true }
            }));
            setInstallingAppId(null);
            setUpdatingAppId(null);
          } else {
            setActiveJobs(prev => ({
              ...prev,
              [appId]: { status: mapped.label, progress: mapped.progress, isError: false }
            }));
          }
        }
      } catch (e) { }
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, []);

  const handleInstallApp = async (app: any) => {
    setInstallingAppId(app.id);
    try {
      const res = await webbios.client.post('/apps/install', {
        shopId: 'WEBBIOS_PLATFORM', // Demo Shop ID
        version: app.latestVersion || app.version || '1.0.0',
        targetId: app.slug
      });

      if (res.success) {
        if (res.jobId) {
          setActiveJobs(prev => ({
            ...prev,
            [app.id]: { status: t('webbios.updates.progress.statusInit', 'Initializing process...'), progress: 5, isError: false }
          }));
          startPolling(app.id, res.jobId);
        } else {
          // Simulate progress for local fast installation
          setActiveJobs(prev => ({
            ...prev,
            [app.id]: { status: t('webbios.updates.progress.statusInit', 'Initializing process...'), progress: 5, isError: false }
          }));
          let simProgress = 10;
          const simInterval = setInterval(() => {
            simProgress += 25;
            if (simProgress >= 100) {
              clearInterval(simInterval);
              setActiveJobs(prev => ({
                ...prev,
                [app.id]: { status: t('apps.store.installComplete', 'Completed'), progress: 100, isError: false }
              }));
              setTimeout(() => {
                setInstallingAppId(null);
                window.location.reload();
              }, 500);
            } else {
              setActiveJobs(prev => ({
                ...prev,
                [app.id]: { status: `${t('apps.store.installing', 'Installing...')} ${simProgress}%`, progress: simProgress, isError: false }
              }));
            }
          }, 300);
        }
      } else {
        alert(t('apps.store.installFailed', 'Install failed: ') + res.error);
        setInstallingAppId(null);
      }
    } catch (err: any) {
      alert(t('apps.store.installError', 'Install error: ') + err.message);
      setInstallingAppId(null);
    }
  };

  const handleUpdateApp = async (app: any) => {
    const installedApp = installedApps.find(a => a.slug === app.slug);
    if (!installedApp) return;
    
    setUpdatingAppId(app.id);
    try {
      const res = await webbios.client.post('/apps/update', {
        shopId: 'WEBBIOS_PLATFORM',
        version: app.latestVersion || app.version,
        targetId: app.slug
      });

      if (res.success) {
        if (res.jobId) {
          setActiveJobs(prev => ({
            ...prev,
            [app.id]: { status: t('webbios.updates.progress.statusInit', 'Initializing process...'), progress: 5, isError: false }
          }));
          startPolling(app.id, res.jobId);
        } else {
          // Simulate progress for local fast update
          setActiveJobs(prev => ({
            ...prev,
            [app.id]: { status: t('webbios.updates.progress.statusInit', 'Initializing process...'), progress: 5, isError: false }
          }));
          let simProgress = 10;
          const simInterval = setInterval(() => {
            simProgress += 25;
            if (simProgress >= 100) {
              clearInterval(simInterval);
              setActiveJobs(prev => ({
                ...prev,
                [app.id]: { status: t('apps.store.updateComplete', 'Completed'), progress: 100, isError: false }
              }));
              setTimeout(() => {
                setUpdatingAppId(null);
                window.location.reload();
              }, 500);
            } else {
              setActiveJobs(prev => ({
                ...prev,
                [app.id]: { status: `${t('apps.store.updating', 'Updating...')} ${simProgress}%`, progress: simProgress, isError: false }
              }));
            }
          }, 300);
        }
      } else {
        alert(t('apps.installed.updateFailed', 'Update failed: ') + (res.error || 'Unknown error'));
        setUpdatingAppId(null);
      }
    } catch (err: any) {
      alert(t('apps.installed.updateError', 'Update error: ') + err.message);
      setUpdatingAppId(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both store apps and installed apps in parallel
        const [storeRes, installedRes] = await Promise.all([
          webbios.client.get('/marketplace/apps'),
          webbios.client.get('/apps')
        ]);
        
        if (storeRes.success && storeRes.data) {
          setStoreApps(storeRes.data);
        }
        if (installedRes.success && installedRes.data) {
          setInstalledApps(installedRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch apps', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Determine app status: 'installed' | 'update_available' | 'not_installed'
  const getAppStatus = (storeApp: any) => {
    const installed = installedApps.find(
      a => a.slug === storeApp.slug || a.id === storeApp.id
    );
    if (!installed) return { status: 'not_installed', installedVersion: null };
    
    const latestVersion = storeApp.latestVersion || storeApp.version;
    const hasUpdate = latestVersion && installed.version && isNewerVersion(installed.version, latestVersion);
    
    return { 
      status: hasUpdate ? 'update_available' : 'installed',
      installedVersion: installed.version
    };
  };

  const categories = [
    t('media.all'),
    t('apps.store.categories.marketing'),
    t('apps.store.categories.sales'),
    t('apps.store.categories.design'),
    t('apps.store.categories.inventory'),
    t('apps.store.categories.support')
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cf-text">{t('apps.store.title')}</h1>
          <p className="text-sm text-cf-gray-text mt-1">{t('apps.store.description')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-6">
          <div className="bg-surface border border-cf-border rounded-lg p-4">
            <h3 className="font-medium text-cf-text mb-4">{t('apps.store.filter')}</h3>
            <div className="space-y-2">
              {categories.map((cat, i) => (
                <label key={i} className="flex items-center space-x-2 cursor-pointer group">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked={i === 0} />
                  <span className="text-sm text-gray-600 group-hover:text-cf-text transition-colors">{cat}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="bg-surface border border-cf-border rounded-lg p-4">
            <h3 className="font-medium text-cf-text mb-4">{t('products.columns.price')}</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input type="radio" name="price" className="border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                <span className="text-sm text-gray-600 group-hover:text-cf-text transition-colors">{t('media.all')}</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input type="radio" name="price" className="border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-600 group-hover:text-cf-text transition-colors">{t('apps.store.free')}</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input type="radio" name="price" className="border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-600 group-hover:text-cf-text transition-colors">{t('apps.store.paid')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="flex relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={t('apps.store.search')} 
              className="w-full pl-11 pr-4 py-3 bg-surface border border-cf-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {storeApps.map(app => {
              const { status, installedVersion } = getAppStatus(app);
              
              return (
                <div key={app.id} className="bg-surface border border-cf-border rounded-xl p-5 hover:border-blue-300 hover:shadow-lg transition-all group cursor-pointer flex gap-5">
                  <div className="w-12 h-12 bg-gray-50 text-2xl flex items-center justify-center rounded-lg border border-cf-border text-gray-500 flex-shrink-0">
                    {(() => {
                      const IconComponent = app.icon ? (LucideIcons as any)[app.icon] : (LucideIcons as any)['Box'];
                      return IconComponent ? <IconComponent size={24} /> : null;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-base font-semibold text-cf-text truncate pr-2">{getLocalizedText(app.name)}</h3>
                      <span className="text-sm font-medium text-cf-text flex items-center">
                        {app.price === 0 ? t('apps.store.free', 'Free') : app.price}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-cf-gray-text mb-2">
                      <span>{app.category}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <div className="flex items-center text-amber-500">
                        <Star size={12} fill="currentColor" className="mr-1" />
                        <span className="font-medium">{app.ratingAvg || 0}</span>
                        <span className="text-gray-400 ml-1">({app.downloadCount || 0})</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {getLocalizedText(app.description)}
                    </p>
                    
                    {/* Conditional button based on install status */}
                    {activeJobs[app.id] ? (
                      <div className={`mt-4 p-3 rounded-lg border ${activeJobs[app.id].isError ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                        <div className={`flex items-center space-x-2 text-sm mb-2 ${activeJobs[app.id].isError ? 'text-red-700' : 'text-blue-700'}`}>
                          {activeJobs[app.id].isError ? (
                            <XCircle size={16} className="text-red-500" />
                          ) : (
                            <RefreshCw size={16} className="text-blue-500 animate-spin" />
                          )}
                          <span className="font-medium">{activeJobs[app.id].status}</span>
                        </div>
                        {!activeJobs[app.id].isError && activeJobs[app.id].progress > 0 && (
                          <div className="w-full bg-blue-200/50 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${activeJobs[app.id].progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    ) : status === 'installed' ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200 w-fit">
                        <CheckCircle size={16} />
                        {t('apps.store.installed', 'Installed')} • v{installedVersion}
                      </div>
                    ) : status === 'update_available' ? (
                      <button
                        onClick={() => handleUpdateApp(app)}
                        disabled={updatingAppId === app.id || installingAppId !== null}
                        className={`flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          updatingAppId === app.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-600 hover:text-white hover:border-amber-600'
                        }`}
                      >
                        <ArrowUpCircle size={16} className="mr-2" />
                        {updatingAppId === app.id 
                          ? t('apps.store.updating', 'Updating...') 
                          : `${t('apps.store.update', 'Update')} v${installedVersion} → v${app.latestVersion || app.version}`
                        }
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleInstallApp(app)}
                        disabled={installingAppId === app.id || updatingAppId !== null}
                        className={`flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          installingAppId === app.id 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        <Download size={16} className="mr-2" />
                        {installingAppId === app.id ? t('apps.store.installing', 'Installing...') : t('apps.store.install')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppsStorePage;
