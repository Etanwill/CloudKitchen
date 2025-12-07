import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  CreateNewFolder,
  Upload,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useFiles } from '../contexts/FileContext';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import FileCard from '../components/files/FileCard';
import FileUpload from '../components/files/FileUpload';
import FileList from '../components/files/FileList';
import toast from 'react-hot-toast';

const DrivePage = () => {
  const { user } = useAuth();
  const {
    files,
    folders,
    loading,
    viewMode,
    selectedItems,
    fetchFiles,
    createFolder,
    clearSelection,
    selectAll,
  } = useFiles();
  
  const [showUpload, setShowUpload] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchFiles(user.id);
    }
  }, [user?.id, fetchFiles]);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    const result = await createFolder(user.id, folderName);
    if (result.success) {
      setShowFolderDialog(false);
      setFolderName('');
      toast.success('Folder created successfully!');
    }
  };

  const handleRefresh = () => {
    if (user?.id) {
      fetchFiles(user.id);
      toast.success('Refreshed!');
    }
  };

  const handleMenuToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const hasSelection = selectedItems.size > 0;
  const totalItems = files.length + folders.length;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar for desktop */}
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Sidebar />
      </Box>

      {/* Mobile drawer */}
      <Box sx={{ display: { sm: 'none' } }}>
        {/* Mobile drawer implementation would go here */}
      </Box>

      {/* Main content */}
      <Box sx={{ flexGrow: 1 }}>
        <TopBar onMenuClick={handleMenuToggle} />
        
        {/* Main content area */}
        <Box sx={{ 
          mt: '64px', // Offset for fixed AppBar
          p: 3,
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: '#f8f9fa',
        }}>
          <Container maxWidth="xl">
            {/* Header */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 3,
              flexWrap: 'wrap',
              gap: 2,
            }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 500, mb: 0.5 }}>
                  My Drive
                </Typography>
                <Typography variant="body2" sx={{ color: '#5f6368' }}>
                  {files.length} files, {folders.length} folders
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {hasSelection && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={clearSelection}
                    >
                      Clear Selection ({selectedItems.size})
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={selectAll}
                    >
                      Select All ({totalItems})
                    </Button>
                  </>
                )}
                
                <Button
                  variant="contained"
                  startIcon={<Upload />}
                  onClick={() => setShowUpload(true)}
                >
                  Upload
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<CreateNewFolder />}
                  onClick={() => setShowFolderDialog(true)}
                >
                  New Folder
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>
            </Box>

            {/* Loading state */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Folders */}
                {folders.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      Folders
                    </Typography>
                    {viewMode === 'grid' ? (
                      <Grid container spacing={2}>
                        {folders.map((folder) => (
                          <Grid item key={folder.id} xs={6} sm={4} md={3} lg={2}>
                            <FileCard file={folder} selected={selectedItems.has(folder.id)} />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <FileList items={folders} />
                    )}
                  </Box>
                )}

                {/* Files */}
                {files.length > 0 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      Files
                    </Typography>
                    {viewMode === 'grid' ? (
                      <Grid container spacing={2}>
                        {files.map((file) => (
                          <Grid item key={file.id} xs={6} sm={4} md={3} lg={2}>
                            <FileCard file={file} selected={selectedItems.has(file.id)} />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <FileList items={files} />
                    )}
                  </Box>
                )}

                {/* Empty state */}
                {files.length === 0 && folders.length === 0 && (
                  <Box sx={{ 
                    textAlign: 'center', 
                    mt: 8,
                    p: 4,
                  }}>
                    <Box sx={{ 
                      width: 120, 
                      height: 120, 
                      borderRadius: '50%',
                      backgroundColor: '#f1f3f4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                    }}>
                      <Upload sx={{ fontSize: 48, color: '#5f6368' }} />
                    </Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                      Your drive is empty
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#5f6368', mb: 3 }}>
                      Upload files or create folders to get started
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Upload />}
                      onClick={() => setShowUpload(true)}
                      size="large"
                    >
                      Upload Files
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Container>
        </Box>
      </Box>

      {/* Upload Dialog */}
      <Dialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        maxWidth="md"
        fullWidth
      >
        <FileUpload onClose={() => setShowUpload(false)} />
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog
        open={showFolderDialog}
        onClose={() => setShowFolderDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Create New Folder
          </Typography>
          <TextField
            fullWidth
            label="Folder Name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
            sx={{ mb: 3 }}
            autoFocus
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => setShowFolderDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateFolder}
              disabled={!folderName.trim()}
            >
              Create Folder
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default DrivePage;