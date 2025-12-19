'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import AppLayout from '@/components/shared/AppLayout';

interface FileDocument {
  _id?: string;
  id?: string;
  type: string;
  typeLabel: string;
  link: string;
  title: string;
  timestamp: Date;
}

interface FileFolder {
  _id?: string;
  id?: string;
  name: string;
  documents: FileDocument[];
  createdAt: Date;
  color: string;
}

type View = 'folders' | 'folder-detail';

const folderColors = ['#879BFF', '#FF6495', '#48bb78', '#ed8936', '#9f7aea', '#4299e1', '#f56565', '#38b2ac', '#ecc94b', '#667eea'];

const documentTypes = [
  { value: 'figma', label: 'Figma', icon: 'figma' },
  { value: 'word', label: 'Document', icon: 'file-text' },
  { value: 'qa', label: 'QA', icon: 'clipboard' },
  { value: 'spreadsheet', label: 'Spreadsheet', icon: 'spreadsheet' },
  { value: 'website', label: 'Website', icon: 'globe' },
  { value: 'other', label: 'Other', icon: 'file' },
];

const getDocumentIcon = (type: string) => {
  switch (type) {
    case 'figma':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/>
          <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/>
          <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/>
          <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/>
          <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/>
        </svg>
      );
    case 'word':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
      );
    case 'qa':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
      );
    case 'spreadsheet':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="3" y1="15" x2="21" y2="15"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
      );
    case 'website':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
      );
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'figma': return { color: '#a259ff', bg: '#f5f0ff' };
    case 'word': return { color: '#2b579a', bg: '#e8f0fe' };
    case 'qa': return { color: '#16a34a', bg: '#dcfce7' };
    case 'spreadsheet': return { color: '#0f9d58', bg: '#e6f4ea' };
    case 'website': return { color: '#879BFF', bg: '#E8ECFF' };
    default: return { color: '#6b7280', bg: '#f3f4f6' };
  }
};

export default function FileManagementPage() {
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('folders');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  const [selectedType, setSelectedType] = useState<string>('');
  const [documentLink, setDocumentLink] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<FileDocument | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'document'; id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');


  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/file-folders');
      const data = await response.json();
      setFolders(data);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const selectedFolder = folders.find(f => (f._id || f.id) === selectedFolderId);

  const filteredDocuments = useMemo(() => {
    if (!selectedFolder) return [];
    return selectedFolder.documents.filter(doc => {
      const matchesSearch = !searchQuery ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.link.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || doc.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [selectedFolder, searchQuery, filterType]);

  // Get document type counts for filter badges
  const getTypeCount = (typeValue: string) => {
    if (!selectedFolder) return 0;
    if (typeValue === 'all') return selectedFolder.documents.length;
    return selectedFolder.documents.filter(d => d.type === typeValue).length;
  };

  const getTypeInfo = (typeValue: string) => {
    return documentTypes.find((t) => t.value === typeValue);
  };

  const handleSelectFolder = (folder: FileFolder) => {
    setSelectedFolderId(folder._id || folder.id || '');
    setCurrentView('folder-detail');
    resetDocumentForm();
  };

  const handleBackToFolders = () => {
    setCurrentView('folders');
    setSelectedFolderId(null);
    resetDocumentForm();
    setSearchQuery('');
    setFilterType('all');
    setShowAddModal(false);
  };

  const handleStartEditFolder = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
  };

  const handleSaveFolderName = async (folderId: string) => {
    if (editingFolderName.trim()) {
      try {
        await fetch(`/api/file-folders/${folderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editingFolderName.trim() }),
        });
        await fetchFolders();
        showSuccess('Folder renamed successfully');
      } catch (error) {
        console.error('Failed to update folder:', error);
      }
    }
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleCancelEditFolder = () => {
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleAddNewFolder = async () => {
    if (newFolderName.trim()) {
      try {
        await fetch('/api/file-folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newFolderName.trim(),
            color: folderColors[folders.length % folderColors.length],
          }),
        });
        await fetchFolders();
        setNewFolderName('');
        setShowNewFolderInput(false);
        showSuccess('Folder created successfully');
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    }
  };

  const handleOpenDeleteModal = (type: 'folder' | 'document', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'folder') {
        await fetch(`/api/file-folders/${deleteTarget.id}`, {
          method: 'DELETE',
        });
      } else {
        if (!selectedFolderId) return;
        await fetch(`/api/file-folders/${selectedFolderId}/documents?documentId=${deleteTarget.id}`, {
          method: 'DELETE',
        });
      }
      await fetchFolders();
      handleCloseDeleteModal();
      showSuccess(deleteTarget.type === 'folder' ? 'Folder deleted successfully' : 'Document deleted successfully');
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const resetDocumentForm = () => {
    setSelectedType('');
    setDocumentLink('');
    setDocumentTitle('');
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
  };

  const handleOpenAddModal = () => {
    resetDocumentForm();
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    resetDocumentForm();
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (documentLink.trim() && documentTitle.trim() && selectedType) {
      if (!selectedFolderId) return;

      const typeInfo = getTypeInfo(selectedType);

      try {
        await fetch(`/api/file-folders/${selectedFolderId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: selectedType,
            typeLabel: typeInfo?.label || selectedType,
            link: documentLink,
            title: documentTitle,
          }),
        });

        await fetchFolders();
        setShowAddModal(false);
        showSuccess('Document added successfully');
        resetDocumentForm();
      } catch (error) {
        console.error('Failed to add document:', error);
      }
    }
  };

  const handleOpenEditModal = (doc: FileDocument) => {
    setEditingDocument(doc);
    setSelectedType(doc.type);
    setDocumentTitle(doc.title);
    setDocumentLink(doc.link);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingDocument(null);
    resetDocumentForm();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentLink.trim() || !documentTitle.trim() || !selectedType || !editingDocument || !selectedFolderId) return;

    const typeInfo = getTypeInfo(selectedType);
    const docId = editingDocument._id || editingDocument.id || '';

    try {
      await fetch(`/api/file-folders/${selectedFolderId}/documents?documentId=${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          typeLabel: typeInfo?.label || selectedType,
          link: documentLink,
          title: documentTitle,
        }),
      });

      await fetchFolders();
      handleCloseEditModal();
      showSuccess('Document updated successfully');
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  };

  // Folders View
  if (currentView === 'folders') {
    return (
      <AppLayout>
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>File Management</h1>
              <p style={styles.subtitle}>Organize and manage your project documents</p>
            </div>
            <button
              onClick={() => setShowNewFolderInput(true)}
              style={styles.addButton}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Folder
            </button>
          </div>

          {loading ? (
            <div style={styles.loadingState}>Loading folders...</div>
          ) : (
            <div style={styles.foldersGrid}>
              {folders.map((folder) => {
                const folderId = folder._id || folder.id || '';
                return (
                  <div
                    key={folderId}
                    style={styles.folderCard}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#879BFF';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 155, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                    }}
                  >
                    {/* Color indicator line */}
                    <div style={{ ...styles.folderColorLine, backgroundColor: folder.color }} />

                    {editingFolderId === folderId ? (
                      <div style={styles.editRow}>
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          style={styles.editInput}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveFolderName(folderId);
                            if (e.key === 'Escape') handleCancelEditFolder();
                          }}
                        />
                        <div style={styles.editActions}>
                          <button onClick={() => handleSaveFolderName(folderId)} style={styles.saveBtn}>Save</button>
                          <button onClick={handleCancelEditFolder} style={styles.cancelBtn}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.folderCardBody}>
                        <div
                          style={styles.folderCardContent}
                          onClick={() => handleSelectFolder(folder)}
                        >
                          <div style={{ ...styles.folderIcon, background: folder.color }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            </svg>
                          </div>
                          <div style={styles.folderInfo}>
                            <h3 style={styles.folderName}>{folder.name}</h3>
                            <span style={styles.folderMeta}>
                              {folder.documents.length} {folder.documents.length === 1 ? 'document' : 'documents'}
                            </span>
                          </div>
                        </div>
                        <div style={styles.folderActions}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditFolder(folderId, folder.name);
                            }}
                            style={styles.actionBtn}
                            title="Rename"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal('folder', folderId, folder.name);
                            }}
                            style={styles.actionBtnDanger}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* New Folder Card */}
              {showNewFolderInput ? (
                <div style={styles.newFolderCard}>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    style={styles.newFolderInput}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddNewFolder();
                      if (e.key === 'Escape') {
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }
                    }}
                  />
                  <div style={styles.newFolderActions}>
                    <button onClick={handleAddNewFolder} style={styles.btnPrimary}>Create</button>
                    <button
                      onClick={() => {
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }}
                      style={styles.btnSecondary}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : folders.length === 0 && (
                <div style={styles.emptyFolderState}>
                  <div style={styles.emptyIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      <line x1="12" y1="11" x2="12" y2="17"/>
                      <line x1="9" y1="14" x2="15" y2="14"/>
                    </svg>
                  </div>
                  <p style={styles.emptyText}>No folders yet</p>
                  <p style={styles.emptySubtext}>Create your first folder to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && deleteTarget && (
            <div style={styles.modalOverlay} onClick={handleCloseDeleteModal}>
              <div style={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
                <button onClick={handleCloseDeleteModal} style={styles.modalCloseBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <div style={styles.deleteIconWrapper}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </div>
                <h3 style={styles.deleteTitle}>Delete Folder</h3>
                <p style={styles.deleteMessage}>
                  Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
                  This will also delete all documents inside.
                </p>
                <div style={styles.deleteActions}>
                  <button onClick={handleCloseDeleteModal} style={styles.btnSecondary}>Cancel</button>
                  <button onClick={handleConfirmDelete} style={styles.btnDanger}>Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* Success Toast */}
          {showSuccessToast && (
            <div style={styles.successToast}>
              <div style={styles.successToastIcon}>
                <svg width="20" height="20" fill="white" viewBox="0 0 16 16">
                  <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
                </svg>
              </div>
              <span style={styles.successToastText}>{successMessage}</span>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Folder Detail View
  return (
    <AppLayout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.detailHeader}>
          <button onClick={handleBackToFolders} style={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            All Folders
          </button>
          <div style={styles.folderTitleRow}>
            <div style={{ ...styles.folderIconLarge, background: selectedFolder?.color }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <h1 style={styles.folderTitleLarge}>{selectedFolder?.name}</h1>
              <p style={styles.folderSubtitle}>{selectedFolder?.documents.length || 0} documents in this folder</p>
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div style={styles.controlsRow}>
          <div style={styles.filterTabs}>
            <button
              style={{
                ...styles.filterTab,
                ...(filterType === 'all' ? styles.filterTabActive : {}),
              }}
              onClick={() => setFilterType('all')}
            >
              All
              <span style={{
                ...styles.filterBadge,
                ...(filterType === 'all' ? styles.filterBadgeActive : {}),
              }}>
                {getTypeCount('all')}
              </span>
            </button>
            {documentTypes.map(type => (
              <button
                key={type.value}
                style={{
                  ...styles.filterTab,
                  ...(filterType === type.value ? styles.filterTabActive : {}),
                }}
                onClick={() => setFilterType(type.value)}
              >
                {type.label}
                <span style={{
                  ...styles.filterBadge,
                  ...(filterType === type.value ? styles.filterBadgeActive : {}),
                }}>
                  {getTypeCount(type.value)}
                </span>
              </button>
            ))}
          </div>

          <div style={styles.rightControls}>
            <div style={styles.viewToggle}>
              <button
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'grid' ? styles.viewButtonActive : {}),
                }}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5z"/>
                </svg>
              </button>
              <button
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'list' ? styles.viewButtonActive : {}),
                }}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
                </svg>
              </button>
            </div>

            <div style={styles.searchContainer}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={styles.searchIcon}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                style={styles.searchInput}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            <button onClick={handleOpenAddModal} style={styles.addButton}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Document
            </button>
          </div>
        </div>

        {/* Pagination Info */}
        <div style={styles.paginationRow}>
          <span style={styles.paginationText}>
            Showing {filteredDocuments.length} of {selectedFolder?.documents.length || 0} documents
          </span>
        </div>

        {/* Documents Grid */}
        {(selectedFolder?.documents.length || 0) === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="12" y1="12" x2="12" y2="18"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <p style={styles.emptyText}>No documents yet</p>
            <p style={styles.emptySubtext}>Add your first document to get started</p>
            <button onClick={handleOpenAddModal} style={styles.addButton}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Document
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No documents found</p>
            <p style={styles.emptySubtext}>Try adjusting your search or filter</p>
          </div>
        ) : (
          <div style={viewMode === 'grid' ? styles.docGrid : styles.docList}>
            {filteredDocuments.map((doc) => {
              const docId = doc._id || doc.id || '';
              const typeColor = getTypeColor(doc.type);

              return (
                <div
                  key={docId}
                  style={viewMode === 'grid' ? styles.docCard : styles.docCardList}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#879BFF';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 155, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                  }}
                >
                  {/* Type indicator line */}
                  <div style={{ ...styles.docTypeLine, backgroundColor: typeColor.color }} />

                  <div style={styles.docCardBody}>
                    <div style={styles.docCardHeader}>
                      <div style={{ ...styles.docIcon, background: typeColor.bg, color: typeColor.color }}>
                        {getDocumentIcon(doc.type)}
                      </div>
                      <span style={{ ...styles.docTypeBadge, color: typeColor.color, background: typeColor.bg }}>
                        {doc.typeLabel}
                      </span>
                      <div style={styles.docActions}>
                        <button
                          onClick={() => handleOpenEditModal(doc)}
                          style={styles.docActionBtn}
                          title="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal('document', docId, doc.title)}
                          style={styles.docActionBtnDanger}
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h3 style={styles.docTitle}>{doc.title}</h3>

                    <a
                      href={doc.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.docLink}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      <span>{doc.link.length > 40 ? doc.link.substring(0, 40) + '...' : doc.link}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Document Modal */}
        {showAddModal && (
          <div style={styles.modalOverlay} onClick={handleCloseAddModal}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Add Document</h2>
                <button onClick={handleCloseAddModal} style={styles.modalCloseBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleDetailsSubmit} style={styles.modalForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>DOCUMENT TYPE</label>
                  <div style={styles.typeGrid}>
                    {documentTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleTypeSelect(type.value)}
                        style={{
                          ...styles.typeBtn,
                          ...(selectedType === type.value ? styles.typeBtnSelected : {}),
                        }}
                      >
                        {getDocumentIcon(type.value)}
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>TITLE</label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Enter document title"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>LINK</label>
                  <div style={styles.inputGroup}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={styles.inputIcon}>
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <input
                      type="url"
                      value={documentLink}
                      onChange={(e) => setDocumentLink(e.target.value)}
                      placeholder="https://..."
                      style={styles.inputWithIcon}
                      required
                    />
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button type="button" onClick={handleCloseAddModal} style={styles.btnSecondary}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      ...styles.btnPrimary,
                      opacity: (!documentLink.trim() || !documentTitle.trim() || !selectedType) ? 0.5 : 1,
                    }}
                    disabled={!documentLink.trim() || !documentTitle.trim() || !selectedType}
                  >
                    Add Document
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Document Modal */}
        {showEditModal && editingDocument && (
          <div style={styles.modalOverlay} onClick={handleCloseEditModal}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Edit Document</h2>
                <button onClick={handleCloseEditModal} style={styles.modalCloseBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} style={styles.modalForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>DOCUMENT TYPE</label>
                  <div style={styles.typeGrid}>
                    {documentTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleTypeSelect(type.value)}
                        style={{
                          ...styles.typeBtn,
                          ...(selectedType === type.value ? styles.typeBtnSelected : {}),
                        }}
                      >
                        {getDocumentIcon(type.value)}
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>TITLE</label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Enter document title"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>LINK</label>
                  <div style={styles.inputGroup}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={styles.inputIcon}>
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <input
                      type="url"
                      value={documentLink}
                      onChange={(e) => setDocumentLink(e.target.value)}
                      placeholder="https://..."
                      style={styles.inputWithIcon}
                      required
                    />
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button type="button" onClick={handleCloseEditModal} style={styles.btnSecondary}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      ...styles.btnPrimary,
                      opacity: (!documentLink.trim() || !documentTitle.trim() || !selectedType) ? 0.5 : 1,
                    }}
                    disabled={!documentLink.trim() || !documentTitle.trim() || !selectedType}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deleteTarget && (
          <div style={styles.modalOverlay} onClick={handleCloseDeleteModal}>
            <div style={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
              <button onClick={handleCloseDeleteModal} style={styles.modalCloseBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <div style={styles.deleteIconWrapper}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <h3 style={styles.deleteTitle}>Delete {deleteTarget.type === 'folder' ? 'Folder' : 'Document'}</h3>
              <p style={styles.deleteMessage}>
                Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
                {deleteTarget.type === 'folder' && ' This will also delete all documents inside.'}
              </p>
              <div style={styles.deleteActions}>
                <button onClick={handleCloseDeleteModal} style={styles.btnSecondary}>Cancel</button>
                <button onClick={handleConfirmDelete} style={styles.btnDanger}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {showSuccessToast && (
          <div style={styles.successToast}>
            <div style={styles.successToastIcon}>
              <svg width="20" height="20" fill="white" viewBox="0 0 16 16">
                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
              </svg>
            </div>
            <span style={styles.successToastText}>{successMessage}</span>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
    fontSize: '16px',
  },
  foldersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  folderCard: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  folderColorLine: {
    height: '4px',
    width: '100%',
  },
  folderCardBody: {
    padding: '20px',
  },
  folderCardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
  },
  folderIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  folderInfo: {
    flex: 1,
    minWidth: 0,
  },
  folderName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  folderMeta: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
    display: 'block',
  },
  folderActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  actionBtn: {
    padding: '8px 12px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  actionBtnDanger: {
    padding: '8px 12px',
    background: '#fef2f2',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  editRow: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  editInput: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #879BFF',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  editActions: {
    display: 'flex',
    gap: '8px',
  },
  saveBtn: {
    padding: '8px 16px',
    background: '#879BFF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  cancelBtn: {
    padding: '8px 16px',
    background: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  newFolderCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #879BFF',
  },
  newFolderInput: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  newFolderActions: {
    display: 'flex',
    gap: '10px',
  },
  emptyFolderState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #cbd5e1',
  },
  emptyIcon: {
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  detailHeader: {
    marginBottom: '24px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginBottom: '16px',
  },
  folderTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  folderIconLarge: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderTitleLarge: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  folderSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '20px',
    background: '#f1f5f9',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  filterTabActive: {
    background: '#879BFF',
    color: 'white',
  },
  filterBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
    background: 'white',
    color: '#64748b',
  },
  filterBadgeActive: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  viewToggle: {
    display: 'flex',
    gap: '4px',
    background: '#f1f5f9',
    padding: '4px',
    borderRadius: '8px',
  },
  viewButton: {
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#64748b',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonActive: {
    background: 'white',
    color: '#879BFF',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  searchContainer: {
    position: 'relative',
    width: '220px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 36px 10px 36px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '4px',
    padding: '4px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
  },
  paginationRow: {
    marginBottom: '20px',
  },
  paginationText: {
    fontSize: '14px',
    color: '#64748b',
  },
  docGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  docList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  docCard: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  docCardList: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  docTypeLine: {
    height: '4px',
    width: '100%',
  },
  docCardBody: {
    padding: '20px',
  },
  docCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  docIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTypeBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  docActions: {
    display: 'flex',
    gap: '4px',
    marginLeft: 'auto',
  },
  docActionBtn: {
    padding: '6px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    transition: 'all 0.2s',
  },
  docActionBtnDanger: {
    padding: '6px',
    background: '#fef2f2',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#ef4444',
    display: 'flex',
    transition: 'all 0.2s',
  },
  docTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
    lineHeight: '1.4',
  },
  docLink: {
    fontSize: '13px',
    color: '#879BFF',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #cbd5e1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 28px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  modalCloseBtn: {
    padding: '8px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '8px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
  },
  inputWithIcon: {
    width: '100%',
    padding: '12px 12px 12px 42px',
    fontSize: '15px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  typeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 10px',
    background: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  typeBtnSelected: {
    background: '#E8ECFF',
    borderColor: '#879BFF',
    color: '#879BFF',
  },
  btnPrimary: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  btnSecondary: {
    padding: '12px 20px',
    background: 'white',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  btnDanger: {
    padding: '12px 20px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  deleteModal: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    position: 'relative',
  },
  deleteIconWrapper: {
    width: '64px',
    height: '64px',
    background: '#fef2f2',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  deleteTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  deleteMessage: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  },
  deleteActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  successToast: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(34, 197, 94, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 2000,
  },
  successToastIcon: {
    width: '32px',
    height: '32px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successToastText: {
    fontSize: '14px',
    fontWeight: '600',
  },
};
