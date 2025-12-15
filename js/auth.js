/**
 * ============================================
 * HRMS/ATS SYSTEM - AUTH MODULE
 * Google OAuth & Session Management
 * ============================================
 */

const Auth = (() => {
    // Private state
    let currentUser = null;
    let isInitialized = false;
    let googleAuth = null;

    /**
     * Initialize Google OAuth
     */
    const initGoogleAuth = () => {
        return new Promise((resolve, reject) => {
            // Load Google Identity Services
            if (typeof google === 'undefined') {
                // Load script dynamically if not loaded
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    setupGoogleAuth();
                    resolve();
                };
                script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
                document.head.appendChild(script);
            } else {
                setupGoogleAuth();
                resolve();
            }
        });
    };

    /**
     * Setup Google Auth configuration
     */
    const setupGoogleAuth = () => {
        google.accounts.id.initialize({
            client_id: CONFIG.AUTH.CLIENT_ID,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: true
        });

        isInitialized = true;
    };

    /**
     * Handle Google OAuth callback
     */
    const handleGoogleCallback = async (response) => {
        try {
            Utils.showLoader('Authenticating...');
            
            // Send token to backend for verification
            const result = await API.auth.login(response.credential);
            
            if (result.success) {
                // Store session data
                localStorage.setItem(CONFIG.AUTH.TOKEN_KEY, result.token);
                localStorage.setItem(CONFIG.AUTH.SESSION_KEY, JSON.stringify({
                    user: result.user,
                    expiresAt: Date.now() + CONFIG.AUTH.SESSION_DURATION
                }));
                
                currentUser = result.user;
                
                // Update state
                State.setUser(result.user);
                
                // Redirect to dashboard
                Utils.toast('Login successful! Welcome back.', 'success');
                Router.navigate('dashboard');
            } else {
                Utils.toast(result.error || 'Login failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Auth error:', error);
            Utils.toast('Authentication failed. Please try again.', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render Google Sign-In button
     */
    const renderGoogleButton = (containerId) => {
        if (!isInitialized) {
            console.error('Google Auth not initialized');
            return;
        }

        google.accounts.id.renderButton(
            document.getElementById(containerId),
            {
                theme: 'outline',
                size: 'large',
                type: 'standard',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: 280
            }
        );
    };

    /**
     * Show Google One Tap prompt
     */
    const showOneTap = () => {
        if (isInitialized) {
            google.accounts.id.prompt((notification) => {
                // FedCM-compatible: use getDismissedReason() instead of deprecated methods
                if (notification.getDismissedReason) {
                    const reason = notification.getDismissedReason();
                    if (reason) {
                        console.log('One Tap dismissed:', reason);
                    }
                }
            });
        }
    };

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = () => {
        const session = getSession();
        return session !== null && session.expiresAt > Date.now();
    };

    /**
     * Get current session
     */
    const getSession = () => {
        try {
            const sessionData = localStorage.getItem(CONFIG.AUTH.SESSION_KEY);
            if (!sessionData) return null;
            
            const session = JSON.parse(sessionData);
            
            // Check expiration
            if (session.expiresAt && session.expiresAt > Date.now()) {
                return session;
            }
            
            // Session expired, clear it
            clearSession();
            return null;
        } catch (error) {
            console.error('Error parsing session:', error);
            clearSession();
            return null;
        }
    };

    /**
     * Get current user
     */
    const getCurrentUser = () => {
        if (currentUser) return currentUser;
        
        const session = getSession();
        if (session && session.user) {
            currentUser = session.user;
            return currentUser;
        }
        
        return null;
    };

    /**
     * Get user role
     */
    const getUserRole = () => {
        const user = getCurrentUser();
        return user ? user.role : null;
    };

    /**
     * Check if user has permission
     */
    const hasPermission = (permission) => {
        const user = getCurrentUser();
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permission);
    };

    /**
     * Check if user has any of the given permissions
     */
    const hasAnyPermission = (permissions) => {
        return permissions.some(p => hasPermission(p));
    };

    /**
     * Check if user has all of the given permissions
     */
    const hasAllPermissions = (permissions) => {
        return permissions.every(p => hasPermission(p));
    };

    /**
     * Check if user has role
     */
    const hasRole = (role) => {
        const userRole = getUserRole();
        return userRole === role;
    };

    /**
     * Check if user has any of the given roles
     */
    const hasAnyRole = (roles) => {
        const userRole = getUserRole();
        return roles.includes(userRole);
    };

    /**
     * Validate token with backend
     */
    const validateToken = async () => {
        if (!isAuthenticated()) return false;
        
        try {
            const result = await API.auth.validateToken();
            
            if (!result.success) {
                clearSession();
                return false;
            }
            
            // Update user data if changed
            if (result.user) {
                currentUser = result.user;
                updateSession({ user: result.user });
                State.setUser(result.user);
            }
            
            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    };

    /**
     * Update session data
     */
    const updateSession = (updates) => {
        const session = getSession();
        if (session) {
            const updated = { ...session, ...updates };
            localStorage.setItem(CONFIG.AUTH.SESSION_KEY, JSON.stringify(updated));
        }
    };

    /**
     * Refresh session
     */
    const refreshSession = () => {
        const session = getSession();
        if (session) {
            session.expiresAt = Date.now() + CONFIG.AUTH.SESSION_DURATION;
            localStorage.setItem(CONFIG.AUTH.SESSION_KEY, JSON.stringify(session));
        }
    };

    /**
     * Clear session
     */
    const clearSession = () => {
        localStorage.removeItem(CONFIG.AUTH.TOKEN_KEY);
        localStorage.removeItem(CONFIG.AUTH.SESSION_KEY);
        currentUser = null;
    };

    /**
     * Logout
     */
    const logout = async () => {
        try {
            Utils.showLoader('Logging out...');
            
            // Notify backend
            await API.auth.logout();
            
            // Clear local session
            clearSession();
            
            // Clear state
            State.clear();
            
            // Revoke Google session
            if (isInitialized) {
                google.accounts.id.disableAutoSelect();
            }
            
            Utils.toast('Logged out successfully', 'success');
            
            // Redirect to login
            Router.navigate('login');
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if API fails
            clearSession();
            State.clear();
            Router.navigate('login');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Handle authentication errors from API
     */
    const handleAuthError = (response) => {
        if (response.code === 'TOKEN_EXPIRED' || response.code === 'AUTH_ERROR') {
            Utils.toast('Your session has expired. Please login again.', 'warning');
            clearSession();
            Router.navigate('login');
        }
    };

    /**
     * Guard route - check if user can access
     */
    const guardRoute = (requiredPermissions = [], requiredRoles = []) => {
        // Check authentication
        if (!isAuthenticated()) {
            Router.navigate('login');
            return false;
        }
        
        // Check roles if specified
        if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
            Utils.toast('You do not have access to this page.', 'error');
            Router.navigate('dashboard');
            return false;
        }
        
        // Check permissions if specified
        if (requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
            Utils.toast('You do not have permission to access this page.', 'error');
            Router.navigate('dashboard');
            return false;
        }
        
        return true;
    };

    /**
     * Login with Google OAuth
     */
    const login = async () => {
        if (!isInitialized) {
            await initGoogleAuth();
        }
        
        return new Promise((resolve, reject) => {
            // Trigger Google Sign-In with FedCM-compatible handling
            google.accounts.id.prompt((notification) => {
                // FedCM-compatible: use getDismissedReason() instead of deprecated methods
                if (notification.getDismissedReason) {
                    const reason = notification.getDismissedReason();
                    if (reason) {
                        reject(new Error(`Google Sign-In was dismissed: ${reason}`));
                    }
                }
            });
            
            // The actual authentication will be handled by handleGoogleCallback
            // which gets triggered automatically when user signs in
        });
    };

    /**
     * Handle OAuth redirect (for compatibility)
     */
    const handleOAuthRedirect = async () => {
        // Check URL parameters for OAuth response
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('code') || params.has('error')) {
            // Handle OAuth code/error if present
            if (params.has('error')) {
                throw new Error(params.get('error_description') || 'OAuth error');
            }
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        return Promise.resolve();
    };

    /**
     * Initialize auth module
     */
    const init = async () => {
        try {
            await initGoogleAuth();
            
            // Check for existing session
            if (isAuthenticated()) {
                const session = getSession();
                currentUser = session.user;
                State.setUser(currentUser);
                
                // Validate token in background
                validateToken();
            }
            
            return true;
        } catch (error) {
            console.error('Auth initialization error:', error);
            return false;
        }
    };

    // Public interface
    return {
        init,
        login,
        handleOAuthRedirect,
        renderGoogleButton,
        showOneTap,
        isAuthenticated,
        getCurrentUser,
        getUserRole,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        validateToken,
        refreshSession,
        logout,
        handleAuthError,
        guardRoute
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
