import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { webbios } from '../../api';
import RemoteAppLoader from '../../components/RemoteAppLoader';

export default function AppContainer() {
  const params = useParams<{ appSlug: string, '*': string }>();
  const appSlug = params.appSlug;
  const subPath = params['*'] || '';
  const [appInfo, setAppInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApp() {
      if (!appSlug) return;
      try {
        setLoading(true);
        const res = await webbios.client.get('/apps');
        const apps = res.data || [];
        const app = apps.find((a: any) => a.slug === appSlug);
        
        if (app) {
          setAppInfo(app);
        } else {
          setError('Ứng dụng không tồn tại hoặc chưa được cài đặt.');
        }
      } catch (err: any) {
        setError(err.message || 'Lỗi lấy thông tin ứng dụng');
      } finally {
        setLoading(false);
      }
    }
    
    fetchApp();
  }, [appSlug]);

  if (loading) {
    return <div className="p-6 text-gray-500">Đang kiểm tra ứng dụng...</div>;
  }

  if (error || !appInfo) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!appInfo.workerUrl) {
    return <div className="p-6 text-red-600">Ứng dụng chưa được cung cấp URL (workerUrl). Vui lòng cấu hình lại.</div>;
  }

  // Determine module to load based on subPath
  // Each app defines its own exposed modules via Module Federation
  const getModuleName = (slug: string, path: string): string => {
    const route = path.split('/')[0];
    if (slug === 'crm') {
      if (route === 'customers') return './CustomersPage';
      if (route === 'reports') return './ReportsPage';
      // Default (no path or 'orders'): OrdersPage
      return './OrdersPage';
    }
    if (slug === 'theme-manager') {
      if (route === 'ThemeBuilderPage') return './ThemeBuilderPage';
      return './ThemesPage';
    }
    // For other apps, try to load a generic './App' module
    return './App';
  };

  const moduleName = getModuleName(appSlug || '', subPath);
  console.log('AppContainer DEBUG:', { appSlug, subPath, moduleName, url: window.location.href });

  return (
    <div className="h-full w-full">
      <RemoteAppLoader 
        appSlug={appInfo.slug} 
        workerUrl={appInfo.workerUrl} 
        moduleName={moduleName} 
      />
    </div>
  );
}
