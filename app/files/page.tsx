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
  const [filterType, setFilterType] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<FileDocument | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'document'; id: string; name: string } | null>(null);

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
      const matchesType = !filterType || doc.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [selectedFolder, searchQuery, filterType]);

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
    setFilterType('');
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
      setSuccessMessage(deleteTarget.type === 'folder' ? 'Folder deleted successfully!' : 'Document deleted successfully!');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
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
        setSuccessMessage('Document added successfully!');
        setShowSuccessModal(true);
        resetDocumentForm();

        setTimeout(() => {
          setShowSuccessModal(false);
        }, 2000);
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
      setSuccessMessage('Document updated successfully!');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  };

  // Folders View
  if (currentView === 'folders') {
    return (
      <AppLayout>
        <div style={styles.container}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>File Management</h1>
              <p style={styles.subtitle}>Organize and manage your project documents</p>
            </div>
          </div>

          {loading ? (
            <div style={styles.loadingState}>
              <p>Loading folders...</p>
            </div>
          ) : (
            <div style={styles.foldersGrid}>
              {folders.map((folder) => {
                const folderId = folder._id || folder.id || '';
                return (
                  <div key={folderId} style={styles.folderCard}>
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
                          <button onClick={() => handleSaveFolderName(folderId)} style={styles.iconBtn} title="Save">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#48bb78" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                          <button onClick={handleCancelEditFolder} style={styles.iconBtn} title="Cancel">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f56565" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                );
              })}

              {/* Add New Folder Card */}
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
              ) : (
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  style={styles.addFolderCard}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span style={styles.addFolderText}>New Folder</span>
                </button>
              )}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && deleteTarget && (
            <div style={styles.modalOverlay} onClick={handleCloseDeleteModal}>
              <div style={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.deleteIconWrapper}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f56565" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </div>
                <h3 style={styles.deleteTitle}>Delete Folder</h3>
                <p style={styles.deleteMessage}>
                  Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
                  This will also delete all documents inside.
                </p>
                <p style={styles.deleteWarning}>This action cannot be undone.</p>
                <div style={styles.deleteActions}>
                  <button onClick={handleCloseDeleteModal} style={styles.btnSecondary}>
                    Cancel
                  </button>
                  <button onClick={handleConfirmDelete} style={styles.btnDanger}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {showSuccessModal && (
            <div style={styles.modalOverlay} onClick={() => setShowSuccessModal(false)}>
              <div style={styles.successModal} onClick={(e) => e.stopPropagation()}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#48bb78" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p style={styles.successText}>{successMessage || 'Success!'}</p>
              </div>
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
        <div style={styles.headerDetail}>
          <button onClick={handleBackToFolders} style={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            <span>All Folders</span>
          </button>
          <div style={styles.folderHeader}>
            <div style={{ ...styles.folderIconLarge, background: selectedFolder?.color }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h1 style={styles.folderTitleLarge}>{selectedFolder?.name}</h1>
          </div>
        </div>

        {/* Add Document Modal */}
        {showAddModal && (
          <div style={styles.modalOverlay} onClick={handleCloseAddModal}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Add Document</h2>
                <button onClick={handleCloseAddModal} style={styles.closeModalBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleDetailsSubmit} style={styles.modalForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Document Type</label>
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
                  <label style={styles.label}>Title</label>
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
                  <label style={styles.label}>Link</label>
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
                <button onClick={handleCloseEditModal} style={styles.closeModalBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} style={styles.modalForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Document Type</label>
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
                  <label style={styles.label}>Title</label>
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
                  <label style={styles.label}>Link</label>
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
              <div style={styles.deleteIconWrapper}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f56565" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <h3 style={styles.deleteTitle}>Delete {deleteTarget.type === 'folder' ? 'Folder' : 'Document'}</h3>
              <p style={styles.deleteMessage}>
                Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
                {deleteTarget.type === 'folder' && ' This will also delete all documents inside.'}
              </p>
              <p style={styles.deleteWarning}>This action cannot be undone.</p>
              <div style={styles.deleteActions}>
                <button onClick={handleCloseDeleteModal} style={styles.btnSecondary}>
                  Cancel
                </button>
                <button onClick={handleConfirmDelete} style={styles.btnDanger}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div style={styles.modalOverlay} onClick={() => setShowSuccessModal(false)}>
            <div style={styles.successModal} onClick={(e) => e.stopPropagation()}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#48bb78" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <p style={styles.successText}>{successMessage || 'Success!'}</p>
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div style={styles.section}>
          {(selectedFolder?.documents.length || 0) === 0 ? (
            <div style={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e0" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              <p style={styles.emptyText}>No documents yet</p>
              <p style={styles.emptySubtext}>Add your first document to get started</p>
              <button onClick={handleOpenAddModal} style={styles.btnPrimary}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Document
              </button>
            </div>
          ) : (
            <>
              <div style={styles.toolbar}>
                <div style={styles.searchBox}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
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
                    <button onClick={() => setSearchQuery('')} style={styles.clearBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={styles.select}
                >
                  <option value="">All types</option>
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <button onClick={handleOpenAddModal} style={styles.btnPrimary}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add
                </button>
              </div>

              <div style={styles.docGrid}>
                {filteredDocuments.length === 0 ? (
                  <p style={styles.noResults}>No documents found</p>
                ) : (
                  filteredDocuments.map((doc) => {
                    const docId = doc._id || doc.id || '';
                    return (
                      <div key={docId} style={styles.docCard}>
                        <div style={styles.docCardHeader}>
                          <div style={styles.docIcon}>
                            {getDocumentIcon(doc.type)}
                          </div>
                          <span style={styles.docType}>{doc.typeLabel}</span>
                          <button
                            onClick={() => handleOpenEditModal(doc)}
                            style={styles.docEditBtn}
                            title="Edit"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal('document', docId, doc.title)}
                            style={styles.docDeleteBtn}
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
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
                          <span>{doc.link.length > 35 ? doc.link.substring(0, 35) + '...' : doc.link}</span>
                        </a>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={styles.footer}>
                <span style={styles.count}>
                  {filteredDocuments.length} of {selectedFolder?.documents.length} documents
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
  },
  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerDetail: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#718096',
    margin: 0,
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#718096',
    fontSize: '16px',
  },
  folderHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '20px',
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
    fontSize: '28px',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    background: 'none',
    border: 'none',
    fontSize: '15px',
    color: '#718096',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  foldersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  folderCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f1f5f9',
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: 'pointer',
  },
  folderCardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
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
    fontSize: '17px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  folderMeta: {
    fontSize: '14px',
    color: '#a0aec0',
    marginTop: '4px',
    display: 'block',
  },
  folderActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9',
  },
  actionBtn: {
    padding: '8px 12px',
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#718096',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  actionBtnDanger: {
    padding: '8px 12px',
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#f56565',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  iconBtn: {
    padding: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  editInput: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #879BFF',
    borderRadius: '10px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  editActions: {
    display: 'flex',
    gap: '8px',
  },
  newFolderCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '2px solid #879BFF',
  },
  newFolderInput: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    fontFamily: 'inherit',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  newFolderActions: {
    display: 'flex',
    gap: '10px',
  },
  addFolderCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px 24px',
    border: '2px dashed #d1d5db',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  addFolderText: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#9ca3af',
  },
  section: {
    marginTop: '24px',
  },
  toolbar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    flex: '1',
    minWidth: '200px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'none',
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  clearBtn: {
    padding: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    display: 'flex',
  },
  select: {
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    background: 'white',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    minWidth: '140px',
  },
  btnPrimary: {
    padding: '10px 18px',
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
    padding: '10px 18px',
    background: 'white',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  docGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  docCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    transition: 'box-shadow 0.2s',
  },
  docCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  docIcon: {
    width: '36px',
    height: '36px',
    background: '#f3f4f6',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#374151',
  },
  docType: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    flex: 1,
  },
  docEditBtn: {
    padding: '6px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#d1d5db',
    borderRadius: '6px',
    display: 'flex',
    transition: 'color 0.15s',
  },
  docDeleteBtn: {
    padding: '6px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#d1d5db',
    borderRadius: '6px',
    display: 'flex',
    transition: 'color 0.15s',
  },
  docTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
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
  noResults: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '15px',
    color: '#9ca3af',
    gridColumn: '1 / -1',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  count: {
    fontSize: '14px',
    color: '#a0aec0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#4a5568',
    margin: '24px 0 8px 0',
  },
  emptySubtext: {
    fontSize: '15px',
    color: '#a0aec0',
    margin: '0 0 32px 0',
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
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  closeModalBtn: {
    padding: '8px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6b7280',
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
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  input: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
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
    left: '14px',
  },
  inputWithIcon: {
    width: '100%',
    padding: '14px 14px 14px 46px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '8px',
  },
  typeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 10px',
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  typeBtnSelected: {
    background: '#eef2ff',
    borderColor: '#879BFF',
    color: '#5a67d8',
  },
  successModal: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px 60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  },
  successText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  deleteModal: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  },
  deleteIconWrapper: {
    width: '64px',
    height: '64px',
    background: '#fff5f5',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  deleteTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 12px 0',
  },
  deleteMessage: {
    fontSize: '15px',
    color: '#4a5568',
    margin: '0 0 8px 0',
    lineHeight: '1.5',
  },
  deleteWarning: {
    fontSize: '13px',
    color: '#a0aec0',
    margin: '0 0 24px 0',
  },
  deleteActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  btnDanger: {
    padding: '10px 24px',
    background: '#f56565',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
};
