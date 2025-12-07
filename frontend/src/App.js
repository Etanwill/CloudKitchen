import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FileProvider } from './contexts/FileContext';
import PrivateRoute from './components/auth/PrivateRoute';
import LoginPage from './pages/auth/LoginPage';
import DrivePage from './pages/DrivePage';
import RecentPage from './pages/RecentPage';
import TrashPage from './pages/TrashPage';

function App() {
  return (
    <AuthProvider>
      <FileProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/drive" element={
            <PrivateRoute>
              <DrivePage />
            </PrivateRoute>
          } />
          
          <Route path="/recent" element={
            <PrivateRoute>
              <RecentPage />
            </PrivateRoute>
          } />
          
          <Route path="/trash" element={
            <PrivateRoute>
              <TrashPage />
            </PrivateRoute>
          } />
          
          <Route path="/" element={<Navigate to="/drive" />} />
          <Route path="*" element={<Navigate to="/drive" />} />
        </Routes>
      </FileProvider>
    </AuthProvider>
  );
}

export default App;