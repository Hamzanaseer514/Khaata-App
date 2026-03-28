import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import config from '../config/config';

interface VisitingCardData {
  cardData: {
    name: string;
    title: string;
    phone: string;
    email: string;
    address: string;
    company: string;
    website: string;
  };
  templateId: string;
  customDesign?: {
    bgColor: string;
    accentColor: string;
    textColor: string;
    subtextColor: string;
    layout: string;
    circleStyle: string;
    showLogo: boolean;
  };
  isCustom: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string | null;
  visitingCard?: VisitingCardData | null;
  createdAt: string;
  role?: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: User | null; token?: string | null }>;
  requestSignupOtp: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  verifySignupOtp: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  resendSignupOtp?: (email: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string, confirmNewPassword: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('authToken');
      const storedUser = await SecureStore.getItemAsync('userData');

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const normalizedUser = { ...parsedUser, role: parsedUser.role || 'user' };
        setToken(storedToken);
        setUser(normalizedUser);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log(config.BASE_URL)
      const response = await fetch(`${config.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const { user: userData, token: authToken } = data.data;
        const normalizedUser = { ...userData, role: userData.role || 'user' };

        // Store in SecureStore
        await SecureStore.setItemAsync('authToken', authToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(normalizedUser));

        // Update state
        setToken(authToken);
        setUser(normalizedUser);

        return { success: true, message: data.message, user: normalizedUser, token: authToken };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const register = async (name: string, email: string, password: string, confirmPassword: string) => {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await response.json();

      if (data.success) {
        const { user: userData, token: authToken } = data.data;
        const normalizedUser = { ...userData, role: userData.role || 'user' };

        // Store in SecureStore
        await SecureStore.setItemAsync('authToken', authToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(normalizedUser));

        // Update state
        setToken(authToken);
        setUser(normalizedUser);

        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const requestSignupOtp = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (data.success) return { success: true, message: data.message };
      return { success: false, message: data.message };
    } catch (e) {
      console.error('requestSignupOtp error:', e);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const verifySignupOtp = async (email: string, otp: string) => {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (data.success) {
        const { user: userData, token: authToken } = data.data;
        const normalizedUser = { ...userData, role: userData.role || 'user' };
        await SecureStore.setItemAsync('authToken', authToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(normalizedUser));
        setToken(authToken);
        setUser(normalizedUser);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (e) {
      console.error('verifySignupOtp error:', e);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const resendSignupOtp = async (email: string) => {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.success) return { success: true, message: data.message };
      return { success: false, message: data.message };
    } catch (e) {
      console.error('resendSignupOtp error:', e);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (e) {
      console.error('forgotPassword error:', e);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    try {
      const response = await fetch(`${config.BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (e) {
      console.error('resetPassword error:', e);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmNewPassword: string) => {
    try {
      if (!token) {
        return { success: false, message: 'No authentication token found' };
      }

      const response = await fetch(`${config.BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, requestSignupOtp, verifySignupOtp, resendSignupOtp, register, changePassword, forgotPassword, resetPassword, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
