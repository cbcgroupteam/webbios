import { Settings, ExternalLink, Trash2, CheckCircle2, Play, Square, Search, ArrowUpCircle, Store, RefreshCw, XCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { webbios } from '../../api';

const AppsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<Record<string, { status: string, progress: number, isError: boolean }>>({});
  const intervalRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

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

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const json = await webbios.client.get('/apps');
        if (json.success && json.data) {
          setInstalledApps(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch installed apps', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const handleUninstall = async (id: string) => {
    if (!confirm(t('apps.installed.confirmUninstall', 'Are you sure you want to uninstall this app? All data and workers on Cloudflare will be deleted.'))) return;
    try {
      const json = await webbios.client.delete(`/apps/${id}`);
      if (json.success) {
        setInstalledApps(prev => prev.filter(app => app.id !== id));
        // Dispatch event for sidebar to reload menus without refreshing page
        window.dispatchEvent(new Event('menusUpdated'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (app: any) => {
    if (!app.latestVersion) return;
    setUpdatingAppId(app.id);
    try {
      const res = await webbios.client.post('/apps/update', {
        shopId: 'WEBBIOS_PLATFORM',
        version: app.latestVersion,
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
          // Update local state to reflect new version
          setInstalledApps(prev => prev.map(a => 
            a.id === app.id 
              ? { ...a, version: app.latestVersion, hasUpdate: false, latestVersion: app.latestVersion }
              : a
          ));
          alert(`${t('apps.installed.updateSent', 'Update request sent')} ${app.name} -> v${app.latestVersion}`);
          setUpdatingAppId(null);
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

  const filteredApps = installedApps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cf-text">{t('apps.installed.title')}</h1>
          <p className="text-sm text-cf-gray-text mt-1">{t('apps.installed.description')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
              placeholder={t('apps.store.searchPlaceholder', 'Search apps...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => navigate('/apps/store')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Store size={18} />
            {t('apps.installed.appStore', 'App Store')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredApps.map(app => (
          <div key={app.id} className="bg-surface border border-cf-border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-12 h-12 flex-shrink-0 bg-blue-50 text-2xl flex items-center justify-center rounded-lg border border-blue-100">
                    {(() => {
                      const IconComponent = app.icon ? (LucideIcons as any)[app.icon] : (LucideIcons as any)['Box'];
                      return IconComponent ? <IconComponent size={24} /> : null;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-cf-text truncate" title={app.name}>{app.name}</h3>
                    <p className="text-sm text-cf-gray-text truncate">{app.author} • v{app.version}</p>
                  </div>
                </div>
                <div className={`flex-shrink-0 ml-4 px-2.5 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${app.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {app.status === 'active' ? <CheckCircle2 size={12} className="mr-1"/> : <Square size={12} className="mr-1"/>}
                  {app.status === 'active' ? t('apps.installed.running', 'Running') : t('apps.installed.stopped', 'Stopped')}
                </div>
              </div>
              
              {/* Update notification banner */}
              {app.hasUpdate && (
                <div className={`mb-3 p-3 border rounded-lg ${activeJobs[app.id] ? (activeJobs[app.id].isError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200') : 'bg-amber-50 border-amber-200'}`}>
                  {!activeJobs[app.id] ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle size={18} className="text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">
                            {t('apps.installed.updateAvailable', 'Update available')}
                          </p>
                          <p className="text-xs text-amber-600">
                            v{app.version} → v{app.latestVersion}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUpdate(app)}
                        disabled={updatingAppId === app.id}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          updatingAppId === app.id
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-amber-600 text-white hover:bg-amber-700'
                        }`}
                      >
                        {updatingAppId === app.id 
                          ? t('apps.installed.updating', 'Updating...') 
                          : t('apps.installed.update', 'Update')
                        }
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className={`flex items-center space-x-2 text-sm mb-2 ${activeJobs[app.id].isError ? 'text-red-700' : 'text-blue-700'}`}>
                        {activeJobs[app.id].isError ? (
                          <XCircle size={16} className="text-red-500 flex-shrink-0" />
                        ) : (
                          <RefreshCw size={16} className="text-blue-500 animate-spin flex-shrink-0" />
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
                  )}
                </div>
              )}
              
              <p className="text-sm text-gray-600 line-clamp-2">
                {app.description}
              </p>
            </div>
            
            <div className="border-t border-cf-border px-5 py-4 bg-background/50 flex items-center justify-between rounded-b-xl">
              <div className="flex space-x-2">
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title={t('apps.installed.settings')}>
                  <Settings size={18} />
                </button>
                {app.status === 'active' ? (
                  <button className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title={t('apps.installed.stop', 'Stop')}>
                    <Square size={18} />
                  </button>
                ) : (
                  <button className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title={t('apps.installed.restart', 'Start')}>
                    <Play size={18} />
                  </button>
                )}
                <button 
                  onClick={() => handleUninstall(app.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" 
                  title={t('apps.installed.uninstall')}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <button className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                <span>{t('apps.installed.openApp')}</span>
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {loading && <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>}
      {!loading && installedApps.length === 0 && (
        <div className="p-8 text-center text-gray-500 bg-surface border border-cf-border rounded-xl">
          {t('apps.installed.empty', 'No applications installed yet.')}
        </div>
      )}
    </div>
  );
};

export default AppsPage;
