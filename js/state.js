/**
 * ============================================
 * HRMS/ATS SYSTEM - STATE MODULE
 * Global Application State Management
 * ============================================
 */

const State = (() => {
    // Private state object
    let state = {
        user: null,
        role: null,
        permissions: [],
        currentPage: 'dashboard',
        sidebarCollapsed: false,
        theme: 'light',
        
        // Data caches
        requirements: [],
        candidates: [],
        interviews: [],
        jobPostings: [],
        
        // Filters
        filters: {
            requirements: {},
            candidates: {},
            interviews: {}
        },
        
        // Pagination
        pagination: {
            requirements: { page: 1, pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE, total: 0 },
            candidates: { page: 1, pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE, total: 0 },
            interviews: { page: 1, pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE, total: 0 }
        },
        
        // UI State
        modals: {
            open: null,
            data: null
        },
        
        // Loading states
        loading: {
            global: false,
            requirements: false,
            candidates: false,
            interviews: false
        },
        
        // Notifications
        notifications: [],
        unreadCount: 0
    };

    // Event listeners
    const listeners = new Map();

    /**
     * Subscribe to state changes
     */
    const subscribe = (key, callback) => {
        if (!listeners.has(key)) {
            listeners.set(key, new Set());
        }
        listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            listeners.get(key).delete(callback);
        };
    };

    /**
     * Notify listeners of state change
     */
    const notify = (key, value) => {
        if (listeners.has(key)) {
            listeners.get(key).forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error(`State listener error [${key}]:`, error);
                }
            });
        }
        
        // Also notify wildcard listeners
        if (listeners.has('*')) {
            listeners.get('*').forEach(callback => {
                try {
                    callback({ key, value });
                } catch (error) {
                    console.error('State wildcard listener error:', error);
                }
            });
        }
    };

    /**
     * Get state value
     */
    const get = (key) => {
        if (key) {
            return key.split('.').reduce((obj, k) => obj?.[k], state);
        }
        return { ...state };
    };

    /**
     * Set state value
     */
    const set = (key, value) => {
        const keys = key.split('.');
        let current = state;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        const oldValue = current[keys[keys.length - 1]];
        current[keys[keys.length - 1]] = value;
        
        // Persist certain state to localStorage
        persistState(key, value);
        
        // Notify listeners
        notify(key, value);
        
        return oldValue;
    };

    /**
     * Update state (merge)
     */
    const update = (key, updates) => {
        const current = get(key);
        if (typeof current === 'object' && !Array.isArray(current)) {
            set(key, { ...current, ...updates });
        } else {
            set(key, updates);
        }
    };

    /**
     * Reset state to initial
     */
    const reset = (key) => {
        if (key) {
            set(key, getInitialValue(key));
        } else {
            // Reset entire state
            state = getInitialState();
            notify('*', state);
        }
    };

    /**
     * Get initial state
     */
    const getInitialState = () => ({
        user: null,
        role: null,
        permissions: [],
        currentPage: 'dashboard',
        sidebarCollapsed: false,
        theme: 'light',
        requirements: [],
        candidates: [],
        interviews: [],
        jobPostings: [],
        filters: {
            requirements: {},
            candidates: {},
            interviews: {}
        },
        pagination: {
            requirements: { page: 1, pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE, total: 0 },
            candidates: { page: 1, pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE, total: 0 },
            interviews: { page: 1, pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE, total: 0 }
        },
        modals: {
            open: null,
            data: null
        },
        loading: {
            global: false,
            requirements: false,
            candidates: false,
            interviews: false
        },
        notifications: [],
        unreadCount: 0
    });

    /**
     * Get initial value for a key
     */
    const getInitialValue = (key) => {
        const initial = getInitialState();
        return key.split('.').reduce((obj, k) => obj?.[k], initial);
    };

    /**
     * Persist state to localStorage
     */
    const persistState = (key, value) => {
        const persistKeys = ['theme', 'sidebarCollapsed', 'filters'];
        
        if (persistKeys.some(k => key.startsWith(k))) {
            try {
                const persistedState = JSON.parse(localStorage.getItem('hrms_state') || '{}');
                const keys = key.split('.');
                let current = persistedState;
                
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!current[keys[i]]) {
                        current[keys[i]] = {};
                    }
                    current = current[keys[i]];
                }
                
                current[keys[keys.length - 1]] = value;
                localStorage.setItem('hrms_state', JSON.stringify(persistedState));
            } catch (error) {
                console.error('Error persisting state:', error);
            }
        }
    };

    /**
     * Load persisted state
     */
    const loadPersistedState = () => {
        try {
            const persistedState = JSON.parse(localStorage.getItem('hrms_state') || '{}');
            
            if (persistedState.theme) {
                state.theme = persistedState.theme;
            }
            if (persistedState.sidebarCollapsed !== undefined) {
                state.sidebarCollapsed = persistedState.sidebarCollapsed;
            }
            if (persistedState.filters) {
                state.filters = { ...state.filters, ...persistedState.filters };
            }
        } catch (error) {
            console.error('Error loading persisted state:', error);
        }
    };

    // ==========================================
    // CONVENIENCE METHODS
    // ==========================================

    /**
     * Set current user
     */
    const setUser = (user) => {
        set('user', user);
        set('role', user?.role || null);
        set('permissions', user?.permissions || []);
    };

    /**
     * Clear user data
     */
    const clearUser = () => {
        set('user', null);
        set('role', null);
        set('permissions', []);
    };

    /**
     * Set current page
     */
    const setCurrentPage = (page) => {
        set('currentPage', page);
    };

    /**
     * Toggle sidebar
     */
    const toggleSidebar = () => {
        set('sidebarCollapsed', !state.sidebarCollapsed);
    };

    /**
     * Set loading state
     */
    const setLoading = (key, isLoading) => {
        set(`loading.${key}`, isLoading);
    };

    /**
     * Check if loading
     */
    const isLoading = (key) => {
        return get(`loading.${key}`);
    };

    /**
     * Open modal
     */
    const openModal = (modalId, data = null) => {
        set('modals', { open: modalId, data });
    };

    /**
     * Close modal
     */
    const closeModal = () => {
        set('modals', { open: null, data: null });
    };

    /**
     * Get modal data
     */
    const getModalData = () => {
        return state.modals.data;
    };

    /**
     * Add notification
     */
    const addNotification = (notification) => {
        const notifications = [...state.notifications, {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            read: false,
            ...notification
        }];
        set('notifications', notifications);
        set('unreadCount', notifications.filter(n => !n.read).length);
    };

    /**
     * Mark notification as read
     */
    const markNotificationRead = (id) => {
        const notifications = state.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
        );
        set('notifications', notifications);
        set('unreadCount', notifications.filter(n => !n.read).length);
    };

    /**
     * Update filters
     */
    const setFilters = (module, filters) => {
        set(`filters.${module}`, filters);
    };

    /**
     * Get filters
     */
    const getFilters = (module) => {
        return get(`filters.${module}`) || {};
    };

    /**
     * Update pagination
     */
    const setPagination = (module, pagination) => {
        update(`pagination.${module}`, pagination);
    };

    /**
     * Get pagination
     */
    const getPagination = (module) => {
        return get(`pagination.${module}`) || { page: 1, pageSize: 10, total: 0 };
    };

    /**
     * Set data cache
     */
    const setData = (module, data) => {
        set(module, data);
    };

    /**
     * Get data cache
     */
    const getData = (module) => {
        return get(module) || [];
    };

    /**
     * Clear all state
     */
    const clear = () => {
        const newState = getInitialState();
        Object.keys(newState).forEach(key => {
            state[key] = newState[key];
        });
        localStorage.removeItem('hrms_state');
        sessionStorage.removeItem('hrms_state');
        // Also clear any auth/session keys if they were stored in sessionStorage
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG.AUTH) {
                sessionStorage.removeItem(CONFIG.AUTH.TOKEN_KEY);
                sessionStorage.removeItem(CONFIG.AUTH.SESSION_KEY);
            }
        } catch (e) {
            // ignore
        }
        notify('*', state);
    };

    /**
     * Initialize state
     */
    const init = () => {
        loadPersistedState();
    };

    // Initialize on load
    init();

    // Public interface
    return {
        get,
        set,
        update,
        reset,
        subscribe,
        setUser,
        clearUser,
        setCurrentPage,
        toggleSidebar,
        setLoading,
        isLoading,
        openModal,
        closeModal,
        getModalData,
        addNotification,
        markNotificationRead,
        setFilters,
        getFilters,
        setPagination,
        getPagination,
        setData,
        getData,
        clear
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = State;
}
