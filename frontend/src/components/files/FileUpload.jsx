import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Close,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { useFiles } from '../../contexts/FileContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const FileUpload = ({ onClose }) => {
  const { uploadFile, currentFolder } = useFiles();
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      status: 'pending', // pending, uploading, success, error
      progress: 0,
      error: null,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: uploading,
  });

  const handleUpload = async () => {
    if (!user?.id || files.length === 0) return;

    setUploading(true);
    const uploadPromises = files
      .filter(f => f.status === 'pending')
      .map(async (fileObj) => {
        try {
          // Update status to uploading
          setFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, status: 'uploading' } : f
          ));

          // Simulate progress (in real app, use axios progress event)
          const progressInterval = setInterval(() => {
            setProgress(prev => ({
              ...prev,
              [fileObj.id]: (prev[fileObj.id] || 0) + 10,
            }));
          }, 100);

          // Actual upload
          const result = await uploadFile(fileObj.file, user.id, currentFolder);
          
          clearInterval(progressInterval);
          setProgress(prev => ({ ...prev, [fileObj.id]: 100 }));

          if (result.success) {
            setFiles(prev => prev.map(f => 
              f.id === fileObj.id ? { ...f, status: 'success' } : f
            ));
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { 
              ...f, 
              status: 'error', 
              error: error.message 
            } : f
          ));
        }
      });

    await Promise.all(uploadPromises);
    setUploading(false);
    
    // Show summary
    const successful = files.filter(f => f.status === 'success').length;
    const failed = files.filter(f => f.status === 'error').length;
    
    if (successful > 0) {
      toast.success(`Successfully uploaded ${successful} file(s)`);
    }
    if (failed > 0) {
      toast.error(`Failed to upload ${failed} file(s)`);
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle sx={{ color: '#34a853' }} />;
      case 'error':
        return <Error sx={{ color: '#ea4335' }} />;
      case 'uploading':
        return <LinearProgress sx={{ width: 20 }} />;
      default:
        return <InsertDriveFile sx={{ color: '#5f6368' }} />;
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Upload Files</Typography>
        <IconButton onClick={onClose} disabled={uploading}>
          <Close />
        </IconButton>
      </Box>

      {/* Drop zone */}
      <Box
        {...getRootProps()}
        sx={{
          border: `2px dashed ${isDragActive ? '#4285f4' : '#dadce0'}`,
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          backgroundColor: isDragActive ? '#f0f7ff' : '#f8f9fa',
          cursor: uploading ? 'default' : 'pointer',
          mb: 3,
          transition: 'all 0.3s ease',
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: '#5f6368', mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#5f6368', mb: 2 }}>
          or click to browse
        </Typography>
        <Typography variant="caption" sx={{ color: '#9aa0a6' }}>
          Maximum file size: 5GB
        </Typography>
      </Box>

      {/* File list */}
      {files.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2">
              {files.length} file(s) selected
            </Typography>
            <Button 
              size="small" 
              onClick={clearAll}
              disabled={uploading}
            >
              Clear All
            </Button>
          </Box>
          
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {files.map((fileObj) => (
              <ListItem
                key={fileObj.id}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: '#fff',
                }}
                secondaryAction={
                  fileObj.status === 'pending' && (
                    <IconButton 
                      edge="end" 
                      onClick={() => removeFile(fileObj.id)}
                      disabled={uploading}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  )
                }
              >
                <ListItemIcon>
                  {getStatusIcon(fileObj.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {fileObj.name}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" sx={{ color: '#5f6368', display: 'block' }}>
                        {(fileObj.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                      {fileObj.status === 'uploading' && progress[fileObj.id] && (
                        <LinearProgress 
                          variant="determinate" 
                          value={progress[fileObj.id]} 
                          sx={{ mt: 0.5 }}
                        />
                      )}
                      {fileObj.error && (
                        <Typography variant="caption" sx={{ color: '#ea4335' }}>
                          {fileObj.error}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          startIcon={<CloudUpload />}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      </Box>
    </Paper>
  );
};

export default FileUpload;