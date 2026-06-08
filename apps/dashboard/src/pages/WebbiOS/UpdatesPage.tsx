import { useState, useEffect, useCallback, useRef } from 'react';
import { DownloadCloud, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';
import { useTranslation } from 'react-i18next';
import { webbios } from '../../api';

export const UpdatesPage = () => {
  const { t } = useTranslation();
  const { hasUpdate, latestVersion, releaseNotes } = useUpdateChecker();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

  const startPolling = useCallback((jobId: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(async () => {
      try {
        const jobRes = await fetch(`https://platform.webbios.dev/api/v1/platform/jobs/${jobId}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        const jobData = await jobRes.json();
        if (jobData.success && jobData.job) {
          const mapped = mapStatusToProgress(jobData.job.status);

          if (jobData.job.status === 'success') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            localStorage.removeItem('webbios_active_update_job');
            localStorage.removeItem('webbios_update_status');
            setUpdateStatus(mapped.label);
            setUpdateProgress(100);
            setTimeout(() => {
              window.location.href = window.location.pathname + '?v=' + Date.now();
            }, 2000);
          } else if (jobData.job.status === 'failed') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            localStorage.removeItem('webbios_active_update_job');
            setUpdateStatus('Lỗi: ' + (jobData.job.errorMessage || 'Cập nhật thất bại'));
            setUpdateProgress(0);
            setIsUpdating(false);
          } else {
            setUpdateStatus(mapped.label);
            setUpdateProgress(mapped.progress);
          }
        }
      } catch (e) { }
    }, 3000);
  }, []);

  useEffect(() => {
    const savedJobId = localStorage.getItem('webbios_active_update_job');
    if (savedJobId) {
      setIsUpdating(true);
      setUpdateStatus('Đang khôi phục tiến trình...');
      setUpdateProgress(10);
      startPolling(savedJobId);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startPolling]);

  const mapStatusToProgress = (status: string): { label: string; progress: number } => {
    switch (status) {
      case 'in_progress': return { label: 'Đang xếp hàng chờ xử lý...', progress: 5 };
      case 'downloading': return { label: 'Đang tải gói cài đặt...', progress: 20 };
      case 'extracting': return { label: 'Đang giải nén...', progress: 40 };
      case 'installing': return { label: 'Đang cài đặt thư viện...', progress: 50 };
      case 'deploying_api': return { label: 'Đang triển khai Core API...', progress: 70 };
      case 'deploying_dashboard': return { label: 'Đang triển khai Dashboard...', progress: 90 };
      case 'success': return { label: 'Cập nhật hoàn tất! Đang tải lại...', progress: 100 };
      default: return { label: 'Đang xử lý...', progress: 10 };
    }
  };

  const handleUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdateStatus(t('webbios.updates.statusDownloading') || 'Đang khởi tạo tiến trình cập nhật...');

    try {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      const projectDomain = parts.length > 3 ? parts[1] : parts[0];

      let shopId = '';
      if (projectDomain.startsWith('webbios-dashboard-')) {
        shopId = projectDomain.replace('webbios-dashboard-', '');
      } else if (hostname === 'admin.webbios.dev' || hostname === 'localhost') {
        shopId = 'WBSHOP9050';
      }

      if (!shopId) {
        throw new Error('Không xác định được ID của Shop. Quá trình cập nhật bị huỷ.');
      }

      const res = await webbios.adminUpdates.installUpdate({
        shopId: shopId.toUpperCase(),
        version: latestVersion as string,
        targetId: 'webbios-core',
        type: 'core',
        previousVersion: currentVersion
      });

      setUpdateStatus('Đang cập nhật...');
      setUpdateProgress(5);

      const jobId = (res as { jobId?: string }).jobId;
      if (jobId) {
        localStorage.setItem('webbios_active_update_job', jobId);
        startPolling(jobId);
      } else {
        throw new Error('Không nhận được Job ID từ máy chủ.');
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        setUpdateStatus('Lỗi: ' + error.message);
      } else {
        setUpdateStatus('Lỗi: Cập nhật thất bại');
      }
      setIsUpdating(false);
    }
  };

  const hasError = updateStatus?.startsWith('Lỗi');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cf-text">{t('webbios.updates.title')}</h1>
        <p className="text-cf-gray-text mt-1">{t('webbios.updates.subtitle')}</p>
      </div>

      <div className="bg-surface border border-cf-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-cf-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gray-100 p-3 rounded-full text-cf-gray-text">
                <DownloadCloud size={28} />
              </div>
              <div>
                <h2 className="text-lg font-medium text-cf-text">{t('webbios.updates.versionStatus')}</h2>
                <div className="flex items-center mt-1 space-x-2">
                  <span className="text-sm text-cf-gray-text">{t('webbios.updates.current')} <span className="font-medium text-cf-text">v{currentVersion}</span></span>
                  {hasUpdate && (
                    <>
                      <span className="text-gray-300">→</span>
                      <span className="text-sm text-blue-600 font-medium">{t('webbios.updates.latest')} v{latestVersion}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {hasUpdate ? (
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isUpdating ? <RefreshCw className="animate-spin" size={16} /> : <DownloadCloud size={16} />}
                <span>{isUpdating ? t('webbios.updates.updating') : t('webbios.updates.updateTo', { version: latestVersion })}</span>
              </button>
            ) : (
              <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-md flex items-center space-x-1.5">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">{t('webbios.updates.upToDate')}</span>
              </div>
            )}
          </div>

          {(isUpdating || hasError) && (
            <div className={`mt-6 p-4 rounded border ${hasError ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex flex-col space-y-3">
                <div className={`flex items-center space-x-3 text-sm ${hasError ? 'text-red-700' : 'text-gray-700'}`}>
                  {hasError ? (
                    <XCircle size={16} className="text-red-500" />
                  ) : (
                    <RefreshCw size={16} className="text-blue-500 animate-spin" />
                  )}
                  <span className="font-medium">{updateStatus}</span>
                </div>
                {updateProgress > 0 && !hasError && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${updateProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {hasUpdate && !isUpdating && (
          <div className="p-6 bg-gray-50">
            <h3 className="font-medium text-cf-text flex items-center space-x-2">
              <AlertTriangle size={16} className="text-orange-500" />
              <span>{t('webbios.updates.releaseNotes', { version: latestVersion })}</span>
            </h3>
            <div className="mt-3 text-sm text-gray-600 space-y-2 prose whitespace-pre-line">
              {releaseNotes || t('webbios.updates.releaseNotesIntro')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
