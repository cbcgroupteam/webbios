import { useState, useEffect } from 'react';
import { Search, Calendar, Download, RefreshCw, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { webbios } from '../../api';

interface AuditLog {
  id: string;
  action: string;
  userEmail?: string;
  resourceType: string;
  resourceTitle?: string;
  createdAt: string;
  changes?: any;
}

const AuditLogsPage = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const timeFilters = [
    { value: 'all', label: t('audit.timeFilters.all') },
    { value: 'today', label: t('audit.timeFilters.today') },
    { value: 'last7Days', label: t('audit.timeFilters.last7Days') },
    { value: 'last30Days', label: t('audit.timeFilters.last30Days') }
  ];

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await webbios.auditLogs.list({ page, limit: 20, timeFilter });
      setLogs(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [timeFilter, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cf-text">{t('audit.title')}</h1>
          <p className="text-sm text-cf-gray-text mt-1">{t('audit.description')}</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={fetchLogs} className="p-2 border border-cf-border bg-surface rounded-md hover:bg-gray-50 text-cf-text transition-colors shadow-sm" title={t('audit.refresh')}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center space-x-2 border border-cf-border bg-surface hover:bg-gray-50 text-cf-text px-4 py-2 rounded-md transition-colors shadow-sm">
            <Download size={16} />
            <span>{t('audit.export')}</span>
          </button>
        </div>
      </div>

      <div className="bg-surface border border-cf-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-cf-border flex flex-wrap items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder={t('audit.search')} 
              className="w-full pl-9 pr-4 py-2 bg-background border border-cf-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              className="pl-9 pr-8 py-2 bg-background border border-cf-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value);
                setPage(1);
              }}
            >
              {timeFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-cf-border">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">{t('audit.columns.action')}</th>
                <th scope="col" className="px-6 py-3 font-medium">{t('audit.columns.user')}</th>
                <th scope="col" className="px-6 py-3 font-medium">{t('audit.columns.details')}</th>
                <th scope="col" className="px-6 py-3 font-medium">{t('audit.columns.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">{t('common.loading')}</td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="bg-surface hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 rounded-full bg-blue-100 text-blue-600">
                        <Activity size={14} />
                      </div>
                      <span className="font-medium text-cf-text">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {log.userEmail || 'System'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={log.changes ? JSON.stringify(log.changes) : ''}>
                    {log.resourceType}: {log.resourceTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Simple pagination */}
        <div className="p-4 border-t border-cf-border flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Total: {total}
          </span>
          <div className="space-x-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm">Page {page}</span>
            <button 
              disabled={logs.length < 20} 
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
