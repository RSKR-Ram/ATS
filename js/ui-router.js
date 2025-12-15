/**
 * ============================================
 * HRMS/ATS SYSTEM - ROUTER MODULE
 * SPA Navigation & Page Management
 * ============================================
 */

const Router = (() => {
    // Route definitions
    const routes = {
        'login': {
            title: 'Login',
            template: 'login-page',
            requiresAuth: false,
            init: () => initLoginPage()
        },
        'dashboard': {
            title: 'Dashboard',
            template: 'dashboard-page',
            requiresAuth: true,
            init: () => DashboardModule.init()
        },
        'requirements': {
            title: 'Requirements',
            template: 'requirements-page',
            requiresAuth: true,
            permissions: ['REQUIREMENT_CREATE', 'REQUIREMENT_APPROVE'],
            init: () => RequirementsModule.init()
        },
        'requirements/new': {
            title: 'Create Requirement',
            template: 'requirement-form-page',
            requiresAuth: true,
            permissions: ['REQUIREMENT_CREATE'],
            init: () => RequirementsModule.initForm()
        },
        'requirements/:id': {
            title: 'Requirement Details',
            template: 'requirement-detail-page',
            requiresAuth: true,
            init: (params) => RequirementsModule.initDetail(params.id)
        },
        'job-postings': {
            title: 'Job Postings',
            template: 'job-postings-page',
            requiresAuth: true,
            permissions: ['JOB_POSTING_VIEW'],
            init: () => JobPostingsModule.init()
        },
        'candidates': {
            title: 'Candidates',
            template: 'candidates-page',
            requiresAuth: true,
            permissions: ['CANDIDATE_VIEW'],
            init: () => CandidatesModule.init()
        },
        'candidates/add': {
            title: 'Add Candidate',
            template: 'candidate-form-page',
            requiresAuth: true,
            permissions: ['CANDIDATE_ADD'],
            init: () => CandidatesModule.initAddForm()
        },
        'candidates/:id': {
            title: 'Candidate Profile',
            template: 'candidate-detail-page',
            requiresAuth: true,
            init: (params) => CandidatesModule.initDetail(params.id)
        },
        'call-screening': {
            title: 'Call Screening',
            template: 'call-screening-page',
            requiresAuth: true,
            permissions: ['CALL_SCREENING'],
            init: () => CallsModule.init()
        },
        'interviews': {
            title: 'Interviews',
            template: 'interviews-page',
            requiresAuth: true,
            permissions: ['INTERVIEW_SCHEDULE'],
            init: () => InterviewsModule.init()
        },
        'interviews/today': {
            title: "Today's Interviews",
            template: 'interviews-today-page',
            requiresAuth: true,
            init: () => InterviewsModule.initToday()
        },
        'tests': {
            title: 'Test Management',
            template: 'tests-page',
            requiresAuth: true,
            permissions: ['TEST_VIEW_RESULTS'],
            init: () => TestsModule.init()
        },
        'test/:token': {
            title: 'Online Test',
            template: 'test-take-page',
            requiresAuth: false, // Public test link
            init: (params) => TestsModule.initTestPage(params.token)
        },
        'admin': {
            title: 'Admin Panel',
            template: 'admin-page',
            requiresAuth: true,
            roles: ['ADMIN'],
            init: () => AdminModule.init()
        },
        'admin/pending': {
            title: 'Pending Reviews',
            template: 'admin-pending-page',
            requiresAuth: true,
            roles: ['ADMIN', 'OWNER'],
            init: () => AdminModule.initPending()
        },
        'admin/audit-log': {
            title: 'Audit Log',
            template: 'audit-log-page',
            requiresAuth: true,
            permissions: ['VIEW_AUDIT_LOG'],
            init: () => AdminModule.initAuditLog()
        },
        'admin/rejection-log': {
            title: 'Rejection Log',
            template: 'rejection-log-page',
            requiresAuth: true,
            permissions: ['VIEW_REJECTION_LOG'],
            init: () => AdminModule.initRejectionLog()
        },
        'onboarding': {
            title: 'Onboarding',
            template: 'onboarding-page',
            requiresAuth: true,
            permissions: ['ONBOARDING_MANAGE'],
            init: () => OnboardingModule.init()
        },
        'onboarding/:id': {
            title: 'Onboarding Process',
            template: 'onboarding-detail-page',
            requiresAuth: true,
            init: (params) => OnboardingModule.initDetail(params.id)
        },
        'settings': {
            title: 'Settings',
            template: 'settings-page',
            requiresAuth: true,
            roles: ['ADMIN'],
            init: () => SettingsModule.init()
        },
        '404': {
            title: 'Page Not Found',
            template: '404-page',
            requiresAuth: false,
            init: () => {}
        }
    };

    // Current route state
    let currentRoute = null;
    let routeHistory = [];

    /**
     * Parse URL path
     */
    const parsePath = () => {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const [path, queryString] = hash.split('?');
        const query = new URLSearchParams(queryString || '');
        
        return { path, query };
    };

    /**
     * Match route pattern
     */
    const matchRoute = (path) => {
        // Check for exact match first
        if (routes[path]) {
            return { route: routes[path], params: {} };
        }
        
        // Check for parameterized routes
        for (const [pattern, route] of Object.entries(routes)) {
            const patternParts = pattern.split('/');
            const pathParts = path.split('/');
            
            if (patternParts.length !== pathParts.length) continue;
            
            const params = {};
            let match = true;
            
            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    params[patternParts[i].slice(1)] = pathParts[i];
                } else if (patternParts[i] !== pathParts[i]) {
                    match = false;
                    break;
                }
            }
            
            if (match) {
                return { route, params };
            }
        }
        
        // Return 404 route
        return { route: routes['404'], params: {} };
    };

    /**
     * Navigate to route
     */
    const navigate = (path, options = {}) => {
        const { replace = false, query = {} } = options;
        
        let url = `#${path}`;
        
        // Add query parameters
        const queryString = new URLSearchParams(query).toString();
        if (queryString) {
            url += `?${queryString}`;
        }
        
        if (replace) {
            window.history.replaceState(null, '', url);
        } else {
            window.history.pushState(null, '', url);
        }
        
        handleRouteChange();
    };

    /**
     * Go back in history
     */
    const back = () => {
        window.history.back();
    };

    /**
     * Go forward in history
     */
    const forward = () => {
        window.history.forward();
    };

    /**
     * Handle route change
     */
    const handleRouteChange = async () => {
        const { path, query } = parsePath();
        const { route, params } = matchRoute(path);
        
        console.log(`Navigating to: ${path}`, { params, query: Object.fromEntries(query) });
        
        // Check authentication
        if (route.requiresAuth && !Auth.isAuthenticated()) {
            navigate('login', { replace: true });
            return;
        }
        
        // Check roles
        if (route.roles && !Auth.hasAnyRole(route.roles)) {
            Utils.toast('You do not have access to this page.', 'error');
            navigate('dashboard', { replace: true });
            return;
        }
        
        // Check permissions
        if (route.permissions && !Auth.hasAnyPermission(route.permissions)) {
            Utils.toast('You do not have permission to access this page.', 'error');
            navigate('dashboard', { replace: true });
            return;
        }
        
        // Update state
        State.setCurrentPage(path);
        currentRoute = { path, route, params, query };
        
        // Update page title
        document.title = `${route.title} | HRMS`;
        
        // Show page content
        showPage(route.template);
        
        // Update active nav item
        updateNavigation(path);
        
        // Initialize page
        if (route.init) {
            try {
                await route.init(params);
            } catch (error) {
                console.error('Page initialization error:', error);
                Utils.toast('Error loading page. Please try again.', 'error');
            }
        }
        
        // Track in history
        routeHistory.push({ path, timestamp: Date.now() });
        if (routeHistory.length > 50) {
            routeHistory.shift();
        }
    };

    /**
     * Show page template
     */
    const showPage = (templateId) => {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });
        
        // Show target page
        const targetPage = document.getElementById(templateId);
        if (targetPage) {
            targetPage.style.display = 'block';
            targetPage.classList.add('active');
            
            // Scroll to top
            window.scrollTo(0, 0);
        }
    };

    /**
     * Update navigation active state
     */
    const updateNavigation = (currentPath) => {
        // Remove all active states
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Find and activate current nav item
        const basePath = currentPath.split('/')[0];
        const activeLink = document.querySelector(`.nav-link[data-route="${basePath}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    };

    /**
     * Get current route
     */
    const getCurrentRoute = () => currentRoute;

    /**
     * Get query parameter
     */
    const getQueryParam = (key) => {
        if (currentRoute && currentRoute.query) {
            return currentRoute.query.get(key);
        }
        return null;
    };

    /**
     * Set query parameter
     */
    const setQueryParam = (key, value) => {
        const { path, query } = parsePath();
        query.set(key, value);
        navigate(path, { replace: true, query: Object.fromEntries(query) });
    };

    /**
     * Initialize login page
     */
    const initLoginPage = () => {
        // Render Google Sign-In button
        setTimeout(() => {
            Auth.renderGoogleButton('google-signin-btn');
        }, 100);
    };

    /**
     * Initialize router
     */
    const init = () => {
        // Listen for hash changes
        window.addEventListener('hashchange', handleRouteChange);
        
        // Listen for popstate (browser back/forward)
        window.addEventListener('popstate', handleRouteChange);
        
        // Handle initial route
        handleRouteChange();
        
        // Setup navigation click handlers
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.dataset.route;
                navigate(route);
            }
        });
    };

    // Public interface
    return {
        init,
        navigate,
        back,
        forward,
        getCurrentRoute,
        getQueryParam,
        setQueryParam
    };
})();

// Backward-compatible alias for pages/modules that use `UIRouter.*`
// Note: top-level `const` is still globally accessible across non-module scripts.
const UIRouter = {
    init: (...args) => Router.init(...args),
    navigate: (...args) => Router.navigate(...args),
    back: (...args) => Router.back(...args),
    forward: (...args) => Router.forward(...args),
    getCurrentRoute: (...args) => Router.getCurrentRoute(...args),
    getQueryParam: (...args) => Router.getQueryParam(...args),
    setQueryParam: (...args) => Router.setQueryParam(...args),
    navigateTo: (url) => {
        window.location.href = url;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
