import { useTranslation } from 'react-i18next';
import { Globe, Plus, Search } from 'lucide-react';

const DomainsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cf-text">{t('sidebar.domains', 'Tên miền')}</h1>
          <p className="text-sm text-cf-gray-text mt-1">Quản lý và đăng ký tên miền riêng cho hệ thống ERP của bạn.</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm font-medium">
          <Plus size={16} />
          <span>Thêm tên miền</span>
        </button>
      </div>

      <div className="bg-surface border border-cf-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-cf-border flex justify-between items-center bg-gray-50/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder={t('common.placeholders.search', 'Tìm kiếm...')} 
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Globe className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Chưa có tên miền nào</h3>
          <p className="text-sm text-gray-500 max-w-md mt-2">
            Kết nối tên miền có sẵn hoặc tìm và đăng ký tên miền mới trực tiếp qua WebbiOS để tăng cường nhận diện thương hiệu.
          </p>
          <button className="mt-6 px-6 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Tìm tên miền mới
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainsPage;
