import React, { useState, useEffect, useRef } from 'react';
import { Upload, Folder, Search, Filter, MoreVertical, Grid, List, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { webbios } from '../../api';

const MediaPage = () => {
  const { t } = useTranslation();
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [cdnUrl, setCdnUrl] = useState('https://cdn.webbios.dev');
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  useEffect(() => {
    webbios.settings.getSettings().then(settings => {
      if (settings['system.cdn_url']) {
        let url = settings['system.cdn_url'];
        if (url.startsWith('"')) url = JSON.parse(url);
        setCdnUrl(url.replace(/\/$/, ''));
      }
    }).catch(console.error);
    
    fetchMedia();
  }, []);

  const fetchMedia = async (q = search) => {
    setIsLoading(true);
    try {
      const res = await webbios.media.list({ search: q, limit: 50 });
      if (res.success) {
        setMediaList(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchMedia(search);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await webbios.media.upload(file, 'Uploads');
      if (res.success) {
        fetchMedia();
      } else {
        alert(res.error || 'Upload failed');
      }
    } catch (error: any) {
      alert(error.message || 'Connection error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('media.confirmDelete', 'Bạn có chắc chắn muốn xoá file này?'))) return;
    try {
      const res = await webbios.media.delete(id);
      if (res.success) {
        setMediaList(prev => prev.filter(m => m.id !== id));
        setSelectedMedia(null);
      } else {
        alert(res.error || 'Delete failed');
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUpdateMetadata = async (id: string, filename: string, alt: string) => {
    try {
      const res = await webbios.media.update(id, { filename, alt });
      if (res.success) {
        setMediaList(prev => prev.map(m => m.id === id ? { ...m, filename, alt } : m));
        setSelectedMedia(null);
      } else {
        alert(res.error || 'Update failed');
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cf-text">{t('media.title', 'Thư viện Media')}</h1>
          <p className="text-sm text-cf-gray-text mt-1">{t('media.description', 'Quản lý hình ảnh và tập tin')}</p>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors shadow-sm"
        >
          {isUploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Upload size={16} />}
          <span>{isUploading ? t('media.uploading', 'Đang tải...') : t('media.upload', 'Tải lên')}</span>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </div>

      <div className="bg-surface border border-cf-border rounded-lg shadow-sm">
        <div className="p-4 border-b border-cf-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                value={search}
                onChange={handleSearch}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('media.search', 'Tìm kiếm tập tin...')} 
                className="w-full pl-9 pr-4 py-2 bg-background border border-cf-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
            <button onClick={() => fetchMedia()} className="p-2 border border-cf-border rounded-md hover:bg-cf-hover text-cf-gray-text transition-colors">
              <Filter size={16} />
            </button>
          </div>
          <div className="flex items-center space-x-2 bg-background border border-cf-border rounded-md p-1">
            <button className="p-1.5 bg-surface shadow-sm rounded text-cf-text">
              <Grid size={16} />
            </button>
            <button className="p-1.5 text-cf-gray-text hover:text-cf-text">
              <List size={16} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Folder size={48} className="mx-auto text-gray-300 mb-4" />
              <p>{t('media.empty', 'Chưa có tập tin nào. Hãy tải lên file đầu tiên của bạn!')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {mediaList.map(media => {
                const isImage = media.mimeType?.startsWith('image/');
                const url = `${cdnUrl}${media.url.startsWith('/') ? '' : '/'}${media.url}`;
                
                return (
                  <div key={media.id} className="group relative bg-background border border-cf-border rounded-lg overflow-hidden hover:border-blue-500 hover:shadow-md transition-all flex flex-col aspect-square">
                    <div className="flex-1 bg-gray-100 flex items-center justify-center relative overflow-hidden cursor-pointer" onClick={() => setSelectedMedia(media)}>
                      {isImage ? (
                        <img src={url} alt={media.alt || media.filename} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <Folder size={48} className="text-gray-400" />
                      )}
                    </div>
                    <div className="p-2 border-t border-cf-border bg-surface flex items-center justify-between">
                      <div className="truncate flex-1">
                        <p className="text-xs font-medium text-cf-text truncate" title={media.filename}>{media.filename}</p>
                        <p className="text-[10px] text-cf-gray-text">{(media.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => setSelectedMedia(media)} className="text-gray-400 hover:text-cf-text">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedMedia && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedMedia(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-4 text-gray-900">{t('media.details', 'Chi tiết tập tin')}</h2>
            
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                {selectedMedia.mimeType?.startsWith('image/') ? (
                  <img src={`${cdnUrl}${selectedMedia.url.startsWith('/') ? '' : '/'}${selectedMedia.url}`} className="max-w-full max-h-full object-contain" />
                ) : (
                  <Folder size={64} className="text-gray-400" />
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tên file</label>
                <input 
                  type="text" 
                  defaultValue={selectedMedia.filename}
                  id="media-filename"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Thẻ Alt (Cho SEO)</label>
                <input 
                  type="text" 
                  defaultValue={selectedMedia.alt || ''}
                  id="media-alt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL / CDN Link</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600 break-all">
                  {`${cdnUrl}${selectedMedia.url.startsWith('/') ? '' : '/'}${selectedMedia.url}`}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
              <button onClick={() => handleDelete(selectedMedia.id)} className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center">
                <Trash2 size={14} className="mr-1" />
                {t('common.delete', 'Xoá')}
              </button>
              <div className="flex items-center space-x-2">
                <a 
                  href={`${cdnUrl}${selectedMedia.url.startsWith('/') ? '' : '/'}${selectedMedia.url}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Xem file
                </a>
                <button 
                onClick={() => {
                  const filename = (document.getElementById('media-filename') as HTMLInputElement).value;
                  const alt = (document.getElementById('media-alt') as HTMLInputElement).value;
                  handleUpdateMetadata(selectedMedia.id, filename, alt);
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('common.save', 'Lưu thay đổi')}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPage;
