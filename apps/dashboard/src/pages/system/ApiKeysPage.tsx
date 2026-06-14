import { useState, useEffect } from 'react';
import { Plus, Key, Copy, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { webbios } from '../../api';

interface ApiKey {
  id: string;
  name: string;
  secretPrefix: string;
  scopes: string[];
  status: string;
  createdBy: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  requestCount: number;
  createdAt: string;
}

const ApiKeysPage = () => {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [rawSecret, setRawSecret] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await webbios.apiKeys.list();
      setApiKeys(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await webbios.apiKeys.create({ name: newKeyName, scopes: [] });
      if (res.data) {
        setRawSecret(res.data.rawSecret);
        fetchKeys();
      }
    } catch (err: any) {
      alert(err.message || "Failed to create API key");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    try {
      await webbios.apiKeys.delete(id);
      fetchKeys();
    } catch (err: any) {
      alert(err.message || "Failed to revoke API key");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  const closeAndResetModal = () => {
    setIsModalOpen(false);
    setNewKeyName('');
    setRawSecret(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cf-text">{t('apiKeys.title')}</h1>
          <p className="text-sm text-cf-gray-text mt-1">{t('apiKeys.description')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span>{t('apiKeys.create')}</span>
        </button>
      </div>

      <div className="bg-surface border border-cf-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-cf-border bg-gradient-to-r from-blue-50/50 to-transparent">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Key size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{t('apiKeys.securityTitle', 'Secure your API Keys')}</h3>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                {t('apiKeys.securityDescription', 'API keys provide full access to your system data. Never share them publicly or store them in client-side code.')}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-cf-border">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">{t('apiKeys.columns.name')}</th>
                <th scope="col" className="px-6 py-3 font-medium">{t('apiKeys.columns.key')}</th>
                <th scope="col" className="px-6 py-3 font-medium">{t('apiKeys.columns.created')}</th>
                <th scope="col" className="px-6 py-3 font-medium">{t('apiKeys.columns.lastUsed')}</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">{t('apiKeys.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border">
              {loading ? (
                 <tr>
                 <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                   {t('common.loading')}
                 </td>
               </tr>
              ) : apiKeys.map(apiKey => (
                <tr key={apiKey.id} className="bg-surface hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-cf-text">
                    {apiKey.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <code className="px-2 py-1 bg-gray-100 text-gray-800 rounded font-mono text-xs border border-gray-200">
                        {apiKey.secretPrefix}...
                      </code>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(apiKey.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString() : 'Never used'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleRevoke(apiKey.id)} className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50" title={t('apiKeys.revoke')}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && apiKeys.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {t('apiKeys.empty', 'No API keys created yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{t('apiKeys.modal.add')}</h2>
            
            {rawSecret ? (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  {t('apiKeys.modal.secretWarning')}
                </div>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={rawSecret} 
                    className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-700 font-mono text-sm" 
                  />
                  <button 
                    onClick={() => handleCopy(rawSecret)} 
                    className="p-2 border rounded bg-gray-100 hover:bg-gray-200"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <div className="flex justify-end pt-4">
                  <button 
                    onClick={closeAndResetModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('apiKeys.modal.name')}</label>
                  <input 
                    type="text" 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Mobile App"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button 
                    type="button" 
                    onClick={closeAndResetModal}
                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.actions.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={!newKeyName.trim()}
                  >
                    {t('common.actions.create')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeysPage;
