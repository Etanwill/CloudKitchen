import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Cloud,
  Folder,
  AccessTime,
  Delete,
  Storage,
  Add,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useFiles } from '../../contexts/FileContext';

const drawerWidth = 280;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { storageInfo, fetchFiles } = useFiles();

  const menuItems = [
    { text: 'My Drive', icon: <Cloud />, path: '/drive' },
    { text: 'Recent', icon: <AccessTime />, path: '/recent' },
    { text: 'Trash', icon: <Delete />, path: '/trash' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleNewFolder = async () => {
    const name = prompt('Enter folder name:');
    if (name && user?.id) {
      // This will be handled by FileContext
      // For now, just navigate
      navigate(`/drive?action=create-folder&name=${encodeURIComponent(name)}`);
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid #e0e0e0',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Cloud sx={{ fontSize: 40, color: '#4285f4' }} />
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Cloud Drive
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 2 }}>
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton
            onClick={handleNewFolder}
            sx={{
              borderRadius: 2,
              backgroundColor: '#f0f7ff',
              '&:hover': {
                backgroundColor: '#e3f2fd',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Add sx={{ color: '#4285f4' }} />
            </ListItemIcon>
            <ListItemText 
              primary="New" 
              primaryTypographyProps={{ 
                fontWeight: 500,
                color: '#4285f4'
              }}
            />
          </ListItemButton>
        </ListItem>

        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: '#e8f0fe',
                  '&:hover': {
                    backgroundColor: '#dbe7fd',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ 
                minWidth: 40,
                color: location.pathname === item.path ? '#4285f4' : '#5f6368'
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{ 
                  fontWeight: location.pathname === item.path ? 500 : 400,
                  color: location.pathname === item.path ? '#4285f4' : '#202124'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Storage Info */}
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: '#5f6368' }}>
          Storage
        </Typography>
        
        <LinearProgress
          variant="determinate"
          value={storageInfo?.used_percentage || 0}
          sx={{
            height: 8,
            borderRadius: 4,
            mb: 1,
            backgroundColor: '#e8eaed',
            '& .MuiLinearProgress-bar': {
              backgroundColor: 
                (storageInfo?.used_percentage || 0) > 90 ? '#ea4335' :
                (storageInfo?.used_percentage || 0) > 75 ? '#fbbc04' : '#34a853',
            },
          }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: '#5f6368' }}>
            {storageInfo?.used_readable || '0 B'} of {storageInfo?.limit_readable || '5 GB'} used
          </Typography>
          <Typography variant="caption" sx={{ color: '#5f6368' }}>
            {storageInfo?.remaining_readable || '5 GB'} free
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: '#5f6368', display: 'block' }}>
          {user?.email || 'User'}
        </Typography>
        <Typography variant="caption" sx={{ color: '#9aa0a6', display: 'block' }}>
          {storageInfo?.used_percentage?.toFixed(1) || 0}% used
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;