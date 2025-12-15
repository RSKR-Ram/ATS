/**
 * ============================================
 * HRMS/ATS SYSTEM - API MODULE
 * HTTP Client for Backend Communication
 * ============================================
 */

const API = (() => {
    /**
     * Core request function to communicate with Google Apps Script backend
     */
    const request = async (action, data = {}) => {
        const token = localStorage.getItem(CONFIG.AUTH.TOKEN_KEY);
        
        const payload = {
            action,
            token,
            data,
            timestamp: new Date().toISOString()
        };

        let lastError;
        
        for (let attempt = 1; attempt <= CONFIG.API.RETRY_ATTEMPTS; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);

                const response = await fetch(CONFIG.API.BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const responseText = await response.text();
                let result;
                try {
                    result = responseText ? JSON.parse(responseText) : null;
                } catch (parseError) {
                    throw new Error('Invalid JSON response from server');
                }

                if (!result || typeof result !== 'object') {
                    throw new Error('Empty or invalid response from server');
                }

                // Handle auth errors
                if (result.code === 'AUTH_ERROR') {
                    Auth.handleAuthError(result);
                    throw new Error(result.error || 'Authentication failed');
                }

                return result;

            } catch (error) {
                lastError = error;
                
                if (error.name === 'AbortError') {
                    console.warn(`Request timeout (attempt ${attempt}/${CONFIG.API.RETRY_ATTEMPTS})`);
                } else {
                    console.warn(`Request failed (attempt ${attempt}/${CONFIG.API.RETRY_ATTEMPTS}):`, error.message);
                }

                if (attempt < CONFIG.API.RETRY_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, CONFIG.API.RETRY_DELAY * attempt));
                }
            }
        }

        throw lastError;
    };

    // ==================== AUTH API ====================
    const auth = {
        login: async (credential) => {
            return request('AUTH_LOGIN', { token: credential });
        },

        validate: async () => {
            return request('AUTH_VALIDATE');
        },

        logout: async () => {
            return request('AUTH_LOGOUT');
        },

        getUserPermissions: async () => {
            return request('GET_USER_PERMISSIONS');
        },

        getUserData: async () => {
            return request('GET_USER_DATA');
        },

        refreshToken: async () => {
            return request('REFRESH_TOKEN');
        }
    };

    // ==================== DASHBOARD API ====================
    const dashboard = {
        getStats: async () => {
            return request('GET_DASHBOARD_STATS');
        },

        getRecentActivity: async (limit = 10) => {
            return request('GET_RECENT_ACTIVITY', { limit });
        },

        getPendingActions: async () => {
            return request('GET_PENDING_ACTIONS');
        }
    };

    // ==================== REQUIREMENTS API ====================
    const requirements = {
        getAll: async (filters = {}) => {
            return request('GET_REQUIREMENTS', filters);
        },

        getById: async (id) => {
            return request('GET_REQUIREMENT_DETAIL', { id });
        },

        create: async (data) => {
            return request('RAISE_REQUIREMENT', data);
        },

        update: async (id, data) => {
            return request('UPDATE_REQUIREMENT', { id, ...data });
        },

        approve: async (id) => {
            return request('APPROVE_REQUIREMENT', { id });
        },

        sendBack: async (id, remark) => {
            return request('SEND_BACK_REQUIREMENT', { id, remark });
        }
    };

    // ==================== TEMPLATES API ====================
    const templates = {
        getAll: async () => {
            return request('GET_JOB_TEMPLATES');
        },

        getById: async (id) => {
            return request('GET_JOB_TEMPLATE', { id });
        },

        create: async (data) => {
            return request('CREATE_JOB_TEMPLATE', data);
        },

        update: async (id, data) => {
            return request('UPDATE_JOB_TEMPLATE', { id, ...data });
        }
    };

    // ==================== JOB POSTINGS API ====================
    const jobPostings = {
        getAll: async (filters = {}) => {
            return request('GET_JOB_POSTINGS', filters);
        },

        create: async (data) => {
            return request('CREATE_JOB_POSTING', data);
        },

        update: async (id, data) => {
            return request('UPDATE_JOB_POSTING', { id, ...data });
        }
    };

    // ==================== CANDIDATES API ====================
    const candidates = {
        getAll: async (filters = {}) => {
            return request('GET_CANDIDATES', filters);
        },

        getById: async (id) => {
            return request('GET_CANDIDATE_DETAIL', { id });
        },

        add: async (data) => {
            return request('ADD_CANDIDATE', data);
        },

        update: async (id, data) => {
            return request('UPDATE_CANDIDATE', { id, ...data });
        },

        bulkAdd: async (candidates) => {
            return request('BULK_UPLOAD_CANDIDATES', { candidates });
        },

        shortlist: async (candidateId, approved, reason = '') => {
            return request('SHORTLIST_DECISION', { candidateId, approved, reason });
        },

        getHistory: async (id) => {
            return request('GET_CANDIDATE_HISTORY', { candidateId: id });
        }
    };

    // ==================== CALL SCREENING API ====================
    const calls = {
        getQueue: async (filters = {}) => {
            return request('GET_CALL_QUEUE', filters);
        },

        submitScreening: async (data) => {
            return request('CALL_SCREENING', data);
        },

        updateStatus: async (candidateId, status) => {
            return request('UPDATE_CALL_STATUS', { candidateId, status });
        }
    };

    // ==================== INTERVIEWS API ====================
    const interviews = {
        getAll: async (filters = {}) => {
            return request('GET_INTERVIEWS', filters);
        },

        getScheduled: async () => {
            return request('GET_INTERVIEWS', { status: 'SCHEDULED' });
        },

        schedule: async (data) => {
            return request('SCHEDULE_INTERVIEW', data);
        },

        reschedule: async (id, data) => {
            return request('UPDATE_INTERVIEW', { id, ...data });
        },

        updateStatus: async (id, status) => {
            return request('UPDATE_INTERVIEW', { id, status });
        },

        markAttendance: async (id, appeared) => {
            return request('MARK_ATTENDANCE', { id, appeared });
        },

        submitFeedback: async (data) => {
            return request('PRE_INTERVIEW_FEEDBACK', data);
        },

        getFeedback: async (interviewId) => {
            return request('GET_INTERVIEW_FEEDBACK', { interviewId });
        }
    };

    // ==================== TESTS API ====================
    const tests = {
        getAll: async (filters = {}) => {
            return request('GET_TESTS', filters);
        },

        getResults: async (filters = {}) => {
            return request('GET_TEST_RESULTS', filters);
        },

        getDetails: async (testId) => {
            return request('GET_TEST_DETAILS', { testId });
        },

        sendLink: async (data) => {
            return request('SEND_TEST_LINK', data);
        },

        grade: async (data) => {
            return request('GRADE_TEST', data);
        },

        getActiveLinks: async () => {
            return request('GET_ACTIVE_TEST_LINKS');
        },

        revokeLink: async (linkId) => {
            return request('REVOKE_TEST_LINK', { linkId });
        }
    };

    // ==================== OWNER QUEUE API ====================
    const owner = {
        getQueue: async (filters = {}) => {
            return request('GET_OWNER_QUEUE', filters);
        },

        submitDecision: async (data) => {
            return request('OWNER_DECISION', data);
        },

        getFinalInterviewQueue: async (filters = {}) => {
            return request('GET_FINAL_INTERVIEW_QUEUE', filters);
        },

        submitFinalDecision: async (data) => {
            return request('FINAL_INTERVIEW_DECISION', data);
        },

        getCandidateJourney: async (candidateId) => {
            return request('GET_CANDIDATE_JOURNEY', { candidateId });
        },

        getCandidateCV: async (candidateId) => {
            return request('GET_CANDIDATE_CV', { candidateId });
        },

        getDashboardStats: async () => {
            return request('GET_OWNER_DASHBOARD_STATS');
        }
    };

    // ==================== ONBOARDING API ====================
    const onboarding = {
        getSelectedCandidates: async (filters = {}) => {
            return request('GET_SELECTED_CANDIDATES', filters);
        },

        uploadDocuments: async (data) => {
            return request('UPLOAD_DOCUMENTS', data);
        },

        getCandidateDocuments: async (candidateId) => {
            return request('GET_CANDIDATE_DOCUMENTS', { candidateId });
        },

        verifyDocuments: async (data) => {
            return request('VERIFY_DOCUMENTS', data);
        },

        setJoiningDate: async (data) => {
            return request('SET_JOINING_DATE', data);
        },

        confirmJoining: async (candidateId) => {
            return request('CONFIRM_JOINING', { candidateId });
        },

        postponeJoining: async (data) => {
            return request('POSTPONE_JOINING', data);
        },

        downloadDocument: async (documentId) => {
            return request('DOWNLOAD_DOCUMENT', { documentId });
        },

        viewDocument: async (documentId) => {
            return request('VIEW_DOCUMENT', { documentId });
        },

        getProbationTracking: async (filters = {}) => {
            return request('GET_PROBATION_TRACKING', filters);
        },

        confirmEmployee: async (employeeId) => {
            return request('CONFIRM_EMPLOYEE', { employeeId });
        }
    };

    // ==================== ADMIN API ====================
    const admin = {
        getQueue: async (filters = {}) => {
            return request('GET_ADMIN_QUEUE', filters);
        },

        submitDecision: async (data) => {
            return request('ADMIN_DECISION', data);
        },

        editMarks: async (data) => {
            return request('ADMIN_EDIT_MARKS', data);
        },

        getRejectionLog: async (filters = {}) => {
            return request('GET_REJECTION_LOG', filters);
        },

        revertRejection: async (id, reason) => {
            return request('REVERT_REJECTION', { id, reason });
        },

        getAuditLog: async (filters = {}) => {
            return request('GET_AUDIT_LOG', filters);
        },

        getSettings: async () => {
            return request('GET_SETTINGS');
        },

        updateSettings: async (data) => {
            return request('UPDATE_SETTINGS', data);
        },

        blacklistCandidate: async (data) => {
            return request('BLACKLIST_CANDIDATE', data);
        },

        getBlacklist: async () => {
            return request('GET_BLACKLIST');
        }
    };

    // Public interface
    return {
        request,
        auth,
        dashboard,
        requirements,
        templates,
        jobPostings,
        candidates,
        calls,
        interviews,
        tests,
        owner,
        onboarding,
        admin
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
