import React, { createContext, useState, useContext, useCallback } from 'react';
import { filesAPI } from '../utils/api';
import toast from 'react-hot-toast';

const FileContext = createContext({});

export const useFiles = () => useContext(FileContext);

export const FileProvider = ({ children }) => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [storageInfo, setStorageInfo] = useState(null);

  const fetchFiles = useCallback(async (userId, parentId = null, showTrashed = false) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const params = { user_id: userId, parent_id: parentId };
      if (showTrashed) params.trashed = true;
      
      const response = await filesAPI.listFiles(params);
      
      const items = response.data.items || [];
      const fileItems = items.filter(item => !item.is_folder);
      const folderItems = items.filter(item => item.is_folder);
      
      setFiles(fileItems);
      setFolders(folderItems);
      setStorageInfo(response.data.storage_info);
      setCurrentFolder(parentId);
      
      return { files: fileItems, folders: folderItems, storage: response.data.storage_info };
    } catch (error) {
      toast.error('Failed to load files');
      console.error('Error fetching files:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFile = async (file, userId, parentId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    if (parentId) formData.append('parent_id', parentId);

    try {
      const response = await filesAPI.uploadFile(formData);
      toast.success('File uploaded successfully!');
      
      // Refresh file list
      await fetchFiles(userId, parentId);
      
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Upload failed' };
    }
  };

  const createFolder = async (userId, name, parentId = null) => {
    try {
      const response = await filesAPI.createFolder(userId, name, parentId);
      toast.success('Folder created successfully!');
      
      // Refresh file list
      await fetchFiles(userId, parentId);
      
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to create folder' };
    }
  };

  const deleteFile = async (fileId, userId, permanent = false) => {
    try {
      await filesAPI.deleteFile(fileId, userId, permanent);
      toast.success(`File ${permanent ? 'deleted' : 'moved to trash'} successfully!`);
      
      // Refresh file list
      await fetchFiles(userId, currentFolder);
      
      // Clear selection
      setSelectedItems(new Set());
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Delete failed' };
    }
  };

  const restoreFile = async (fileId, userId) => {
    try {
      await filesAPI.restoreFile(fileId, userId);
      toast.success('File restored successfully!');
      
      // Refresh file list
      await fetchFiles(userId, currentFolder);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Restore failed' };
    }
  };

  const moveFile = async (fileId, userId, targetParentId) => {
    try {
      await filesAPI.moveFile(fileId, userId, targetParentId);
      toast.success('File moved successfully!');
      
      // Refresh file list
      await fetchFiles(userId, currentFolder);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Move failed' };
    }
  };

  const renameFile = async (fileId, userId, newName) => {
    try {
      await filesAPI.renameFile(fileId, userId, newName);
      toast.success('File renamed successfully!');
      
      // Refresh file list
      await fetchFiles(userId, currentFolder);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Rename failed' };
    }
  };

  const searchFiles = async (userId, query) => {
    if (!query.trim()) {
      await fetchFiles(userId, currentFolder);
      return;
    }

    setLoading(true);
    try {
      const response = await filesAPI.searchFiles(userId, query);
      const items = response.data.results || [];
      const fileItems = items.filter(item => !item.is_folder);
      const folderItems = items.filter(item => item.is_folder);
      
      setFiles(fileItems);
      setFolders(folderItems);
      setSearchQuery(query);
    } catch (error) {
      toast.error('Search failed');
      console.error('Error searching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (fileId, userId, filename) => {
    try {
      const response = await filesAPI.downloadFile(fileId, userId);
      
      // Create blob and download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started!');
    } catch (error) {
      toast.error('Download failed');
      console.error('Error downloading file:', error);
    }
  };

  const toggleSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const selectAll = () => {
    const allIds = [...files, ...folders].map(item => item.id);
    setSelectedItems(new Set(allIds));
  };

  const value = {
    files,
    folders,
    currentFolder,
    loading,
    viewMode,
    searchQuery,
    selectedItems,
    storageInfo,
    setViewMode,
    setSearchQuery,
    fetchFiles,
    uploadFile,
    createFolder,
    deleteFile,
    restoreFile,
    moveFile,
    renameFile,
    searchFiles,
    downloadFile,
    toggleSelection,
    clearSelection,
    selectAll,
  };

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
};