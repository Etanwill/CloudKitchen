import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  Tooltip,
  TextField, // Add this import
} from '@mui/material';
import {
  InsertDriveFile,
  Image,
  Description,
  Folder,
  GridOn,
  Slideshow,
  Videocam,
  Audiotrack,
  MoreVert,
  GetApp,
  Delete,
  DriveFileMove,
  Edit,
  RestoreFromTrash,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useFiles } from '../../contexts/FileContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const FileCard = ({ file, selected, onSelect, inTrash = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { downloadFile, deleteFile, restoreFile, toggleSelection } = useFiles();
  const { user } = useAuth();

  const getFileIcon = () => {
    const icons = {
      image: <Image sx={{ fontSize: 48, color: '#fbbc04' }} />,
      document: <Description sx={{ fontSize: 48, color: '#4285f4' }} />,
      spreadsheet: <GridOn sx={{ fontSize: 48, color: '#0f9d58' }} />,
      presentation: <Slideshow sx={{ fontSize: 48, color: '#ea4335' }} />,
      video: <Videocam sx={{ fontSize: 48, color: '#ff5722' }} />,
      audio: <Audiotrack sx={{ fontSize: 48, color: '#ab47bc' }} />,
      folder: <Folder sx={{ fontSize: 48, color: '#fbbc04' }} />,
    };
    return icons[file.icon] || <InsertDriveFile sx={{ fontSize: 48, color: '#5f6368' }} />;
  };

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = async () => {
    if (!file.is_folder) {
      await downloadFile(file.id, user.id, file.original_filename);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      inTrash 
        ? 'Permanently delete this file? This action cannot be undone.'
        : 'Move to trash?'
    );
    
    if (confirmed) {
      await deleteFile(file.id, user.id, inTrash);
    }
    handleMenuClose();
  };

  const handleRestore = async () => {
    await restoreFile(file.id, user.id);
    handleMenuClose();
  };

  const handleRename = async () => {
    const newName = prompt('Enter new name:', file.original_filename);
    if (newName && newName !== file.original_filename) {
      // This will be handled by parent component
      console.log('Rename to:', newName);
    }
    handleMenuClose();
  };

  const handleCardClick = (event) => {
    if (event.target.type === 'checkbox') return;
    
    if (file.is_folder) {
      // Navigate to folder
      console.log('Navigate to folder:', file.id);
    } else {
      // Preview file
      console.log('Preview file:', file.id);
    }
  };

  return (
    <Card
      sx={{
        position: 'relative',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          '& .file-actions': {
            opacity: 1,
          },
        },
      }}
    >
      <CardActionArea onClick={handleCardClick}>
        <CardContent sx={{ p: 2, textAlign: 'center' }}>
          {/* Selection checkbox */}
          <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
            <Checkbox
              checked={selected}
              onChange={() => toggleSelection(file.id)}
              onClick={(e) => e.stopPropagation()}
              size="small"
            />
          </Box>

          {/* File icon */}
          <Box sx={{ mt: 2, mb: 1 }}>
            {getFileIcon()}
          </Box>

          {/* File name */}
          <Tooltip title={file.original_filename}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {file.original_filename}
            </Typography>
          </Tooltip>

          {/* File info */}
          {!file.is_folder && (
            <Typography variant="caption" sx={{ color: '#5f6368', display: 'block' }}>
              {file.size_readable}
            </Typography>
          )}
          
          <Typography variant="caption" sx={{ color: '#9aa0a6', display: 'block' }}>
            {format(new Date(file.created_at), 'MMM d, yyyy')}
          </Typography>
        </CardContent>
      </CardActionArea>

      {/* Action menu button */}
      <Box className="file-actions" sx={{ position: 'absolute', top: 8, right: 8, opacity: 0 }}>
        <IconButton size="small" onClick={handleMenuClick}>
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {!file.is_folder && (
          <MenuItem onClick={handleDownload}>
            <GetApp sx={{ mr: 2, fontSize: 20 }} />
            Download
          </MenuItem>
        )}
        
        <MenuItem onClick={handleRename}>
          <Edit sx={{ mr: 2, fontSize: 20 }} />
          Rename
        </MenuItem>
        
        {inTrash ? (
          <MenuItem onClick={handleRestore}>
            <RestoreFromTrash sx={{ mr: 2, fontSize: 20 }} />
            Restore
          </MenuItem>
        ) : (
          <MenuItem onClick={handleDelete}>
            <Delete sx={{ mr: 2, fontSize: 20 }} />
            Move to Trash
          </MenuItem>
        )}
        
        {!inTrash && !file.is_folder && (
          <MenuItem>
            <DriveFileMove sx={{ mr: 2, fontSize: 20 }} />
            Move to
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

export default FileCard;