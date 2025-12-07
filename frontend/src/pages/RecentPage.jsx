import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  InsertDriveFile,
  Image,
  Description,
  MoreVert,
  GetApp,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { filesAPI } from '../utils/api';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import toast from 'react-hot-toast';

const RecentPage = () => {
  const { user } = useAuth();
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchRecentFiles();
    }
  }, [user?.id]);

  const fetchRecentFiles = async () => {
    setLoading(true);
    try {
      const response = await filesAPI.getRecentFiles(user.id, 50);
      setRecentFiles(response.data.files || []);
    } catch (error) {
      toast.error('Failed to load recent files');
      console.error('Error fetching recent files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event, file) => {
    setAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFile(null);
  };

  const handleDownload = async () => {
    if (selectedFile) {
      try {
        const response = await filesAPI.downloadFile(selectedFile.id, user.id);
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedFile.original_filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Download started!');
      } catch (error) {
        toast.error('Download failed');
      }
    }
    handleMenuClose();
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <Image sx={{ fontSize: 40, color: '#fbbc04' }} />;
      case 'document':
        return <Description sx={{ fontSize: 40, color: '#4285f4' }} />;
      default:
        return <InsertDriveFile sx={{ fontSize: 40, color: '#5f6368' }} />;
    }
  };

  const handleMenuToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 500 }}>
              Recent Files
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
              </Box>
            ) : recentFiles.length === 0 ? (
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
                  <InsertDriveFile sx={{ fontSize: 48, color: '#5f6368' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                  No recent files
                </Typography>
                <Typography variant="body1" sx={{ color: '#5f6368' }}>
                  Files you've recently opened will appear here
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {recentFiles.map((file) => (
                  <Grid item key={file.id} xs={12} sm={6} md={4} lg={3}>
                    <Card sx={{ '&:hover': { boxShadow: 6 } }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          {getFileIcon(file.file_type)}
                          <Box sx={{ flexGrow: 1, ml: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {file.original_filename}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#5f6368' }}>
                              {file.size_readable} • {format(new Date(file.updated_at), 'MMM d, yyyy')}
                            </Typography>
                          </Box>
                          <IconButton onClick={(e) => handleMenuClick(e, file)}>
                            <MoreVert />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Container>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDownload}>
          <GetApp sx={{ mr: 2, fontSize: 20 }} />
          Download
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default RecentPage;