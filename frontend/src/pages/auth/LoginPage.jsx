import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  LinearProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Email,
  VpnKey,
  ArrowBack,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, sendOTP, login } = useAuth();
  const [step, setStep] = useState(1); // 1: email, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/drive');
    }
  }, [isAuthenticated, loading, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendOTP = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    const result = await sendOTP(email);
    
    if (result.success) {
      setOtpSent(true);
      setStep(2);
      setCountdown(600); // 10 minutes in seconds
      toast.success('OTP sent successfully!');
    } else {
      setError(result.error);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    const result = await sendOTP(email);
    if (result.success) {
      setCountdown(600);
      toast.success('New OTP sent!');
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setError('');
    const result = await login(email, otpString);
    
    if (result.success) {
      toast.success('Login successful!');
      navigate('/drive');
    } else {
      setError(result.error);
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#4285f4', mb: 1 }}>
            Cloud Drive
          </Typography>
          <Typography variant="body1" sx={{ color: '#5f6368' }}>
            Secure cloud storage with OTP authentication
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {step === 1 ? (
          <>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendOTP()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: '#5f6368' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
              placeholder="Enter your email address"
            />
            
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSendOTP}
              disabled={!email}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              Send OTP
            </Button>
          </>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ mb: 1, color: '#5f6368' }}>
                Enter the 6-digit OTP sent to:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {email}
              </Typography>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => setStep(1)}
                sx={{ mt: 1 }}
              >
                Change email
              </Button>
            </Box>

            {/* OTP Input */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
              {otp.map((digit, index) => (
                <TextField
                  key={index}
                  id={`otp-${index}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  inputProps={{
                    maxLength: 1,
                    style: {
                      textAlign: 'center',
                      fontSize: '1.5rem',
                      padding: '12px',
                    },
                  }}
                  sx={{
                    width: 50,
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#dadce0',
                      },
                      '&:hover fieldset': {
                        borderColor: '#4285f4',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#4285f4',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              ))}
            </Box>

            {/* Countdown and Resend */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              {countdown > 0 ? (
                <Typography variant="body2" sx={{ color: '#5f6368' }}>
                  OTP expires in: {formatTime(countdown)}
                </Typography>
              ) : (
                <Button
                  startIcon={<Refresh />}
                  onClick={handleResendOTP}
                  disabled={countdown > 0}
                >
                  Resend OTP
                </Button>
              )}
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleVerifyOTP}
              disabled={otp.join('').length !== 6}
              startIcon={<VpnKey />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              Verify & Login
            </Button>
          </>
        )}

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#9aa0a6' }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;