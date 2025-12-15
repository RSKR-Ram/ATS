/**
 * ============================================
 * HRMS/ATS SYSTEM - CONFIG FILE
 * Application Configuration
 * ============================================
 */

const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'https://script.google.com/macros/s/AKfycbyqd4v7iIO5TQgJj7Df9V34ls1k7yPr59lw_0qDSHaBZTPaNqDoQyp0EFSfEFwZ5jLo/exec',
        TIMEOUT: 30000, // 30 seconds
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000 // 1 second
    },

    // Google OAuth Configuration
    AUTH: {
        CLIENT_ID: '1029752642188-ku0k9krbdbsttj9br238glq8h4k5loj3.apps.googleusercontent.com',
        SCOPES: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ],
        SESSION_KEY: 'hrms_session',
        TOKEN_KEY: 'hrms_token',
        SESSION_DURATION: 24 * 60 * 60 * 1000 // 24 hours
    },

    // User Roles
    ROLES: {
        ADMIN: 'ADMIN',
        HR: 'HR',
        EA: 'EA',
        OWNER: 'OWNER'
    },

    // Permissions
    PERMISSIONS: {
        // Requirement Module
        REQUIREMENT_CREATE: 'REQUIREMENT_CREATE',
        REQUIREMENT_EDIT: 'REQUIREMENT_EDIT',
        REQUIREMENT_APPROVE: 'REQUIREMENT_APPROVE',
        REQUIREMENT_SEND_BACK: 'REQUIREMENT_SEND_BACK',

        // Job Posting Module
        JOB_POSTING_CREATE: 'JOB_POSTING_CREATE',
        JOB_POSTING_EDIT: 'JOB_POSTING_EDIT',
        JOB_POSTING_VIEW: 'JOB_POSTING_VIEW',

        // Candidate Module
        CANDIDATE_ADD: 'CANDIDATE_ADD',
        CANDIDATE_EDIT: 'CANDIDATE_EDIT',
        CANDIDATE_VIEW: 'CANDIDATE_VIEW',
        CANDIDATE_DELETE: 'CANDIDATE_DELETE',

        // Shortlisting
        SHORTLIST_APPROVE: 'SHORTLIST_APPROVE',
        SHORTLIST_REJECT: 'SHORTLIST_REJECT',

        // Call Screening
        CALL_SCREENING: 'CALL_SCREENING',
        CALL_LOG_VIEW: 'CALL_LOG_VIEW',

        // Interview
        INTERVIEW_SCHEDULE: 'INTERVIEW_SCHEDULE',
        INTERVIEW_FEEDBACK: 'INTERVIEW_FEEDBACK',
        INTERVIEW_PRE_FEEDBACK: 'INTERVIEW_PRE_FEEDBACK',

        // Test Module
        TEST_GENERATE_LINK: 'TEST_GENERATE_LINK',
        TEST_VIEW_RESULTS: 'TEST_VIEW_RESULTS',
        TEST_EDIT_MARKS: 'TEST_EDIT_MARKS',

        // Admin Functions
        ADMIN_DECISION: 'ADMIN_DECISION',
        ADMIN_EDIT_MARKS: 'ADMIN_EDIT_MARKS',
        ADMIN_REVERT: 'ADMIN_REVERT',
        ADMIN_SETTINGS: 'ADMIN_SETTINGS',

        // Final Interview
        FINAL_INTERVIEW_DECISION: 'FINAL_INTERVIEW_DECISION',

        // Onboarding
        ONBOARDING_MANAGE: 'ONBOARDING_MANAGE',
        DOCUMENTS_VERIFY: 'DOCUMENTS_VERIFY',

        // Logs
        VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
        VIEW_REJECTION_LOG: 'VIEW_REJECTION_LOG',
        REVERT_REJECTION: 'REVERT_REJECTION'
    },

    // Role-Permission Mapping
    ROLE_PERMISSIONS: {
        ADMIN: [
            'REQUIREMENT_CREATE', 'REQUIREMENT_EDIT', 'REQUIREMENT_APPROVE', 'REQUIREMENT_SEND_BACK',
            'JOB_POSTING_CREATE', 'JOB_POSTING_EDIT', 'JOB_POSTING_VIEW',
            'CANDIDATE_ADD', 'CANDIDATE_EDIT', 'CANDIDATE_VIEW', 'CANDIDATE_DELETE',
            'SHORTLIST_APPROVE', 'SHORTLIST_REJECT',
            'CALL_SCREENING', 'CALL_LOG_VIEW',
            'INTERVIEW_SCHEDULE', 'INTERVIEW_FEEDBACK', 'INTERVIEW_PRE_FEEDBACK',
            'TEST_GENERATE_LINK', 'TEST_VIEW_RESULTS', 'TEST_EDIT_MARKS',
            'ADMIN_DECISION', 'ADMIN_EDIT_MARKS', 'ADMIN_REVERT', 'ADMIN_SETTINGS',
            'FINAL_INTERVIEW_DECISION',
            'ONBOARDING_MANAGE', 'DOCUMENTS_VERIFY',
            'VIEW_AUDIT_LOG', 'VIEW_REJECTION_LOG', 'REVERT_REJECTION'
        ],
        HR: [
            'REQUIREMENT_APPROVE', 'REQUIREMENT_SEND_BACK',
            'JOB_POSTING_CREATE', 'JOB_POSTING_EDIT', 'JOB_POSTING_VIEW',
            'CANDIDATE_ADD', 'CANDIDATE_VIEW',
            'SHORTLIST_APPROVE', 'SHORTLIST_REJECT',
            'CALL_SCREENING', 'CALL_LOG_VIEW',
            'INTERVIEW_SCHEDULE', 'INTERVIEW_FEEDBACK', 'INTERVIEW_PRE_FEEDBACK',
            'TEST_GENERATE_LINK', 'TEST_VIEW_RESULTS',
            'ONBOARDING_MANAGE', 'DOCUMENTS_VERIFY',
            'VIEW_REJECTION_LOG'
        ],
        EA: [
            'REQUIREMENT_CREATE', 'REQUIREMENT_EDIT',
            'JOB_POSTING_VIEW',
            'CANDIDATE_VIEW',
            'TEST_VIEW_RESULTS', 'TEST_EDIT_MARKS'
        ],
        OWNER: [
            'REQUIREMENT_APPROVE',
            'JOB_POSTING_VIEW',
            'CANDIDATE_VIEW',
            'CALL_LOG_VIEW',
            'INTERVIEW_FEEDBACK',
            'TEST_VIEW_RESULTS',
            'ADMIN_DECISION',
            'FINAL_INTERVIEW_DECISION',
            'VIEW_AUDIT_LOG', 'VIEW_REJECTION_LOG'
        ]
    },

    // Candidate Statuses (State Machine)
    CANDIDATE_STATUS: {
        NEW: 'NEW',
        SHORTLISTED: 'SHORTLISTED',
        REJECTED_SHORTLISTING: 'REJECTED_SHORTLISTING',
        ON_CALL: 'ON_CALL',
        CALL_NO_ANSWER: 'CALL_NO_ANSWER',
        CALL_NOT_REACHABLE: 'CALL_NOT_REACHABLE',
        CALL_REJECTED: 'CALL_REJECTED',
        CALL_DONE: 'CALL_DONE',
        OWNER_REVIEW: 'OWNER_REVIEW',
        INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
        INTERVIEW_NOT_APPEARED: 'INTERVIEW_NOT_APPEARED',
        INTERVIEW_APPEARED: 'INTERVIEW_APPEARED',
        PRE_INTERVIEW_PASS: 'PRE_INTERVIEW_PASS',
        PRE_INTERVIEW_FAIL: 'PRE_INTERVIEW_FAIL',
        ADMIN_REVIEW: 'ADMIN_REVIEW',
        TEST_PENDING: 'TEST_PENDING',
        TEST_IN_PROGRESS: 'TEST_IN_PROGRESS',
        TEST_SUBMITTED: 'TEST_SUBMITTED',
        TEST_PASS: 'TEST_PASS',
        TEST_FAIL: 'TEST_FAIL',
        FINAL_INTERVIEW_SCHEDULED: 'FINAL_INTERVIEW_SCHEDULED',
        SELECTED: 'SELECTED',
        ON_HOLD: 'ON_HOLD',
        REJECTED: 'REJECTED',
        OFFER_SENT: 'OFFER_SENT',
        OFFER_ACCEPTED: 'OFFER_ACCEPTED',
        OFFER_DECLINED: 'OFFER_DECLINED',
        DOCUMENTS_PENDING: 'DOCUMENTS_PENDING',
        DOCUMENTS_VERIFIED: 'DOCUMENTS_VERIFIED',
        JOINED: 'JOINED',
        PROBATION: 'PROBATION',
        CONFIRMED: 'CONFIRMED'
    },

    // Requirement Statuses
    REQUIREMENT_STATUS: {
        DRAFT: 'DRAFT',
        PENDING_HR_REVIEW: 'PENDING_HR_REVIEW',
        NEED_CLARIFICATION: 'NEED_CLARIFICATION',
        APPROVED: 'APPROVED',
        CLOSED: 'CLOSED',
        ON_HOLD: 'ON_HOLD'
    },

    // Job Templates
    JOB_ROLES: [
        { id: 'ACCOUNTS', name: 'Accounts', tests: ['TALLY', 'EXCEL'] },
        { id: 'CRM', name: 'CRM Executive', tests: ['EXCEL', 'VOICE'] },
        { id: 'CCE', name: 'Customer Care Executive', tests: ['EXCEL', 'VOICE'] },
        { id: 'SALES', name: 'Sales Executive', tests: ['EXCEL', 'VOICE'] },
        { id: 'HR', name: 'HR Executive', tests: ['EXCEL'] },
        { id: 'ADMIN_STAFF', name: 'Admin Staff', tests: ['EXCEL'] },
        { id: 'IT', name: 'IT Support', tests: ['TECHNICAL'] },
        { id: 'DEVELOPER', name: 'Software Developer', tests: ['TECHNICAL', 'CODING'] }
    ],

    // Test Types
    TEST_TYPES: {
        EXCEL: { name: 'Excel Test', duration: 30, maxScore: 100, passScore: 60 },
        TALLY: { name: 'Tally Test', duration: 45, maxScore: 100, passScore: 60 },
        VOICE: { name: 'Voice/Communication Test', duration: 15, maxScore: 10, passScore: 6 },
        TECHNICAL: { name: 'Technical Test', duration: 60, maxScore: 100, passScore: 60 },
        CODING: { name: 'Coding Test', duration: 90, maxScore: 100, passScore: 60 }
    },

    // Pre-Interview Feedback Threshold
    PRE_INTERVIEW: {
        PASS_THRESHOLD: 6,
        MAX_SCORE: 10
    },

    // Call Screening Options
    CALL_OPTIONS: [
        { id: 'NO_ANSWER', label: 'No Answer', icon: '📵' },
        { id: 'NOT_REACHABLE', label: 'Not Reachable', icon: '📴' },
        { id: 'REJECTED', label: 'Rejected', icon: '❌' },
        { id: 'CALL_DONE', label: 'Call Done', icon: '✅' }
    ],

    // Document Types
    DOCUMENT_TYPES: [
        { id: 'RESUME', name: 'Resume/CV', required: true },
        { id: 'PHOTO', name: 'Passport Photo', required: true },
        { id: 'ID_PROOF', name: 'ID Proof (Aadhar/PAN)', required: true },
        { id: 'ADDRESS_PROOF', name: 'Address Proof', required: true },
        { id: 'EDUCATION', name: 'Education Certificates', required: true },
        { id: 'EXPERIENCE', name: 'Experience Letters', required: false },
        { id: 'SALARY_SLIP', name: 'Previous Salary Slips', required: false },
        { id: 'BANK_DETAILS', name: 'Bank Account Details', required: true }
    ],

    // CV File Name Format
    CV_FILE_FORMAT: {
        pattern: /^([A-Za-z\s]+)_(\d{10})_([A-Za-z]+)\.pdf$/,
        example: 'Name_Mobile_Source.pdf'
    },

    // Pagination
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 10,
        PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
    },

    // Date Format
    DATE_FORMAT: {
        DISPLAY: 'DD MMM YYYY',
        API: 'YYYY-MM-DD',
        DATETIME: 'DD MMM YYYY, HH:mm'
    },

    // UI Settings
    UI: {
        TOAST_DURATION: 5000,
        DEBOUNCE_DELAY: 300,
        ANIMATION_DURATION: 300
    },

    // Onboarding - Required Documents
    REQUIRED_DOCUMENTS: [
        { key: 'PHOTO', name: 'Passport Photo' },
        { key: 'AADHAR', name: 'Aadhaar Card' },
        { key: 'PAN', name: 'PAN Card' },
        { key: 'ADDRESS_PROOF', name: 'Address Proof' },
        { key: 'EDUCATION', name: 'Education Certificates' },
        { key: 'EXPERIENCE', name: 'Experience Letters' },
        { key: 'BANK', name: 'Bank Details / Cheque' }
    ],

    // Tests - Role based test types
    // Note: candidate.jobRole is used as key; fallback to ['GENERAL'] in code.
    TEST_TYPES: {
        ACCOUNTS: ['TALLY', 'EXCEL'],
        FINANCE: ['EXCEL', 'APTITUDE'],
        SALES: ['VOICE', 'EXCEL'],
        CRM: ['EXCEL', 'VOICE'],
        HR: ['EXCEL', 'GENERAL'],
        ADMIN: ['EXCEL', 'GENERAL'],
        IT: ['CODING', 'APTITUDE'],
        SUPPORT: ['VOICE', 'TYPING'],
        DEFAULT: ['GENERAL']
    },

    // Feature Flags
    FEATURES: {
        BULK_UPLOAD: true,
        WAITLIST: true,
        TEST_AUTO_GRADING: true,
        EMAIL_NOTIFICATIONS: true,
        SMS_NOTIFICATIONS: false
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.API);
Object.freeze(CONFIG.AUTH);
Object.freeze(CONFIG.ROLES);
Object.freeze(CONFIG.PERMISSIONS);
Object.freeze(CONFIG.CANDIDATE_STATUS);
Object.freeze(CONFIG.REQUIREMENT_STATUS);
Object.freeze(CONFIG.REQUIRED_DOCUMENTS);
Object.freeze(CONFIG.TEST_TYPES);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
