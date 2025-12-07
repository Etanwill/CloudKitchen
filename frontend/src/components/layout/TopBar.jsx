import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  InputBase,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  Button,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Search,
  Menu as MenuIcon,
  Apps,
  Settings,
  Help,
  ViewModule,
  ViewList,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useFiles } from '../../contexts/FileContext';

const TopBar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { viewMode, setViewMode, searchFiles } = useFiles();
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    if (user?.id) {
      searchFiles(user.id, value);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    handleMenuClose();
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - 280px)` },
        ml: { sm: `280px` },
        backgroundColor: 'white',
        color: '#202124',
        boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15)',
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important' }}>
        {/* Mobile menu button */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Search bar */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f1f3f4',
            borderRadius: 2,
            px: 2,
            py: 0.5,
            maxWidth: 720,
            mx: 'auto',
          }}
        >
          <Search sx={{ color: '#5f6368', mr: 1 }} />
          <InputBase
            placeholder="Search in Drive"
            value={searchValue}
            onChange={handleSearch}
            sx={{
              flex: 1,
              '& .MuiInputBase-input': {
                py: 0.5,
              },
            }}
          />
        </Box>

        {/* View toggle */}
        <Tooltip title={viewMode === 'grid' ? 'List view' : 'Grid view'}>
          <IconButton onClick={toggleViewMode} sx={{ ml: 1 }}>
            {viewMode === 'grid' ? <ViewList /> : <ViewModule />}
          </IconButton>
        </Tooltip>

        {/* Apps icon */}
        <IconButton sx={{ ml: 1 }}>
          <Apps />
        </IconButton>

        {/* Settings icon */}
        <IconButton sx={{ ml: 1 }}>
          <Settings />
        </IconButton>

        {/* Help icon */}
        <IconButton sx={{ ml: 1 }}>
          <Help />
        </IconButton>

        {/* User avatar */}
        <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: '#4285f4',
              fontSize: '0.875rem',
            }}
          >
            {user?.email?.charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>

        {/* User menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: { mt: 1, minWidth: 200 },
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              {user?.email}
            </Typography>
            <Typography variant="caption" sx={{ color: '#5f6368' }}>
              {user?.storage_info?.used_percentage?.toFixed(1) || 0}% storage used
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <MenuItem onClick={handleLogout}>
            <Logout sx={{ mr: 2, fontSize: 20 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;