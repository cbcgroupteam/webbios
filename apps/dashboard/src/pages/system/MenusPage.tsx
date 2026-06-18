import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { Button, Input, Combobox, IconPicker } from '@webbios/ui';
import { webbios } from '../../api';
import * as LucideIcons from 'lucide-react';

interface MenuTranslation {
  en: string;
  vi: string;
  isCategory?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  translations?: MenuTranslation | string;
  path: string | null;
  icon: string | null;
  parentId: string | null;
  permissionSlug: string | null;
  position: number;
  isVisible: boolean;
  isSystem?: boolean;
  isBeta?: boolean;
  isCategory?: boolean;
  children?: MenuItem[];
}

// Flat item used for rendering the tree as a list
interface FlatItem {
  id: string;
  parentId: string | null;
  depth: number;
  item: MenuItem;
  isCategory: boolean;
  hasChildren: boolean;
}

export default function MenusPage() {
  const { t } = useTranslation();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [permissions, setPermissions] = useState<{value: string, label: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    translationsEn: '',
    translationsVi: '',
    path: '',
    icon: '',
    parentId: '',
    permissionId: '',
    position: 0,
    isActive: true,
    isCategory: false,
    isSystem: false
  });

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ id: string; position: 'before' | 'after' | 'child' } | null>(null);
  const dragCounter = useRef(0);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const res = await webbios.menus.getMenus();
      setMenus(res.data);
      window.dispatchEvent(new CustomEvent('menusUpdated'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await webbios.permissions.getPermissions();
      setPermissions([
        { value: '', label: t('system.menus.modal.noPermission') },
        ...res.data.map((p: any) => ({
          value: p.id,
          label: `${p.slug} - ${p.name}`
        }))
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMenus();
    fetchPermissions();
  }, []);

  // Flatten tree to a list with depth info
  const flattenTree = useCallback((items: MenuItem[], depth: number = 0, parentId: string | null = null): FlatItem[] => {
    const result: FlatItem[] = [];
    const sorted = [...items].sort((a, b) => (a.position || 0) - (b.position || 0));
    for (const item of sorted) {
      const isCategory = item.isCategory === true || (item as any).isCategory === 1 || (item as any).is_category === true || (item as any).is_category === 1 || false;
      const hasChildren = (item.children && item.children.length > 0) || false;
      result.push({ id: item.id, parentId: item.parentId ?? parentId, depth, item, isCategory, hasChildren });
      if (item.children && item.children.length > 0) {
        result.push(...flattenTree(item.children, depth + 1, item.id));
      }
    }
    return result;
  }, []);

  const flatItems = flattenTree(menus);

  // Build parentOptions for the modal
  const parentOptions = [
    { value: '', label: t('system.menus.modal.rootMenu') },
    ...flatItems
      .filter(fi => fi.id !== editingId)
      .map(fi => ({
        value: fi.id,
        label: '  '.repeat(fi.depth) + fi.item.label
      }))
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        label: formData.title,
        isCategory: formData.isCategory,
        translations: JSON.stringify({
          en: formData.translationsEn,
          vi: formData.translationsVi
        }),
        path: formData.path || '',
        icon: formData.icon || null,
        parentId: formData.parentId || null,
        permissionSlug: formData.permissionId || null,
        position: formData.position,
        isVisible: formData.isActive
      };

      if (editingId) {
        await webbios.menus.updateMenu(editingId, payload);
      } else {
        await webbios.menus.createMenu(payload);
      }
      setIsModalOpen(false);
      fetchMenus();
    } catch (err: any) {
      alert(err.message || t('system.menus.errorSaving'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('system.menus.confirmDelete'))) return;
    try {
      await webbios.menus.deleteMenu(id);
      fetchMenus();
    } catch (err: any) {
      alert(err.message || t('system.menus.errorDeleting'));
    }
  };

  const openAddModal = (parentId: string = '') => {
    setEditingId(null);
    setFormData({
      title: '',
      translationsEn: '',
      translationsVi: '',
      path: '',
      icon: '',
      parentId,
      permissionId: '',
      position: 0,
      isActive: true,
      isCategory: false,
      isSystem: false
    });
    setIsModalOpen(true);
  };

  const openEditModal = (m: MenuItem) => {
    setEditingId(m.id);
    let en = '', vi = '', isCategory = m.isCategory === true || (m as any).isCategory === 1 || (m as any).is_category === true || (m as any).is_category === 1 || false;
    if (m.translations) {
      try {
        const transObj = typeof m.translations === 'string' ? JSON.parse(m.translations) : m.translations;
        en = transObj.en || '';
        vi = transObj.vi || '';
      } catch (e) {}
    }
    setFormData({
      title: m.label || (m as any).title || '',
      translationsEn: en,
      translationsVi: vi,
      path: m.path || '',
      icon: m.icon || '',
      parentId: m.parentId || '',
      permissionId: m.permissionSlug || '',
      position: m.position,
      isActive: m.isVisible !== false,
      isCategory,
      isSystem: m.isSystem || false
    });
    setIsModalOpen(true);
  };

  // ============ DRAG & DROP ============

  // Collect all descendant IDs of a given item
  const getDescendantIds = (id: string): string[] => {
    const result: string[] = [];
    const children = flatItems.filter(fi => fi.parentId === id);
    for (const child of children) {
      result.push(child.id);
      result.push(...getDescendantIds(child.id));
    }
    return result;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropIndicator(null);
    dragCounter.current = 0;
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    
    // Prevent dropping onto own descendants
    const descendants = getDescendantIds(dragId);
    if (descendants.includes(targetId)) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Top 25% = before, bottom 25% = after, middle 50% = child
    if (y < height * 0.25) {
      setDropIndicator({ id: targetId, position: 'before' });
    } else if (y > height * 0.75) {
      setDropIndicator({ id: targetId, position: 'after' });
    } else {
      setDropIndicator({ id: targetId, position: 'child' });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if actually leaving the element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropIndicator(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId || !dropIndicator) return;

    // Prevent dropping onto own descendants
    const descendants = getDescendantIds(dragId);
    if (descendants.includes(targetId)) return;

    const targetItem = flatItems.find(fi => fi.id === targetId);
    if (!targetItem) return;

    const position = dropIndicator.position;

    // Build the new order
    // We need to work with the full tree structure
    // Step 1: Remove dragItem from its current location
    const removeFromTree = (items: MenuItem[], idToRemove: string): { remaining: MenuItem[], removed: MenuItem | null } => {
      let removed: MenuItem | null = null;
      const remaining: MenuItem[] = [];
      for (const item of items) {
        if (item.id === idToRemove) {
          removed = item;
        } else {
          const childResult = removeFromTree(item.children || [], idToRemove);
          if (childResult.removed) removed = childResult.removed;
          remaining.push({ ...item, children: childResult.remaining });
        }
      }
      return { remaining, removed };
    };

    const { remaining, removed } = removeFromTree(menus, dragId);
    if (!removed) return;

    // Step 2: Insert removed item at the new position
    const insertIntoTree = (items: MenuItem[], targetIdStr: string, pos: 'before' | 'after' | 'child', itemToInsert: MenuItem): MenuItem[] => {
      const result: MenuItem[] = [];
      for (const item of items) {
        if (item.id === targetIdStr) {
          if (pos === 'before') {
            result.push({ ...itemToInsert, parentId: item.parentId, children: itemToInsert.children });
            result.push({ ...item, children: insertIntoTree(item.children || [], targetIdStr + '__skip', pos, itemToInsert) });
          } else if (pos === 'after') {
            result.push({ ...item, children: insertIntoTree(item.children || [], targetIdStr + '__skip', pos, itemToInsert) });
            result.push({ ...itemToInsert, parentId: item.parentId, children: itemToInsert.children });
          } else {
            // child - add as first child
            result.push({
              ...item,
              children: [{ ...itemToInsert, parentId: item.id, children: itemToInsert.children }, ...(item.children || [])]
            });
          }
        } else {
          result.push({ ...item, children: insertIntoTree(item.children || [], targetIdStr, pos, itemToInsert) });
        }
      }
      return result;
    };

    const newTree = insertIntoTree(remaining, targetId, position, removed);

    // Step 3: Flatten and collect all {id, parentId, position} for batch update
    const collectOrder = (items: MenuItem[], parentId: string | null): { id: string, parentId: string | null, position: number }[] => {
      const result: { id: string, parentId: string | null, position: number }[] = [];
      const sorted = items; // already in the correct order from insertIntoTree
      sorted.forEach((item, index) => {
        result.push({ id: item.id, parentId, position: index });
        if (item.children && item.children.length > 0) {
          result.push(...collectOrder(item.children, item.id));
        }
      });
      return result;
    };

    const reorderPayload = collectOrder(newTree, null);

    // Optimistic update
    setDragId(null);
    setDropIndicator(null);

    try {
      await webbios.menus.reorderMenus(reorderPayload);
      await fetchMenus();
    } catch (err: any) {
      alert('Error reordering: ' + err.message);
      await fetchMenus(); // revert
    }
  };

  // ============ RENDER ============

  const renderFlatItem = (fi: FlatItem) => {
    const { id, depth, item, isCategory: isCat, hasChildren } = fi;
    const IconComp = item.icon && (LucideIcons as any)[item.icon] ? (LucideIcons as any)[item.icon] : null;
    const isDragging = dragId === id;
    const isDropTarget = dropIndicator?.id === id;
    const dropPos = dropIndicator?.position;

    // Don't show drop indicator on self
    const showBefore = isDropTarget && dropPos === 'before' && dragId !== id;
    const showAfter = isDropTarget && dropPos === 'after' && dragId !== id;
    const showChild = isDropTarget && dropPos === 'child' && dragId !== id;

    if (isCat) {
      return (
        <div key={id} className="relative">
          {showBefore && (
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500 z-10 rounded" style={{ marginLeft: `${depth * 2 + 1}rem` }} />
          )}
          <div
            draggable={!item.isSystem}
            onDragStart={(e) => { if (!item.isSystem) handleDragStart(e, id) }}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, id)}
            className={`flex items-center justify-between py-3 px-4 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-all ${
              isDragging ? 'opacity-30' : ''
            } ${showChild ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''} ${item.isSystem ? 'cursor-default' : ''}`}
            style={{ paddingLeft: `${depth * 2 + 1}rem` }}
          >
            <div className="flex items-center space-x-3 w-full">
              {item.isSystem ? <div className="w-4 h-4" /> : (
                <div className="cursor-grab text-gray-400 hover:text-gray-600">
                  <GripVertical className="w-4 h-4" />
                </div>
              )}
              <div className="w-4 h-4" />
              <div className="w-4 h-4" />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                {item.label || (item as any).title}
                {item.isSystem && <span className="ml-2 text-[9px] bg-gray-200 text-gray-600 px-1 py-0.5 rounded normal-case tracking-normal">{t('common.systemDefault')}</span>}
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button onClick={() => openAddModal(item.id)} className="text-gray-400 hover:text-gray-700" title={t('system.menus.modal.addMenu')}><Plus className="w-4 h-4" /></button>
              <button onClick={() => openEditModal(item)} className="text-blue-500 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
              {!item.isSystem && <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
          {showAfter && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 z-10 rounded" style={{ marginLeft: `${depth * 2 + 1}rem` }} />
          )}
        </div>
      );
    }

    return (
      <div key={id} className="relative">
        {showBefore && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500 z-10 rounded" style={{ marginLeft: `${depth * 2 + 1}rem` }} />
        )}
        <div
          draggable={!item.isSystem}
          onDragStart={(e) => { if (!item.isSystem) handleDragStart(e, id) }}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, id)}
          className={`flex items-center justify-between py-3 px-4 border-b border-gray-100 bg-white hover:bg-gray-50 transition-all ${
            isDragging ? 'opacity-30' : ''
          } ${showChild ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''} ${item.isSystem ? 'cursor-default' : ''}`}
          style={{ paddingLeft: `${depth * 2 + 1}rem` }}
        >
          <div className="flex items-center space-x-3">
            {item.isSystem ? <div className="w-4 h-4" /> : (
              <div className="cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical className="w-4 h-4" />
              </div>
            )}
            {hasChildren ? (
              <div className="w-4 h-4 flex justify-center items-center text-gray-500">
                <ChevronDown size={14} strokeWidth={1.5} />
              </div>
            ) : (
              <div className="w-4 h-4" />
            )}
            {IconComp ? <IconComp size={16} strokeWidth={1.5} className="text-gray-500" /> : <div className="w-4 h-4" />}
            <span className="text-[13px] font-medium text-gray-800">
              {item.label || (item as any).title}
              {item.isSystem && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t('common.systemDefault')}</span>}
            </span>
            {item.path && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.path}</span>}
            {!item.isVisible && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">{t('system.menus.hidden')}</span>}
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => openAddModal(item.id)} className="text-gray-400 hover:text-gray-700" title={t('system.menus.modal.addMenu')}><Plus className="w-4 h-4" /></button>
            <button onClick={() => openEditModal(item)} className="text-blue-500 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
            {!item.isSystem && <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>}
          </div>
        </div>
        {showAfter && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 z-10 rounded" style={{ marginLeft: `${depth * 2 + 1}rem` }} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-cf-text flex items-center gap-2">
            {t('system.menus.title')}
          </h1>
          <p className="text-sm text-cf-gray-text mt-1">{t('system.menus.description')}</p>
        </div>
        <Button onClick={() => openAddModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('system.menus.addMenuLevel1')}
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-cf-border relative">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('system.menus.loading')}</div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-gray-50 py-3 px-4 border-b border-gray-200 font-medium text-xs text-gray-500 uppercase tracking-wider">
              {t('system.menus.structure')}
            </div>
            {flatItems.length > 0 ? (
              <div>
                {flatItems.map(fi => renderFlatItem(fi))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">No menus found.</div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? t('system.menus.modal.editMenu') : t('system.menus.modal.addMenu')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('system.menus.modal.titleFallback')}</label>
                  <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('system.menus.modal.path')}</label>
                  <Input value={formData.path} onChange={e => setFormData({...formData, path: e.target.value})} placeholder={t('system.menus.placeholders.path')} disabled={formData.isSystem} className={formData.isSystem ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                  <label className="block text-sm font-medium text-blue-800 mb-1">{t('system.menus.modal.translationsEn')}</label>
                  <Input value={formData.translationsEn} onChange={e => setFormData({...formData, translationsEn: e.target.value})} placeholder={t('system.menus.placeholders.translationsEn')} />
                </div>
                <div className="bg-green-50 p-3 rounded border border-green-100">
                  <label className="block text-sm font-medium text-green-800 mb-1">{t('system.menus.modal.translationsVi')}</label>
                  <Input value={formData.translationsVi} onChange={e => setFormData({...formData, translationsVi: e.target.value})} placeholder={t('system.menus.placeholders.translationsVi')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('system.menus.modal.parentMenu')}</label>
                  <Combobox 
                    options={parentOptions} 
                    value={formData.parentId} 
                    onChange={val => setFormData({...formData, parentId: val})} 
                    placeholder={t('common.placeholders.select')}
                    disabled={formData.isSystem}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('system.menus.modal.permissionId')}</label>
                  <Combobox 
                    options={permissions} 
                    value={formData.permissionId} 
                    onChange={val => setFormData({...formData, permissionId: val})} 
                    searchable={permissions.length > 10} 
                    placeholder={t('common.placeholders.select')}
                    searchPlaceholder={t('common.placeholders.search')}
                    disabled={formData.isSystem}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('system.menus.modal.icon')}</label>
                  <IconPicker 
                    value={formData.icon} 
                    onChange={val => setFormData({...formData, icon: val})} 
                    title={t('common.placeholders.selectIconTitle')}
                    placeholder={t('system.menus.placeholders.icon')} 
                    searchPlaceholder={t('common.placeholders.search')} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('system.menus.modal.position')}</label>
                  <Input type="number" value={formData.position as any} onChange={e => setFormData({...formData, position: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">{t('system.menus.modal.isActive')}</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="isCategory" checked={formData.isCategory} onChange={e => setFormData({...formData, isCategory: e.target.checked})} className="w-4 h-4 text-purple-600 rounded border-gray-300" />
                  <label htmlFor="isCategory" className="text-sm font-medium text-gray-700">{t('system.menus.modal.isCategoryLabel')}</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>{t('system.menus.modal.cancel')}</Button>
                <Button type="submit">{t('system.menus.modal.save')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
