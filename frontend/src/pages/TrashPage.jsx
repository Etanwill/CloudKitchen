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
  Checkbox,
  IconButton,
} from '@mui/material';
import {
  Delete,
  DeleteForever,
  RestoreFromTrash,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useFiles } from '../contexts/FileContext';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import FileCard from '../components/files/FileCard';
import toast from 'react-hot-toast';

const TrashPage = () => {
  const { user } = useAuth();
  const {
    files,
    folders,
    loading,
    fetchFiles,
    deleteFile,
    restoreFile,
    selectedItems,
    toggleSelection,
    clearSelection,
    selectAll,
  } = useFiles();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchTrashedFiles();
    }
  }, [user?.id]);

  const fetchTrashedFiles = async () => {
    await fetchFiles(user.id, null, true);
  };

  const handlePermanentDelete = async () => {
    const promises = Array.from(selectedItems).map(itemId =>
      deleteFile(itemId, user.id, true)
    );
    
    await Promise.all(promises);
    setShowDeleteDialog(false);
    clearSelection();
    toast.success('Files permanently deleted');
  };

  const handleRestoreSelected = async () => {
    const promises = Array.from(selectedItems).map(itemId =>
      restoreFile(itemId, user.id)
    );
    
    await Promise.all(promises);
    setShowRestoreDialog(false);
    clearSelection();
    toast.success('Files restored');
  };

  const handleRefresh = () => {
    fetchTrashedFiles();
    toast.success('Refreshed!');
  };

  const handleMenuToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const trashedItems = [...folders, ...files];
  const hasSelection = selectedItems.size > 0;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Sidebar />
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <TopBar onMenuClick={handleMenuToggle} />
        
        <Box sx={{ 
          mt: '64px',
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
                  Trash
                </Typography>
                <Typography variant="body2" sx={{ color: '#5f6368' }}>
                  {trashedItems.length} items in trash
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {hasSelection && (
                  <>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<DeleteForever />}
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      Delete Forever ({selectedItems.size})
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<RestoreFromTrash />}
                      onClick={() => setShowRestoreDialog(true)}
                    >
                      Restore ({selectedItems.size})
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={clearSelection}
                    >
                      Clear Selection
                    </Button>
                  </>
                )}
                
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

            {/* Select all checkbox */}
            {trashedItems.length > 0 && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={selectedItems.size === trashedItems.length}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < trashedItems.length}
                  onChange={() => {
                    if (selectedItems.size === trashedItems.length) {
                      clearSelection();
                    } else {
                      selectAll();
                    }
                  }}
                />
                <Typography variant="body2" sx={{ color: '#5f6368' }}>
                  {selectedItems.size > 0 
                    ? `${selectedItems.size} selected`
                    : 'Select all'
                  }
                </Typography>
              </Box>
            )}

            {/* Loading state */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Items grid */}
                {trashedItems.length > 0 ? (
                  <Grid container spacing={2}>
                    {trashedItems.map((item) => (
                      <Grid item key={item.id} xs={6} sm={4} md={3} lg={2}>
                        <FileCard 
                          file={item} 
                          selected={selectedItems.has(item.id)} 
                          inTrash={true}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
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
                      <Delete sx={{ fontSize: 48, color: '#5f6368' }} />
                    </Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                      Trash is empty
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#5f6368' }}>
                      Items you delete will appear here
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Container>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>
          Delete Forever?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete {selectedItems.size} item(s)? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePermanentDelete}
            color="error"
            variant="contained"
          >
            Delete Forever
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
      >
        <DialogTitle>
          Restore Items?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Restore {selectedItems.size} item(s) to their original locations?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRestoreDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRestoreSelected}
            color="success"
            variant="contained"
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrashPage;