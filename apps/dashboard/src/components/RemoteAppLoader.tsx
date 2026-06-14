import { useState, useEffect, lazy, Suspense } from 'react';
// @ts-ignore
import { __federation_method_setRemote, __federation_method_getRemote } from '__federation__';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface RemoteAppLoaderProps {
  appSlug: string;
  workerUrl: string;
  moduleName: string;
}

export default function RemoteAppLoader({ appSlug, workerUrl, moduleName }: RemoteAppLoaderProps) {
  const [Component, setComponent] = useState<React.LazyExoticComponent<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'network' | 'module' | 'unknown'>('unknown');
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const loadRemote = async () => {
    try {
      setError(null);
      setErrorType('unknown');
      
      const remoteName = `webbios${appSlug.charAt(0).toUpperCase() + appSlug.slice(1)}`;
      const url = `${workerUrl}/assets/remoteEntry.js`;
      
      // Step 1: Check if the remote entry URL is accessible
      try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        // no-cors mode won't give us status, but if it throws, the URL is unreachable
      } catch (fetchErr) {
        setErrorType('network');
        throw new Error(
          `Không thể kết nối đến ứng dụng tại ${workerUrl}. ` +
          `Ứng dụng có thể chưa được deploy hoặc URL không chính xác.`
        );
      }
      
      // Step 2: Register the dynamic remote
      __federation_method_setRemote(remoteName, {
        url: () => Promise.resolve(url),
        format: 'esm',
        from: 'vite'
      });

      // Step 3: Load the module
      const factory = await __federation_method_getRemote(remoteName, moduleName);
      
      if (!factory) {
        setErrorType('module');
        throw new Error(
          `Không thể nạp module ${moduleName} từ ứng dụng ${appSlug}. ` +
          `Module có thể chưa được export đúng cách trong cấu hình federation.`
        );
      }

      setComponent(() => lazy(() => Promise.resolve({ default: factory })));
    } catch (err: any) {
      console.error('RemoteAppLoader Error:', err);
      if (!error) {
        // Only set if not already set by specific error type handlers above
        setError(err.message);
      } else {
        setError(err.message);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      await loadRemote();
    };

    if (isMounted) {
      init();
    }

    return () => {
      isMounted = false;
    };
  }, [appSlug, workerUrl, moduleName]);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryCount(prev => prev + 1);
    setComponent(null);
    setError(null);
    
    // Small delay before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
    await loadRemote();
    setRetrying(false);
  };

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-8">
        <div className="border border-red-200 rounded-xl bg-red-50 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-200 bg-red-100/50 flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
            <h3 className="text-base font-semibold text-red-800">
              Lỗi nạp ứng dụng
            </h3>
          </div>
          
          <div className="p-5 space-y-4">
            <p className="text-sm text-red-700 leading-relaxed">
              {error}
            </p>
            
            {errorType === 'network' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 font-medium mb-1">💡 Gợi ý khắc phục:</p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>Kiểm tra ứng dụng đã được deploy thành công trên Cloudflare Pages</li>
                  <li>Kiểm tra URL worker: <code className="bg-amber-100 px-1 rounded text-[11px]">{workerUrl}</code></li>
                  <li>Thử gỡ cài đặt và cài đặt lại ứng dụng</li>
                </ul>
              </div>
            )}
            
            {errorType === 'module' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 font-medium mb-1">💡 Gợi ý khắc phục:</p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>Ứng dụng cần cấu hình Vite Module Federation đúng cách</li>
                  <li>Kiểm tra file <code className="bg-amber-100 px-1 rounded text-[11px]">remoteEntry.js</code> đã tồn tại</li>
                  <li>Module cần export: <code className="bg-amber-100 px-1 rounded text-[11px]">{moduleName}</code></li>
                </ul>
              </div>
            )}
            
            <div className="flex items-center gap-3 pt-1">
              <button 
                onClick={handleRetry}
                disabled={retrying}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  retrying 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
                {retrying ? 'Đang thử lại...' : 'Thử lại'}
              </button>
              {retryCount > 0 && (
                <span className="text-xs text-gray-500">Đã thử {retryCount} lần</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Đang nạp ứng dụng...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8 text-gray-500">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Đang khởi tạo giao diện ứng dụng...</p>
        </div>
      </div>
    }>
      <Component />
    </Suspense>
  );
}
