import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api, { BASE_URL } from '../utils/api';
import locationTracker from '../utils/LocationTracker';
import { io } from 'socket.io-client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const getStoredAuth = () => {
  const sessionToken = sessionStorage.getItem('token');
  const sessionUser = sessionStorage.getItem('user');
  if (sessionToken && sessionUser) {
    try {
      return { token: sessionToken, user: JSON.parse(sessionUser) };
    } catch {}
  }
  const localToken = localStorage.getItem('token');
  const localUser = localStorage.getItem('user');
  if (localToken && localUser) {
    try {
      const parsed = JSON.parse(localUser);
      // Seed sessionStorage for this tab so it maintains its own independent session
      try {
        sessionStorage.setItem('token', localToken);
        sessionStorage.setItem('user', localUser);
      } catch {}
      return { token: localToken, user: parsed };
    } catch {}
  }
  return { token: null, user: null };
};

const safeSetUserStorage = (userData, token = null) => {
  try {
    const userStr = JSON.stringify(userData);
    sessionStorage.setItem('user', userStr);
    localStorage.setItem('user', userStr);
    if (token) {
      sessionStorage.setItem('token', token);
      localStorage.setItem('token', token);
    }
  } catch (quotaErr) {
    console.warn('[AuthContext] Storage quota warning, storing sanitized user:', quotaErr.message);
    try {
      const sanitized = {
        _id: userData._id || userData.id,
        id: userData._id || userData.id,
        fullName: userData.fullName || userData.name,
        name: userData.fullName || userData.name,
        email: userData.email,
        role: userData.role,
        companyId: userData.companyId,
        avatar: userData.avatar && userData.avatar.length < 500 ? userData.avatar : '',
        phone: userData.phone,
        address: userData.address,
        mustChangePassword: userData.mustChangePassword,
        permissions: userData.permissions || []
      };
      const sanitizedStr = JSON.stringify(sanitized);
      sessionStorage.setItem('user', sanitizedStr);
      localStorage.setItem('user', sanitizedStr);
      if (token) {
        sessionStorage.setItem('token', token);
        localStorage.setItem('token', token);
      }
    } catch (fallbackErr) {
      console.error('[AuthContext] Critical storage error:', fallbackErr);
    }
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef();

  const refreshPermissions = async (currentUser) => {
    try {
      const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
      const permRes = await api.get('/roles/my-permissions', {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
      });
      const updatedUser = {
        ...currentUser,
        permissions: permRes.data.permissions || []
      };
      setUser(updatedUser);
      safeSetUserStorage(updatedUser);
      console.log('Permissions refreshed real-time');
    } catch (error) {
      console.error('Failed to refresh permissions real-time:', error);
    }
  };

  // Track token to control socket lifecycle per tab
  const tokenRef = useRef(sessionStorage.getItem('token') || localStorage.getItem('token'));

  useEffect(() => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    tokenRef.current = token;

    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      return;
    }

    if (socketRef.current && socketRef.current.connected) {
      return;
    }
    if (socketRef.current) {
      return;
    }

    const socketUrl = BASE_URL;
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socketInstance.on('permissions_updated', (data) => {
      setUser(prev => {
        if (prev && prev.role === data.role) {
          refreshPermissions(prev);
        }
        return prev;
      });
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user ? 'logged-in' : 'logged-out']);

  useEffect(() => {
    // Check for stored token/user on load for this tab
    const initAuth = async () => {
      const { token, user: storedUser } = getStoredAuth();

      if (storedUser && token) {
        try {
          setUser(storedUser);
          setLoading(false);

          // Refresh permissions/verify token in background for THIS tab
          api.get('/roles/my-permissions', {
            headers: { Authorization: `Bearer ${token}` }
          }).then(permRes => {
            const updatedUser = {
              ...storedUser,
              permissions: permRes.data.permissions || []
            };
            setUser(updatedUser);
            safeSetUserStorage(updatedUser);
            locationTracker.init(updatedUser);
          }).catch(error => {
            console.error('Background permission refresh failed:', error);
            if (error.response?.status === 401) {
              console.log('[Auth] Token is invalid or expired. Performing logout cleanup.');
              logout();
            }
          });

        } catch (error) {
          console.error('Init Auth error:', error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      locationTracker.stopTracking();
    };
  }, []);

  // Web FCM registration and listener setup on user authentication
  useEffect(() => {
    if (user && user._id) {
      const registerFCM = async () => {
        try {
          const { registerWebFcmToken } = await import('../utils/webPushNotifications');
          await registerWebFcmToken();
        } catch (fcmErr) {
          console.log('[WebPush Register Error]', fcmErr.message);
        }
      };

      const timer = setTimeout(registerFCM, 2000);
      return () => clearTimeout(timer);
    }
  }, [user?._id]);

  useEffect(() => {
    if (user) {
      let unsubscribe = () => { };
      const setupListeners = async () => {
        try {
          const { setupWebNotificationListeners } = await import('../utils/webPushNotifications');
          unsubscribe = setupWebNotificationListeners((payload) => {
            console.log('[WebPush] Foreground notification payload:', payload);
            if (Notification.permission === 'granted') {
              new Notification(payload.notification?.title || payload.data?.title || 'New Message', {
                body: payload.notification?.body || payload.data?.body || '',
                icon: '/logo.webp'
              });
            }
          });
        } catch (err) {
          console.log('[WebPush Listeners Setup Error]', err.message);
        }
      };

      setupListeners();
      return () => unsubscribe();
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const userData = response.data;

      const permissions = userData.permissions || [];

      const userWithPerms = {
        ...userData,
        permissions
      };

      // Set token and user data in tab-isolated sessionStorage and fallback localStorage
      safeSetUserStorage(userWithPerms, userData.token);
      setUser(userWithPerms);

      // Start location tracking on login
      locationTracker.init(userWithPerms);

      return userWithPerms;
    } catch (error) {
      console.error('Login Error:', error.response?.data?.message || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { deactivateWebFcmToken } = await import('../utils/webPushNotifications');
      await deactivateWebFcmToken();
    } catch (fcmErr) {
      console.log('[WebPush Logout Error]', fcmErr.message);
    }

    setUser(null);
    try {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch {}
    locationTracker.stopTracking();
  };

  const updateUserData = (newData) => {
    const updatedUser = {
      ...user,
      ...newData,
      name: newData.fullName || newData.name || user?.name,
      fullName: newData.fullName || newData.name || user?.fullName,
      phone: newData.phoneNumber || newData.phone || user?.phone,
      phoneNumber: newData.phoneNumber || newData.phone || user?.phoneNumber,
    };
    setUser(updatedUser);
    safeSetUserStorage(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUserData, loading, socket }}>
      {children}
    </AuthContext.Provider>
  );
};
