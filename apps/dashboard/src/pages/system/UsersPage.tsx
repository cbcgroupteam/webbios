import { useState, useEffect } from 'react';
import { Search, Plus, UserCheck, UserX, MoreVertical, Copy, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { webbios } from '../../api';
import { Button, Input, Select } from '@webbios/ui';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName?: string;
  status: string;
  lastLoginAt: string;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  slug: string;
  description: string | null;
}

const UsersPage = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Modals state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'resetPassword' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    roleId: '',
    status: 'active',
    permissionIds: [] as string[]
  });
  
  // For Reset Password
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [showSmtpWarning, setShowSmtpWarning] = useState(false);

  // Dropdown state for rows
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await webbios.users.list({ page, limit: 20, search });
      setUsers(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        webbios.roles.getRoles(),
        webbios.permissions.getPermissions()
      ]);
      setRoles(rolesRes.data);
      setAllPermissions(permsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const openCreateModal = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      roleId: roles.length > 0 ? roles[0].id : '',
      status: 'active',
      permissionIds: []
    });
    setModalMode('create');
  };

  const openEditModal = async (u: User) => {
    setEditingUserId(u.id);
    setFormData({
      email: u.email,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      password: '',
      roleId: u.roleId,
      status: u.status,
      permissionIds: []
    });
    setModalMode('edit');
    setOpenDropdownId(null);

    try {
      const permsRes = await webbios.users.getPermissions(u.id);
      setFormData(prev => ({ ...prev, permissionIds: permsRes.data }));
    } catch (e) {
      console.error("Failed to fetch user permissions", e);
    }
  };

  const openResetPassword = (u: User) => {
    setEditingUserId(u.id);
    setResetPasswordVal('');
    setShowSmtpWarning(false);
    setModalMode('resetPassword');
    setOpenDropdownId(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'edit' && editingUserId) {
        await webbios.users.update(editingUserId, formData);
      } else {
        await webbios.users.create(formData);
      }
      setModalMode(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Operation failed");
    }
  };

  const handleChangeStatus = async (id: string, newStatus: string) => {
    try {
      await webbios.users.updateStatus(id, newStatus);
      fetchUsers();
    } catch (err: any) {
      alert("Failed to update status");
    }
    setOpenDropdownId(null);
  };

  const handleArchive = async (id: string) => {
    if (!confirm(t('users.modal.confirmArchive', 'Are you sure you want to archive this user?'))) return;
    handleChangeStatus(id, 'archived');
  };

  const handleResetPassword = async (sendEmail: boolean) => {
    if (!resetPasswordVal.trim()) {
      alert("Please enter a password");
      return;
    }
    if (!editingUserId) return;

    try {
      await webbios.users.resetPassword(editingUserId, {
        password: resetPasswordVal,
        sendEmail
      });
      alert("Password updated successfully!");
      setModalMode(null);
    } catch (err: any) {
      if (err.message?.includes('SMTP_NOT_CONFIGURED') || err.error === 'SMTP_NOT_CONFIGURED') {
        setShowSmtpWarning(true);
      } else {
        alert(err.message || "Failed to reset password");
      }
    }
  };

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let pwd = "";
    for (let i = 0, n = charset.length; i < 12; ++i) {
        pwd += charset.charAt(Math.floor(Math.random() * n));
    }
    setResetPasswordVal(pwd);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetPasswordVal);
    alert(t('users.modal.copyPassword', 'Copied') + "!");
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => {
      const exists = prev.permissionIds.includes(permId);
      if (exists) {
        return { ...prev, permissionIds: prev.permissionIds.filter(id => id !== permId) };
      } else {
        return { ...prev, permissionIds: [...prev.permissionIds, permId] };
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cf-text">{t('users.title')}</h1>
          <p className="text-sm text-cf-gray-text mt-1">{t('users.description')}</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm">
          <Plus size={16} />
          <span>{t('users.add')}</span>
        </button>
      </div>

      <div className="bg-surface border border-cf-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-cf-border flex flex-wrap items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder={t('users.search')} 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-cf-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-cf-border">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">{t('users.columns.user')}</th>
                <th scope="col" className="px-6 py-3 font-medium">{t('users.columns.role')}</th>
                <th scope="col" className="px-6 py-3 font-medium">{t('users.columns.status')}</th>
                <th scope="col" className="px-6 py-3 font-medium">{t('users.columns.joined')}</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">{t('users.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cf-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="bg-surface hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold border border-blue-200 uppercase">
                          {(user.firstName?.[0] || user.email[0] || '?')}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-cf-text">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                      {user.roleName || user.roleId}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.status === 'active' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <UserCheck size={12} className="mr-1" /> {t('users.status.active', 'Active')}
                      </span>
                    ) : user.status === 'archived' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {t('users.status.archived', 'Archived')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                        <UserX size={12} className="mr-1" /> {t('users.status.inactive', 'Locked')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button 
                      onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                      className="text-gray-400 hover:text-cf-text transition-colors p-2 rounded-md hover:bg-gray-100"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {openDropdownId === user.id && (
                      <div className="absolute right-8 top-10 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 text-left">
                        <button onClick={() => openEditModal(user)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('users.actions.edit', 'Edit')}
                        </button>
                        <button onClick={() => openResetPassword(user)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {t('users.actions.resetPassword', 'Reset Password')}
                        </button>
                        {user.status === 'active' ? (
                          <button onClick={() => handleChangeStatus(user.id, 'disabled')} className="block w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100">
                            {t('users.actions.lock', 'Lock')}
                          </button>
                        ) : (
                          <button onClick={() => handleChangeStatus(user.id, 'active')} className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100">
                            {t('users.actions.unlock', 'Unlock')}
                          </button>
                        )}
                        <button onClick={() => handleArchive(user.id)} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 border-t">
                          {t('users.actions.archive', 'Archive')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-cf-border flex items-center justify-between text-sm text-gray-500">
          <span>Total: {total}</span>
          <div className="flex space-x-1">
            <button 
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
              className="px-3 py-1 border border-cf-border rounded bg-background hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={users.length < 20}
              className="px-3 py-1 border border-cf-border rounded bg-background hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' ? t('users.modal.add', 'Add User') : t('users.modal.edit', 'Edit User')}
            </h2>
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.modal.firstName', 'First Name')}</label>
                  <Input 
                    value={formData.firstName} 
                    onChange={e => setFormData({...formData, firstName: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.modal.lastName', 'Last Name')}</label>
                  <Input 
                    value={formData.lastName} 
                    onChange={e => setFormData({...formData, lastName: e.target.value})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.modal.email', 'Email')}</label>
                <Input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  disabled={modalMode === 'edit'}
                />
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.modal.password', 'Password')}</label>
                  <Input 
                    type="password" 
                    required 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.modal.role', 'Role')}</label>
                <Select
                  value={formData.roleId}
                  onChange={e => setFormData({...formData, roleId: e.target.value})}
                  required
                >
                  <option value="">-- Select Role --</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-800 mb-2">{t('users.modal.permissions', 'Additional Permissions')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-2 bg-gray-50 border rounded-md">
                  {allPermissions.map(p => (
                    <label key={p.id} className="flex items-start space-x-2 p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-200 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.permissionIds.includes(p.id)}
                        onChange={() => togglePermission(p.id)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300" 
                      />
                      <span className="text-sm font-medium text-gray-900">{p.slug}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setModalMode(null)}>{t('common.actions.cancel', 'Cancel')}</Button>
                <Button type="submit">{t('common.actions.create', 'Save')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {modalMode === 'resetPassword' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{t('users.modal.resetPassword', 'Reset Password')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.modal.password', 'New Password')}</label>
                <div className="flex space-x-2">
                  <Input 
                    type="text" 
                    value={resetPasswordVal} 
                    onChange={e => setResetPasswordVal(e.target.value)} 
                    className="font-mono"
                  />
                  <Button variant="outline" type="button" onClick={generatePassword} title={t('users.modal.autoGenerate', 'Auto Generate')}>
                    {t('users.modal.autoGenerate', 'Gen')}
                  </Button>
                </div>
              </div>

              {showSmtpWarning && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                  <p>{t('users.modal.smtpWarning', 'SMTP is not configured in the system.')}</p>
                  <a href="/dashboard/system/settings" className="font-semibold underline mt-1 inline-block">
                    {t('users.modal.smtpLink', 'Configure Now')}
                  </a>
                </div>
              )}

              <div className="flex flex-col space-y-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full flex justify-center items-center gap-2"
                  onClick={copyToClipboard}
                  disabled={!resetPasswordVal}
                >
                  <Copy size={16} /> {t('users.modal.copyPassword', 'Copy Password')}
                </Button>
                
                <Button 
                  type="button" 
                  className="w-full flex justify-center items-center gap-2"
                  onClick={() => handleResetPassword(true)}
                  disabled={!resetPasswordVal}
                >
                  <Mail size={16} /> {t('users.modal.sendPassword', 'Send Password via Email')}
                </Button>

                <Button 
                  variant="outline"
                  type="button" 
                  className="w-full mt-2 text-gray-500 hover:bg-gray-100 border-transparent bg-transparent"
                  onClick={() => handleResetPassword(false)}
                  disabled={!resetPasswordVal}
                >
                  Save without email
                </Button>
                
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full mt-2"
                  onClick={() => setModalMode(null)}
                >
                  {t('common.actions.cancel', 'Cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
