import { useState } from 'react';
import { Search, Plus, Clock, Play, Pause, RefreshCw, MoreVertical, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Mock Data
const MOCK_JOBS = [
  {
    id: '1',
    name: 'Sync KiotViet Inventory',
    taskType: 'http_request',
    cronExpression: '*/15 * * * *',
    nextRunAt: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
    lastRunAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    status: 'active'
  },
  {
    id: '2',
    name: 'Send Birthday Emails',
    taskType: 'app_event',
    cronExpression: '0 8 * * *',
    nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    status: 'active'
  },
  {
    id: '3',
    name: 'Daily Database Backup',
    taskType: 'system_cleanup',
    cronExpression: '0 2 * * *',
    nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    status: 'paused'
  }
];

const CronJobsPage = () => {
  const { t } = useTranslation();
  const [jobs] = useState(MOCK_JOBS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = jobs.filter(job => 
    job.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('Cron Jobs')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('Manage scheduled tasks, automated API calls, and background workers.')}
          </p>
        </div>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium">
          <Plus className="w-4 h-4 mr-2" />
          {t('Create Job')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('Search cron jobs...')}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors w-full sm:w-auto justify-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('Refresh')}
          </button>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 font-medium text-gray-500 text-sm">{t('Job Name')}</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-sm">{t('Schedule')}</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-sm">{t('Next Run')}</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-sm">{t('Last Run')}</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-sm">{t('Status')}</th>
                <th className="px-6 py-4 font-medium text-gray-500 text-sm text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mr-3 flex-shrink-0">
                        <Clock className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{job.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{job.taskType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 font-mono">
                      {job.cronExpression}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {new Date(job.nextRunAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(job.lastRunAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {job.status === 'active' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                        {t('Active')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5"></span>
                        {t('Paused')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {job.status === 'active' ? (
                        <button className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={t('Pause')}>
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : (
                        <button className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title={t('Resume')}>
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredJobs.length === 0 && (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">{t('No jobs found')}</h3>
            <p className="mt-1 text-gray-500 text-sm">{t('Get started by creating a new scheduled task.')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CronJobsPage;
