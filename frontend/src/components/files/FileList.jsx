import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import {
  InsertDriveFile,
  Folder,
  Image,
  Description,
  GridOn,
  Slideshow,
  Videocam,
  Audiotrack,
  MoreVert,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useFiles } from '../../contexts/FileContext';
import { useAuth } from '../../contexts/AuthContext';

const FileList = ({ items }) => {
  const { selectedItems, toggleSelection, downloadFile } = useFiles();
  const { user } = useAuth();

  const getFileIcon = (item) => {
    if (item.is_folder) {
      return <Folder sx={{ color: '#fbbc04' }} />;
    }

    switch (item.file_type) {
      case 'image':
        return <Image sx={{ color: '#fbbc04' }} />;
      case 'document':
        return <Description sx={{ color: '#4285f4' }} />;
      case 'spreadsheet':
        return <GridOn sx={{ color: '#0f9d58' }} />;
      case 'presentation':
        return <Slideshow sx={{ color: '#ea4335' }} />;
      case 'video':
        return <Videocam sx={{ color: '#ff5722' }} />;
      case 'audio':
        return <Audiotrack sx={{ color: '#ab47bc' }} />;
      default:
        return <InsertDriveFile sx={{ color: '#5f6368' }} />;
    }
  };

  const handleDownload = async (item) => {
    if (!item.is_folder) {
      await downloadFile(item.id, user.id, item.original_filename);
    }
  };

  return (
    <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedItems.size > 0 && selectedItems.size < items.length}
                checked={items.length > 0 && selectedItems.size === items.length}
                onChange={() => {
                  if (selectedItems.size === items.length) {
                    // Deselect all
                    items.forEach(item => {
                      if (selectedItems.has(item.id)) {
                        toggleSelection(item.id);
                      }
                    });
                  } else {
                    // Select all
                    items.forEach(item => {
                      if (!selectedItems.has(item.id)) {
                        toggleSelection(item.id);
                      }
                    });
                  }
                }}
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Modified</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              hover
              sx={{
                '&:hover': { backgroundColor: '#f5f5f5' },
                cursor: 'pointer',
              }}
              onClick={() => {
                if (item.is_folder) {
                  // Navigate to folder
                  console.log('Navigate to folder:', item.id);
                }
              }}
            >
              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onChange={() => toggleSelection(item.id)}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {getFileIcon(item)}
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {item.original_filename}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ color: '#5f6368' }}>
                  {item.is_folder ? '—' : item.size_readable}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ color: '#5f6368' }}>
                  {item.is_folder ? 'Folder' : item.file_type || 'File'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ color: '#5f6368' }}>
                  {format(new Date(item.updated_at), 'MMM d, yyyy HH:mm')}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {!item.is_folder && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item);
                      }}
                      title="Download"
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FileList;