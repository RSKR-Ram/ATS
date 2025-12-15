/**
 * ============================================
 * HRMS/ATS SYSTEM - API MODULE
 * Fetch wrapper for backend communication
 * ============================================
 */

const API = (() => {
    // Private variables
    let baseUrl = CONFIG.API.BASE_URL;
    let requestQueue = [];
    let isProcessing = false;

    /**
     * Get authentication token from session
     */
    const getToken = () => {
        return localStorage.getItem(CONFIG.AUTH.TOKEN_KEY) || null;
    };

    /**
     * Build request payload
     */
    const buildPayload = (action, data = {}) => {
        return {
            action: action,
            token: getToken(),
            data: data,
            timestamp: new Date().toISOString()
        };
    };

    /**
     * Handle API errors
     */
    const handleError = (error, action) => {
        console.error(`API Error [${action}]:`, error);
        
        // Check for specific error types
        if (error.name === 'AbortError') {
            return { success: false, error: 'Request timed out', code: 'TIMEOUT' };
        }
        
        if (error.message === 'Failed to fetch') {
            return { success: false, error: 'Network error. Please check your connection.', code: 'NETWORK_ERROR' };
        }
        
        return { success: false, error: error.message || 'Unknown error occurred', code: 'UNKNOWN_ERROR' };
    };

    /**
     * Main request function with retry logic
     */
    const request = async (action, data = {}, options = {}) => {
        const { 
            retryAttempts = CONFIG.API.RETRY_ATTEMPTS,
            timeout = CONFIG.API.TIMEOUT,
            showLoader = true
        } = options;

        // Show loading state
        if (showLoader) {
            Utils.showLoader();
        }

        let lastError;
        
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const payload = buildPayload(action, data);
                
                console.log(`API Request [${action}] Attempt ${attempt}:`, payload);

                const response = await fetch(baseUrl, {
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Check if response is ok
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                console.log(`API Response [${action}]:`, result);

                // Hide loading state
                if (showLoader) {
                    Utils.hideLoader();
                }

                // Check for authentication errors
                if (result.code === 'AUTH_ERROR' || result.code === 'TOKEN_EXPIRED') {
                    Auth.handleAuthError(result);
                    return result;
                }

                return result;

            } catch (error) {
                lastError = error;
                console.warn(`API Request failed (attempt ${attempt}/${retryAttempts}):`, error.message);
                
                // Wait before retrying
                if (attempt < retryAttempts) {
                    await Utils.sleep(CONFIG.API.RETRY_DELAY * attempt);
                }
            }
        }

        // Hide loading state
        if (showLoader) {
            Utils.hideLoader();
        }

        return handleError(lastError, action);
    };

    /**
     * Queue request for batch processing
     */
    const queueRequest = (action, data, callback) => {
        requestQueue.push({ action, data, callback });
        
        if (!isProcessing) {
            processQueue();
        }
    };

    /**
     * Process queued requests
     */
    const processQueue = async () => {
        if (requestQueue.length === 0) {
            isProcessing = false;
            return;
        }

        isProcessing = true;
        const { action, data, callback } = requestQueue.shift();
        
        const result = await request(action, data);
        
        if (callback && typeof callback === 'function') {
            callback(result);
        }

        // Process next in queue
        setTimeout(processQueue, 100);
    };

    // ==========================================
    // PUBLIC API METHODS
    // ==========================================

    // Auth Actions
    const auth = {
        login: (token) => request('AUTH_LOGIN', { token }),
        logout: () => request('AUTH_LOGOUT'),
        validateToken: () => request('AUTH_VALIDATE'),
        getUserPermissions: () => request('GET_USER_PERMISSIONS')
    };

    // Requirement Actions
    const requirements = {
        getAll: (filters = {}) => request('GET_REQUIREMENTS', filters),
        getById: (id) => request('GET_REQUIREMENT', { requirementId: id }),
        create: (data) => request('RAISE_REQUIREMENT', data),
        update: (id, data) => request('UPDATE_REQUIREMENT', { requirementId: id, ...data }),
        approve: (id, remark = '') => request('APPROVE_REQUIREMENT', { requirementId: id, remark }),
        sendBack: (id, remark) => request('SEND_BACK_REQUIREMENT', { requirementId: id, remark }),
        close: (id, reason) => request('CLOSE_REQUIREMENT', { requirementId: id, reason })
    };

    // Job Template Actions
    const templates = {
        getAll: () => request('GET_JOB_TEMPLATES'),
        getById: (id) => request('GET_JOB_TEMPLATE', { templateId: id }),
        create: (data) => request('CREATE_JOB_TEMPLATE', data),
        update: (id, data) => request('UPDATE_JOB_TEMPLATE', { templateId: id, ...data })
    };

    // Job Posting Actions
    const jobPostings = {
        getAll: (filters = {}) => request('GET_JOB_POSTINGS', filters),
        getById: (id) => request('GET_JOB_POSTING', { postingId: id }),
        create: (requirementId, data) => request('CREATE_JOB_POSTING', { requirementId, ...data }),
        update: (id, data) => request('UPDATE_JOB_POSTING', { postingId: id, ...data }),
        markPosted: (id, portal, screenshot) => request('MARK_JOB_POSTED', { postingId: id, portal, screenshot }),
        getJD: (id) => request('GET_JOB_DESCRIPTION', { postingId: id })
    };

    // Candidate Actions
    const candidates = {
        getAll: (filters = {}) => request('GET_CANDIDATES', filters),
        getById: (id) => request('GET_CANDIDATE', { candidateId: id }),
        add: (data) => request('ADD_CANDIDATE', data),
        bulkAdd: (candidates) => request('BULK_ADD_CANDIDATES', { candidates }),
        update: (id, data) => request('UPDATE_CANDIDATE', { candidateId: id, ...data }),
        shortlist: (id, decision, remark = '') => request('SHORTLIST_DECISION', { candidateId: id, decision, remark }),
        getHistory: (id) => request('GET_CANDIDATE_HISTORY', { candidateId: id }),
        getWaitlist: (jobRole) => request('GET_WAITLIST', { jobRole })
    };

    // Call Screening Actions
    const calls = {
        log: (candidateId, status, data = {}) => request('CALL_SCREENING', { candidateId, status, ...data }),
        getLogs: (candidateId) => request('GET_CALL_LOGS', { candidateId }),
        getAllLogs: (filters = {}) => request('GET_ALL_CALL_LOGS', filters)
    };

    // Interview Actions
    const interviews = {
        getAll: (filters = {}) => request('GET_INTERVIEWS', filters),
        schedule: (candidateId, data) => request('SCHEDULE_INTERVIEW', { candidateId, ...data }),
        reschedule: (interviewId, data) => request('RESCHEDULE_INTERVIEW', { interviewId, ...data }),
        markAttendance: (interviewId, appeared) => request('MARK_INTERVIEW_ATTENDANCE', { interviewId, appeared }),
        submitPreFeedback: (candidateId, data) => request('PRE_INTERVIEW_FEEDBACK', { candidateId, ...data }),
        submitFinalFeedback: (interviewId, data) => request('SUBMIT_INTERVIEW_FEEDBACK', { interviewId, ...data }),
        ownerDecision: (candidateId, decision, remark = '') => request('OWNER_INTERVIEW_DECISION', { candidateId, decision, remark })
    };

    // Test Actions
    const tests = {
        generateLink: (candidateId) => request('GENERATE_TEST_LINK', { candidateId }),
        getQuestions: (testToken) => request('GET_TEST_QUESTIONS', { testToken }, { timeout: 60000 }),
        submitAnswer: (testToken, questionId, answer) => request('SUBMIT_TEST_ANSWER', { testToken, questionId, answer }),
        submitTest: (testToken) => request('SUBMIT_TEST', { testToken }),
        getResults: (candidateId) => request('GET_TEST_RESULTS', { candidateId }),
        editMarks: (candidateId, testType, newMarks, reason) => request('EDIT_TEST_MARKS', { candidateId, testType, newMarks, reason })
    };

    // Admin Actions
    const admin = {
        getPendingReview: () => request('GET_ADMIN_PENDING_REVIEW'),
        decision: (candidateId, decision, remark = '') => request('ADMIN_DECISION', { candidateId, decision, remark }),
        editMarks: (candidateId, type, data, reason) => request('ADMIN_EDIT_MARKS', { candidateId, type, ...data, reason }),
        revert: (candidateId, toStage, reason) => request('ADMIN_REVERT', { candidateId, toStage, reason }),
        getAuditLog: (filters = {}) => request('GET_AUDIT_LOG', filters),
        getRejectionLog: (filters = {}) => request('GET_REJECTION_LOG', filters),
        revertRejection: (rejectionId, reason) => request('REVERT_REJECTION', { rejectionId, reason }),
        getSystemStats: () => request('GET_SYSTEM_STATS'),
        updateSettings: (settings) => request('UPDATE_SETTINGS', settings)
    };

    // Final Interview & Selection Actions
    const finalInterview = {
        schedule: (candidateId, data) => request('SCHEDULE_FINAL_INTERVIEW', { candidateId, ...data }),
        ownerDecision: (candidateId, decision, remark = '') => request('FINAL_INTERVIEW_DECISION', { candidateId, decision, remark })
    };

    // Onboarding Actions
    const onboarding = {
        initiate: (candidateId) => request('INITIATE_ONBOARDING', { candidateId }),
        uploadDocument: (candidateId, docType, fileData) => request('UPLOAD_DOCUMENT', { candidateId, docType, fileData }),
        verifyDocument: (candidateId, docType, verified, remark = '') => request('VERIFY_DOCUMENT', { candidateId, docType, verified, remark }),
        setJoiningDate: (candidateId, joiningDate) => request('SET_JOINING_DATE', { candidateId, joiningDate }),
        confirmJoining: (candidateId) => request('CONFIRM_JOINING', { candidateId }),
        getOnboardingStatus: (candidateId) => request('GET_ONBOARDING_STATUS', { candidateId }),
        getProbationList: () => request('GET_PROBATION_LIST')
    };

    // User Management Actions
    const users = {
        getAll: () => request('GET_USERS'),
        create: (data) => request('CREATE_USER', data),
        update: (userId, data) => request('UPDATE_USER', { userId, ...data }),
        updatePermissions: (userId, permissions) => request('UPDATE_USER_PERMISSIONS', { userId, permissions }),
        deactivate: (userId) => request('DEACTIVATE_USER', { userId })
    };

    // Dashboard Actions
    const dashboard = {
        getStats: () => request('GET_DASHBOARD_STATS'),
        getRecentActivity: (limit = 10) => request('GET_RECENT_ACTIVITY', { limit }),
        getPendingActions: () => request('GET_PENDING_ACTIONS'),
        getChartData: (chartType, dateRange) => request('GET_CHART_DATA', { chartType, dateRange })
    };

    // Set base URL (for initialization)
    const setBaseUrl = (url) => {
        baseUrl = url;
    };

    // Public interface
    return {
        request,
        queueRequest,
        setBaseUrl,
        auth,
        requirements,
        templates,
        jobPostings,
        candidates,
        calls,
        interviews,
        tests,
        admin,
        finalInterview,
        onboarding,
        users,
        dashboard
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
