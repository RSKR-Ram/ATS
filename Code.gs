/**
 * ============================================
 * HRMS / ATS SYSTEM - BACKEND (Google Apps Script)
 * Complete Switch-Case API Router
 * ============================================
 */

// Configuration
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
  SHEETS: {
    USERS: 'USERS',
    PERMISSIONS: 'PERMISSIONS',
    JOB_TEMPLATES: 'JOB_TEMPLATES',
    REQUIREMENTS: 'REQUIREMENTS',
    JOB_POSTINGS: 'JOB_POSTINGS',
    CANDIDATES: 'CANDIDATES',
    CALL_LOGS: 'CALL_LOGS',
    INTERVIEWS: 'INTERVIEWS',
    TESTS: 'TESTS',
    TEST_RESULTS: 'TEST_RESULTS',
    DOCUMENTS: 'DOCUMENTS',
    REJECTION_LOG: 'REJECTION_LOG',
    AUDIT_LOG: 'AUDIT_LOG',
    EMPLOYEES: 'EMPLOYEES',
    PROBATION: 'PROBATION'
  },
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  PROBATION_MONTHS: 6,
  TEST_LINK_EXPIRY: 24 * 60 * 60 * 1000 // 24 hours
};

// Sheet Headers Configuration
const SHEET_HEADERS = {
  USERS: ['id', 'name', 'email', 'role', 'status', 'createdAt', 'updatedAt'],
  PERMISSIONS: ['role', 'permissions'],
  JOB_TEMPLATES: ['id', 'title', 'department', 'description', 'requirements', 'responsibilities', 'createdAt', 'updatedAt'],
  REQUIREMENTS: ['id', 'title', 'department', 'positions', 'description', 'status', 'createdBy', 'createdAt', 'updatedAt'],
  JOB_POSTINGS: ['id', 'requirementId', 'portal', 'postingUrl', 'screenshot', 'postedAt', 'status', 'createdBy', 'createdAt'],
  CANDIDATES: ['id', 'name', 'mobile', 'email', 'requirementId', 'source', 'cvUrl', 'status', 'createdBy', 'createdAt', 'updatedAt'],
  CALL_LOGS: ['id', 'candidateId', 'callStatus', 'communication', 'experience', 'recommend', 'remark', 'createdBy', 'createdAt'],
  INTERVIEWS: ['id', 'candidateId', 'date', 'time', 'location', 'status', 'appeared', 'createdBy', 'createdAt', 'updatedAt'],
  PRE_INTERVIEW_FEEDBACK: ['id', 'candidateId', 'communication', 'roleFit', 'overall', 'remark', 'createdBy', 'createdAt'],
  TESTS: ['id', 'candidateId', 'testType', 'token', 'expiresAt', 'status', 'startedAt', 'submittedAt', 'createdAt'],
  TEST_RESULTS: ['id', 'testId', 'candidateId', 'testType', 'marks', 'totalMarks', 'percentage', 'passed', 'createdAt'],
  DOCUMENTS: ['id', 'candidateId', 'documentType', 'documentName', 'fileUrl', 'status', 'uploadedBy', 'uploadedAt', 'verifiedBy', 'verifiedAt'],
  REJECTION_LOG: ['id', 'candidateId', 'stage', 'reason', 'rejectedBy', 'rejectedAt', 'reverted', 'revertedBy', 'revertedAt'],
  AUDIT_LOG: ['id', 'action', 'data', 'userId', 'timestamp', 'success'],
  EMPLOYEES: ['id', 'candidateId', 'employeeId', 'name', 'email', 'mobile', 'department', 'designation', 'joinedAt', 'probationEnd', 'status'],
  PROBATION: ['id', 'employeeId', 'startDate', 'endDate', 'status', 'reviews', 'createdAt', 'updatedAt'],
  ADMIN_QUEUE: ['id', 'candidateId', 'queueType', 'createdAt'],
  SELECTED_CANDIDATES: ['id', 'candidateId', 'designation', 'department', 'offeredCTC', 'probationMonths', 'expectedJoining', 'remarks', 'status', 'createdBy', 'createdAt'],
  OWNER_DECISIONS: ['id', 'candidateId', 'decision', 'priority', 'interviewType', 'remarks', 'createdBy', 'createdAt'],
  HOLD_CANDIDATES: ['id', 'candidateId', 'holdReason', 'reviewDate', 'createdBy', 'createdAt'],
  BLACKLIST: ['id', 'candidateId', 'name', 'mobile', 'email', 'reason', 'createdBy', 'createdAt']
};

/**
 * Initialize all sheets with headers (Run once during setup)
 */
function initializeSheets() {
  console.log('Starting sheet initialization...');
  
  const ss = getSpreadsheet();
  let createdCount = 0;
  let existingCount = 0;
  
  // Create each sheet with headers
  Object.keys(CONFIG.SHEETS).forEach(sheetKey => {
    const sheetName = CONFIG.SHEETS[sheetKey];
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      // Create new sheet
      sheet = ss.insertSheet(sheetName);
      console.log(`Created sheet: ${sheetName}`);
      createdCount++;
      
      // Add headers
      if (SHEET_HEADERS[sheetName]) {
        sheet.getRange(1, 1, 1, SHEET_HEADERS[sheetName].length)
             .setValues([SHEET_HEADERS[sheetName]])
             .setFontWeight('bold')
             .setBackground('#4285f4')
             .setFontColor('#ffffff');
        
        // Freeze header row
        sheet.setFrozenRows(1);
        
        // Auto-resize columns
        for (let i = 1; i <= SHEET_HEADERS[sheetName].length; i++) {
          sheet.autoResizeColumn(i);
        }
        
        console.log(`Added headers to: ${sheetName}`);
      }
    } else {
      // Check if headers exist
      const firstRow = sheet.getRange(1, 1, 1, 1).getValue();
      if (!firstRow || firstRow === '') {
        // Add headers to existing sheet
        if (SHEET_HEADERS[sheetName]) {
          sheet.getRange(1, 1, 1, SHEET_HEADERS[sheetName].length)
               .setValues([SHEET_HEADERS[sheetName]])
               .setFontWeight('bold')
               .setBackground('#4285f4')
               .setFontColor('#ffffff');
          
          sheet.setFrozenRows(1);
          console.log(`Added headers to existing sheet: ${sheetName}`);
        }
      }
      existingCount++;
    }
  });
  
  console.log(`Sheet initialization complete!`);
  console.log(`Created: ${createdCount}, Existing: ${existingCount}`);
  
  return {
    success: true,
    message: `Initialized ${createdCount + existingCount} sheets`,
    created: createdCount,
    existing: existingCount
  };
}

/**
 * Setup default data (Run once after sheet initialization)
 */
function setupDefaultData() {
  console.log('Setting up default data...');
  
  // Add default permissions
  const permissionsSheet = getSheet(CONFIG.SHEETS.PERMISSIONS);
  const permissionData = permissionsSheet.getDataRange().getValues();
  
  if (permissionData.length === 1) { // Only headers
    const defaultPermissions = [
      ['ADMIN', 'ALL'],
      ['HR', 'REQUIREMENT_VIEW,REQUIREMENT_APPROVE,CANDIDATE_CREATE,CANDIDATE_VIEW,CALL_SCREENING,INTERVIEW_SCHEDULE,INTERVIEW_VIEW,PRE_INTERVIEW_FEEDBACK,ONBOARDING_VIEW'],
      ['EA', 'REQUIREMENT_CREATE,REQUIREMENT_VIEW,TEST_VIEW'],
      ['OWNER', 'REQUIREMENT_VIEW,CANDIDATE_VIEW,OWNER_DECISION,OWNER_QUEUE_VIEW,FINAL_INTERVIEW_VIEW,CANDIDATE_JOURNEY_VIEW']
    ];
    
    permissionsSheet.getRange(2, 1, defaultPermissions.length, defaultPermissions[0].length)
                    .setValues(defaultPermissions);
    console.log('Added default permissions');
  }
  
  // Add sample admin user
  const usersSheet = getSheet(CONFIG.SHEETS.USERS);
  const userData = usersSheet.getDataRange().getValues();
  
  if (userData.length === 1) { // Only headers
    const adminUser = [
      ['U001', 'System Admin', 'admin@company.com', 'ADMIN', 'ACTIVE', now(), now()]
    ];
    
    usersSheet.getRange(2, 1, adminUser.length, adminUser[0].length)
              .setValues(adminUser);
    console.log('Added default admin user');
  }
  
  // Add sample job templates
  const templatesSheet = getSheet(CONFIG.SHEETS.JOB_TEMPLATES);
  const templateData = templatesSheet.getDataRange().getValues();
  
  if (templateData.length === 1) { // Only headers
    const templates = [
      ['JT001', 'Accountant', 'Accounts', 'Handle accounts, GST, Tally', 'Tally, Excel, GST knowledge', 'Daily entries, reconciliation, reports', now(), now()],
      ['JT002', 'CRM Executive', 'Sales', 'Customer relationship management', 'Excel, Communication, CRM software', 'Lead management, follow-ups, reporting', now(), now()],
      ['JT003', 'CCE (Customer Care Executive)', 'Support', 'Customer support and service', 'Excel, Communication, Problem solving', 'Handle calls, resolve queries, documentation', now(), now()]
    ];
    
    templatesSheet.getRange(2, 1, templates.length, templates[0].length)
                  .setValues(templates);
    console.log('Added default job templates');
  }
  
  return {
    success: true,
    message: 'Default data setup complete'
  };
}

/**
 * Main API Entry Point - doPost
 */
function doPost(e) {
  try {
    // Parse request - handle both JSON and text/plain content types
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonResponse({ success: false, error: 'Invalid JSON payload', code: 'PARSE_ERROR' });
    }
    
    const { action, token, data = {}, timestamp } = payload;

    // Log request
    console.log('API Request:', action, timestamp);

    // Verify token (except for login actions)
    const skipAuthActions = ['LOGIN', 'AUTH_LOGIN', 'OAUTH_CALLBACK', 'INITIALIZE_SHEETS', 'SETUP_DEFAULT_DATA'];
    if (!skipAuthActions.includes(action)) {
      const user = verifyToken(token);
      if (!user) {
        return jsonResponse({ success: false, error: 'Invalid or expired token', code: 'AUTH_ERROR' });
      }
      
      // Attach user to data
      data._user = user;
    }

    // Route to appropriate handler
    let result;
    
    switch(action) {
      // ==================== SETUP ====================
      case 'INITIALIZE_SHEETS':
        result = initializeSheets();
        break;
      case 'SETUP_DEFAULT_DATA':
        result = setupDefaultData();
        break;
      
      // ==================== AUTH ====================
      case 'LOGIN':
      case 'AUTH_LOGIN':
        result = handleLogin(data);
        break;
      case 'OAUTH_CALLBACK':
        result = handleOAuthCallback(data);
        break;
      case 'REFRESH_TOKEN':
        result = handleRefreshToken(data);
        break;
      case 'AUTH_VALIDATE':
        result = handleValidateToken(token);
        break;
      case 'AUTH_LOGOUT':
        result = handleLogout(token);
        break;
      case 'GET_USER_PERMISSIONS':
        result = handleGetUserPermissions(data);
        break;
      case 'GET_USER_DATA':
        result = getUserData(data);
        break;

      // ==================== REQUIREMENTS ====================
      case 'GET_REQUIREMENTS':
        result = getRequirements(data);
        break;
      case 'GET_REQUIREMENT_DETAIL':
        result = getRequirementDetail(data);
        break;
      case 'RAISE_REQUIREMENT':
        result = raiseRequirement(data);
        break;
      case 'APPROVE_REQUIREMENT':
        result = approveRequirement(data);
        break;
      case 'SEND_BACK_REQUIREMENT':
        result = sendBackRequirement(data);
        break;
      case 'GET_JOB_TEMPLATES':
        result = getJobTemplates(data);
        break;

      // ==================== JOB POSTINGS ====================
      case 'CREATE_JOB_POSTING':
        result = createJobPosting(data);
        break;
      case 'UPDATE_JOB_POSTING':
        result = updateJobPosting(data);
        break;
      case 'GET_JOB_POSTINGS':
        result = getJobPostings(data);
        break;

      // ==================== CANDIDATES ====================
      case 'GET_CANDIDATES':
        result = getCandidates(data);
        break;
      case 'GET_CANDIDATE_DETAIL':
        result = getCandidateDetail(data);
        break;
      case 'ADD_CANDIDATE':
        result = addCandidate(data);
        break;
      case 'BULK_UPLOAD_CANDIDATES':
        result = bulkUploadCandidates(data);
        break;
      case 'SHORTLIST_DECISION':
        result = shortlistDecision(data);
        break;
      case 'GET_CANDIDATE_HISTORY':
        result = getCandidateHistory(data);
        break;

      // ==================== CALL SCREENING ====================
      case 'GET_CALL_QUEUE':
        result = getCallQueue(data);
        break;
      case 'CALL_SCREENING':
        result = callScreening(data);
        break;
      case 'UPDATE_CALL_STATUS':
        result = updateCallStatus(data);
        break;

      // ==================== INTERVIEWS ====================
      case 'GET_INTERVIEWS':
        result = getInterviews(data);
        break;
      case 'SCHEDULE_INTERVIEW':
        result = scheduleInterview(data);
        break;
      case 'UPDATE_INTERVIEW':
        result = updateInterview(data);
        break;
      case 'MARK_ATTENDANCE':
        result = markAttendance(data);
        break;
      case 'PRE_INTERVIEW_FEEDBACK':
        result = preInterviewFeedback(data);
        break;

      // ==================== OWNER DECISION ====================
      case 'GET_OWNER_QUEUE':
        result = getOwnerQueue(data);
        break;
      case 'OWNER_DECISION':
        result = ownerDecision(data);
        break;
      case 'GET_FINAL_INTERVIEW_QUEUE':
        result = getFinalInterviewQueue(data);
        break;
      case 'FINAL_INTERVIEW_DECISION':
        result = finalInterviewDecision(data);
        break;
      case 'GET_CANDIDATE_JOURNEY':
        result = getCandidateJourney(data);
        break;
      case 'GET_CANDIDATE_CV':
        result = getCandidateCV(data);
        break;
      case 'GET_OWNER_DASHBOARD_STATS':
        result = getOwnerDashboardStats(data);
        break;

      // ==================== TESTS ====================
      case 'GET_TESTS':
        result = getTests(data);
        break;
      case 'GENERATE_TEST_LINK':
        result = generateTestLink(data);
        break;
      case 'GET_TEST_BY_TOKEN':
        result = getTestByToken(data);
        break;
      case 'SUBMIT_TEST':
        result = submitTest(data);
        break;
      case 'GET_TEST_RESULTS':
        result = getTestResults(data);
        break;

      // ==================== ADMIN ====================
      case 'GET_ADMIN_QUEUE':
        result = getAdminQueue(data);
        break;
      case 'ADMIN_UPDATE_MARKS':
        result = adminUpdateMarks(data);
        break;
      case 'ADMIN_RESUME_CANDIDATE':
        result = adminResumeCandidate(data);
        break;
      case 'ADMIN_REVERT_TO_HR':
        result = adminRevertToHR(data);
        break;
      case 'ADMIN_REJECT_CANDIDATE':
        result = adminRejectCandidate(data);
        break;
      case 'GET_REJECTION_LOG':
        result = getRejectionLog(data);
        break;
      case 'ADMIN_REVERT_REJECTION':
        result = adminRevertRejection(data);
        break;
      case 'GET_AUDIT_LOG':
        result = getAuditLog(data);
        break;

      // ==================== ONBOARDING ====================
      case 'GET_SELECTED_CANDIDATES':
        result = getSelectedCandidates(data);
        break;
      case 'UPLOAD_DOCUMENTS':
        result = uploadDocuments(data);
        break;
      case 'GET_CANDIDATE_DOCUMENTS':
        result = getCandidateDocuments(data);
        break;
      case 'VERIFY_DOCUMENTS':
        result = verifyDocuments(data);
        break;
      case 'SET_JOINING_DATE':
        result = setJoiningDate(data);
        break;
      case 'CONFIRM_JOINING':
        result = confirmJoining(data);
        break;
      case 'POSTPONE_JOINING':
        result = postponeJoining(data);
        break;

      // ==================== PROBATION ====================
      case 'GET_PROBATION_TRACKING':
        result = getProbationTracking(data);
        break;
      case 'CONFIRM_EMPLOYEE':
        result = confirmEmployee(data);
        break;

      // ==================== DASHBOARD ====================
      case 'GET_DASHBOARD_STATS':
        result = getDashboardStats(data);
        break;
      case 'GET_RECENT_ACTIVITY':
        result = getRecentActivity(data);
        break;
      case 'GET_PENDING_ACTIONS':
        result = getPendingActions(data);
        break;

      // ==================== NOTIFICATIONS ====================
      case 'GET_NOTIFICATIONS':
        result = getNotifications(data);
        break;
      case 'MARK_NOTIFICATION_READ':
        result = markNotificationRead(data);
        break;

      default:
        result = { success: false, error: 'Invalid action', code: 'INVALID_ACTION' };
    }

    // Log audit
    if (data._user && action !== 'GET_AUDIT_LOG') {
      logAudit(action, data._user, data, result.success);
    }

    return jsonResponse(result);

  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ 
      success: false, 
      error: error.message || 'Internal server error', 
      code: 'SERVER_ERROR' 
    });
  }
}

/**
 * JSON Response Helper with CORS
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle GET requests (for CORS preflight and simple requests)
 */
function doGet(e) {
  // Handle as POST if action parameter present
  if (e && e.parameter && e.parameter.action) {
    const payload = {
      action: e.parameter.action,
      token: e.parameter.token || null,
      data: e.parameter.data ? JSON.parse(e.parameter.data) : {},
      timestamp: new Date().toISOString()
    };
    return handleRequest(payload);
  }
  
  return jsonResponse({ 
    success: true, 
    message: 'HRMS/ATS API is running',
    version: '1.0.0'
  });
}

/**
 * Get Spreadsheet
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/**
 * Get Sheet (Auto-creates with headers if not exists)
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    // Create new sheet
    sheet = ss.insertSheet(sheetName);
    console.log(`Auto-created sheet: ${sheetName}`);
    
    // Add headers if defined
    if (SHEET_HEADERS[sheetName]) {
      sheet.getRange(1, 1, 1, SHEET_HEADERS[sheetName].length)
           .setValues([SHEET_HEADERS[sheetName]])
           .setFontWeight('bold')
           .setBackground('#4285f4')
           .setFontColor('#ffffff');
      
      // Freeze header row
      sheet.setFrozenRows(1);
      
      console.log(`Auto-added headers to: ${sheetName}`);
    }
  }
  
  return sheet;
}

/**
 * Generate Unique ID
 */
function generateId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Current Timestamp
 */
function now() {
  return new Date().toISOString();
}

// ==================== AUTH FUNCTIONS ====================

function handleLogin(data) {
  try {
    const { token: googleToken, email, password } = data;
    
    let userEmail = email;
    
    // If Google token provided, verify it
    if (googleToken) {
      try {
        // In production, verify Google token with Google's API
        // For now, we'll extract email from the JWT payload (base64 decode)
        const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(googleToken.split('.')[1])).getDataAsString());
        userEmail = payload.email;
      } catch (err) {
        console.error('Token verification error:', err);
        return { success: false, error: 'Invalid Google token', code: 'INVALID_TOKEN' };
      }
    }
    
    if (!userEmail) {
      return { success: false, error: 'Email is required', code: 'MISSING_EMAIL' };
    }
    
    // Find user in USERS sheet
    const sheet = getSheet(CONFIG.SHEETS.USERS);
    const users = sheet.getDataRange().getValues();
    
    for (let i = 1; i < users.length; i++) {
      if (users[i][2] === userEmail) { // Email is in column 3
        const user = {
          id: users[i][0],
          name: users[i][1],
          email: users[i][2],
          role: users[i][3],
          status: users[i][4],
          permissions: getUserPermissions(users[i][3])
        };
        
        // Check if user is active
        if (user.status !== 'ACTIVE') {
          return { success: false, error: 'Account is inactive', code: 'INACTIVE_USER' };
        }
        
        const sessionToken = generateToken(user);
        
        return {
          success: true,
          user: user,
          token: sessionToken
        };
      }
    }
    
    return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.toString(), code: 'LOGIN_ERROR' };
  }
}

function handleValidateToken(token) {
  try {
    const user = verifyToken(token);
    if (user) {
      return {
        success: true,
        user: user,
        token: token
      };
    }
    return { success: false, error: 'Invalid token', code: 'INVALID_TOKEN' };
  } catch (error) {
    return { success: false, error: error.toString(), code: 'VALIDATION_ERROR' };
  }
}

function handleLogout(token) {
  // In production, invalidate token in database
  return { success: true, message: 'Logged out successfully' };
}

function handleGetUserPermissions(data) {
  try {
    const user = data._user;
    return {
      success: true,
      permissions: user.permissions
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function handleOAuthCallback(data) {
  // Implement OAuth callback handling
  return { success: true, data: {} };
}

function handleRefreshToken(data) {
  // Implement token refresh
  return { success: true, data: {} };
}

function getUserData(data) {
  const user = data._user;
  return {
    success: true,
    data: {
      user: user
    }
  };
}

function generateToken(user) {
  // In production, use proper JWT or session token
  return 'TOKEN_' + user.id + '_' + new Date().getTime();
}

function verifyToken(token) {
  // In production, implement proper token verification
  // For now, return mock user
  if (!token || !token.startsWith('TOKEN_')) {
    return null;
  }
  
  // Extract user ID from token
  const parts = token.split('_');
  if (parts.length < 2) return null;
  
  const userId = parts[1];
  
  // Find user
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const users = sheet.getDataRange().getValues();
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === userId) {
      return {
        id: users[i][0],
        name: users[i][1],
        email: users[i][2],
        role: users[i][3],
        permissions: getUserPermissions(users[i][3])
      };
    }
  }
  
  return null;
}

function getUserPermissions(role) {
  const sheet = getSheet(CONFIG.SHEETS.PERMISSIONS);
  const permissions = sheet.getDataRange().getValues();
  
  for (let i = 1; i < permissions.length; i++) {
    if (permissions[i][0] === role) {
      return permissions[i][1].split(',');
    }
  }
  
  return [];
}

// ==================== REQUIREMENTS FUNCTIONS ====================

function getRequirements(data) {
  const sheet = getSheet(CONFIG.SHEETS.REQUIREMENTS);
  const values = sheet.getDataRange().getValues();
  
  if (values.length <= 1) {
    return { success: true, data: [] };
  }
  
  const headers = values[0];
  const requirements = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const requirement = {};
    
    headers.forEach((header, index) => {
      requirement[header] = row[index];
    });
    
    // Apply filters
    if (data.filters) {
      let include = true;
      
      if (data.filters.status && requirement.status !== data.filters.status) {
        include = false;
      }
      
      if (!include) continue;
    }
    
    requirements.push(requirement);
  }
  
  return {
    success: true,
    data: requirements,
    total: requirements.length
  };
}

function getRequirementDetail(data) {
  const { requirementId } = data;
  const sheet = getSheet(CONFIG.SHEETS.REQUIREMENTS);
  const values = sheet.getDataRange().getValues();
  
  const headers = values[0];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === requirementId) {
      const requirement = {};
      headers.forEach((header, index) => {
        requirement[header] = values[i][index];
      });
      
      return { success: true, data: requirement };
    }
  }
  
  return { success: false, error: 'Requirement not found', code: 'NOT_FOUND' };
}

function raiseRequirement(data) {
  // Check permission
  if (!hasPermission(data._user, 'REQUIREMENT_CREATE')) {
    return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
  }
  
  const sheet = getSheet(CONFIG.SHEETS.REQUIREMENTS);
  const id = generateId('REQ');
  
  const requirement = {
    id: id,
    title: data.title,
    department: data.department,
    positions: data.positions,
    description: data.description,
    status: 'PENDING_HR_REVIEW',
    createdBy: data._user.id,
    createdAt: now(),
    updatedAt: now()
  };
  
  // Append row
  sheet.appendRow([
    requirement.id,
    requirement.title,
    requirement.department,
    requirement.positions,
    requirement.description,
    requirement.status,
    requirement.createdBy,
    requirement.createdAt,
    requirement.updatedAt
  ]);
  
  return {
    success: true,
    data: requirement,
    message: 'Requirement raised successfully'
  };
}

function approveRequirement(data) {
  // Check permission
  if (!hasPermission(data._user, 'REQUIREMENT_APPROVE')) {
    return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
  }
  
  const { requirementId } = data;
  const sheet = getSheet(CONFIG.SHEETS.REQUIREMENTS);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === requirementId) {
      sheet.getRange(i + 1, 6).setValue('APPROVED');
      sheet.getRange(i + 1, 9).setValue(now());
      
      return {
        success: true,
        message: 'Requirement approved successfully'
      };
    }
  }
  
  return { success: false, error: 'Requirement not found', code: 'NOT_FOUND' };
}

function sendBackRequirement(data) {
  const { requirementId, remark } = data;
  
  if (!remark) {
    return { success: false, error: 'Remark is required', code: 'VALIDATION_ERROR' };
  }
  
  const sheet = getSheet(CONFIG.SHEETS.REQUIREMENTS);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === requirementId) {
      sheet.getRange(i + 1, 6).setValue('NEED_CLARIFICATION');
      sheet.getRange(i + 1, 9).setValue(now());
      
      return {
        success: true,
        message: 'Requirement sent back for clarification'
      };
    }
  }
  
  return { success: false, error: 'Requirement not found', code: 'NOT_FOUND' };
}

function getJobTemplates(data) {
  const sheet = getSheet(CONFIG.SHEETS.JOB_TEMPLATES);
  const values = sheet.getDataRange().getValues();
  
  if (values.length <= 1) {
    return { success: true, data: [] };
  }
  
  const headers = values[0];
  const templates = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const template = {};
    
    headers.forEach((header, index) => {
      template[header] = row[index];
    });
    
    templates.push(template);
  }
  
  return { success: true, data: templates };
}

// ==================== CANDIDATES FUNCTIONS ====================

function getCandidates(data) {
  const sheet = getSheet(CONFIG.SHEETS.CANDIDATES);
  const values = sheet.getDataRange().getValues();
  
  if (values.length <= 1) {
    return { success: true, data: [] };
  }
  
  const headers = values[0];
  const candidates = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const candidate = {};
    
    headers.forEach((header, index) => {
      candidate[header] = row[index];
    });
    
    // Apply filters
    if (data.filters) {
      let include = true;
      
      if (data.filters.status && candidate.status !== data.filters.status) {
        include = false;
      }
      
      if (data.filters.requirementId && candidate.requirementId !== data.filters.requirementId) {
        include = false;
      }
      
      if (!include) continue;
    }
    
    candidates.push(candidate);
  }
  
  return {
    success: true,
    data: candidates,
    total: candidates.length
  };
}

function getCandidateDetail(data) {
  const { candidateId } = data;
  const sheet = getSheet(CONFIG.SHEETS.CANDIDATES);
  const values = sheet.getDataRange().getValues();
  
  const headers = values[0];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === candidateId) {
      const candidate = {};
      headers.forEach((header, index) => {
        candidate[header] = values[i][index];
      });
      
      return { success: true, data: candidate };
    }
  }
  
  return { success: false, error: 'Candidate not found', code: 'NOT_FOUND' };
}

function addCandidate(data) {
  if (!hasPermission(data._user, 'CANDIDATE_CREATE')) {
    return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
  }
  
  const sheet = getSheet(CONFIG.SHEETS.CANDIDATES);
  const id = generateId('CAN');
  
  const candidate = {
    id: id,
    name: data.name,
    mobile: data.mobile,
    email: data.email,
    requirementId: data.requirementId,
    source: data.source,
    cvUrl: data.cvUrl,
    status: data.isRelevant ? 'SHORTLISTED' : 'REJECTED',
    createdBy: data._user.id,
    createdAt: now(),
    updatedAt: now()
  };
  
  sheet.appendRow([
    candidate.id,
    candidate.name,
    candidate.mobile,
    candidate.email,
    candidate.requirementId,
    candidate.source,
    candidate.cvUrl,
    candidate.status,
    candidate.createdBy,
    candidate.createdAt,
    candidate.updatedAt
  ]);
  
  // If rejected, add to rejection log
  if (!data.isRelevant) {
    logRejection(candidate.id, 'SHORTLISTING', data.rejectionReason || 'CV not relevant', data._user);
  }
  
  return {
    success: true,
    data: candidate,
    message: 'Candidate added successfully'
  };
}

function bulkUploadCandidates(data) {
  // Implement bulk upload logic
  const { candidates, requirementId } = data;
  const results = [];
  
  candidates.forEach(candidateData => {
    const result = addCandidate({
      ...candidateData,
      requirementId: requirementId,
      _user: data._user
    });
    results.push(result);
  });
  
  return {
    success: true,
    data: results,
    message: `${results.length} candidates uploaded`
  };
}

function shortlistDecision(data) {
  const { candidateId, decision, remark } = data;
  const sheet = getSheet(CONFIG.SHEETS.CANDIDATES);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === candidateId) {
      const newStatus = decision === 'APPROVE' ? 'ON_CALL' : 'REJECTED';
      sheet.getRange(i + 1, 8).setValue(newStatus);
      sheet.getRange(i + 1, 11).setValue(now());
      
      if (decision === 'REJECT') {
        logRejection(candidateId, 'SHORTLISTING', remark, data._user);
      }
      
      return {
        success: true,
        message: `Candidate ${decision === 'APPROVE' ? 'approved' : 'rejected'} successfully`
      };
    }
  }
  
  return { success: false, error: 'Candidate not found', code: 'NOT_FOUND' };
}

function getCandidateHistory(data) {
  const { candidateId } = data;
  
  // Get history from audit log
  const sheet = getSheet(CONFIG.SHEETS.AUDIT_LOG);
  const values = sheet.getDataRange().getValues();
  
  const history = [];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][2] && values[i][2].includes(candidateId)) {
      history.push({
        action: values[i][1],
        user: values[i][3],
        timestamp: values[i][4],
        remark: values[i][5]
      });
    }
  }
  
  return { success: true, data: history };
}

// ==================== CALL SCREENING ====================

function getCallQueue(data) {
  return getCandidates({
    ...data,
    filters: { status: 'ON_CALL' }
  });
}

function callScreening(data) {
  const { candidateId, callStatus, communication, experience, recommend, remark } = data;
  
  // Log call
  const callSheet = getSheet(CONFIG.SHEETS.CALL_LOGS);
  callSheet.appendRow([
    generateId('CALL'),
    candidateId,
    callStatus,
    communication,
    experience,
    recommend,
    remark,
    data._user.id,
    now()
  ]);
  
  // Update candidate status
  if (callStatus === 'CALL_DONE' && recommend) {
    const candidateSheet = getSheet(CONFIG.SHEETS.CANDIDATES);
    const values = candidateSheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === candidateId) {
        candidateSheet.getRange(i + 1, 8).setValue('OWNER_REVIEW');
        candidateSheet.getRange(i + 1, 11).setValue(now());
        break;
      }
    }
  } else if (callStatus === 'REJECT') {
    logRejection(candidateId, 'CALL_SCREENING', remark, data._user);
    updateCandidateStatus(candidateId, 'REJECTED');
  }
  
  return {
    success: true,
    message: 'Call screening completed successfully'
  };
}

function updateCallStatus(data) {
  // Implement call status update
  return { success: true };
}

// ==================== HELPER FUNCTIONS ====================

function hasPermission(user, permission) {
  return user && user.permissions && user.permissions.includes(permission);
}

function updateCandidateStatus(candidateId, status) {
  const sheet = getSheet(CONFIG.SHEETS.CANDIDATES);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === candidateId) {
      sheet.getRange(i + 1, 8).setValue(status);
      sheet.getRange(i + 1, 11).setValue(now());
      return true;
    }
  }
  
  return false;
}

function logRejection(candidateId, stage, reason, user) {
  const sheet = getSheet(CONFIG.SHEETS.REJECTION_LOG);
  sheet.appendRow([
    generateId('REJ'),
    candidateId,
    stage,
    reason,
    user.id,
    now()
  ]);
}

function logAudit(action, user, data, success) {
  const sheet = getSheet(CONFIG.SHEETS.AUDIT_LOG);
  sheet.appendRow([
    generateId('AUDIT'),
    action,
    JSON.stringify(data),
    user.id,
    now(),
    success
  ]);
}

// ==================== STUB FUNCTIONS (TO BE IMPLEMENTED) ====================

function createJobPosting(data) { return { success: true }; }
function updateJobPosting(data) { return { success: true }; }
function getJobPostings(data) { return { success: true, data: [] }; }
function getInterviews(data) { return { success: true, data: [] }; }
function scheduleInterview(data) { return { success: true }; }
function updateInterview(data) { return { success: true }; }
function markAttendance(data) { return { success: true }; }
function preInterviewFeedback(data) { 
  const { candidateId, communication, roleFit, remark } = data;
  
  // Calculate overall
  const overall = ((parseFloat(communication) + parseFloat(roleFit)) / 2).toFixed(1);
  
  // Store feedback
  const feedbackSheet = getSheet('PRE_INTERVIEW_FEEDBACK');
  feedbackSheet.appendRow([
    generateId('FEED'),
    candidateId,
    communication,
    roleFit,
    overall,
    remark,
    data._user.id,
    now()
  ]);
  
  // Update candidate status based on overall score
  const newStatus = parseFloat(overall) >= 6 ? 'PRE_INTERVIEW_PASS' : 'PRE_INTERVIEW_FAIL';
  updateCandidateStatus(candidateId, newStatus);
  
  // If failed, add to admin queue
  if (newStatus === 'PRE_INTERVIEW_FAIL') {
    const adminQueueSheet = getSheet('ADMIN_QUEUE');
    adminQueueSheet.appendRow([
      generateId('AQ'),
      candidateId,
      'PRE_INTERVIEW_FAIL',
      now()
    ]);
  }
  
  return { 
    success: true, 
    message: 'Pre-interview feedback submitted',
    data: { overall: overall, status: newStatus }
  };
}

function getOwnerQueue(data) { 
  // Get candidates with status OWNER_REVIEW
  const candidates = getCandidates({
    ...data,
    filters: { status: 'OWNER_REVIEW' }
  });
  
  if (!candidates.success) {
    return candidates;
  }
  
  // Enrich with call screening data
  const callSheet = getSheet(CONFIG.SHEETS.CALL_LOGS);
  const callData = callSheet.getDataRange().getValues();
  
  const enrichedCandidates = candidates.data.map(candidate => {
    // Find call log
    for (let i = 1; i < callData.length; i++) {
      if (callData[i][1] === candidate.id) {
        return {
          ...candidate,
          callMarks: {
            communication: callData[i][3],
            experience: callData[i][4],
            recommend: callData[i][5],
            remark: callData[i][6]
          },
          callScreenedAt: callData[i][8]
        };
      }
    }
    return candidate;
  });
  
  return { success: true, data: enrichedCandidates };
}

function ownerDecision(data) { 
  const { candidateId, decision, priority, interviewType, ownerRemarks, holdReason, reviewDate, rejectionReason, blacklist } = data;
  
  if (!hasPermission(data._user, 'OWNER_DECISION')) {
    return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
  }
  
  const candidateSheet = getSheet(CONFIG.SHEETS.CANDIDATES);
  const values = candidateSheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === candidateId) {
      let newStatus = '';
      let message = '';
      
      if (decision === 'APPROVE') {
        newStatus = 'INTERVIEW_SCHEDULE';
        message = 'Candidate approved for interview';
        
        // Store owner decision
        const decisionSheet = getSheet('OWNER_DECISIONS');
        decisionSheet.appendRow([
          generateId('OWND'),
          candidateId,
          decision,
          priority,
          interviewType,
          ownerRemarks,
          data._user.id,
          now()
        ]);
        
      } else if (decision === 'HOLD') {
        newStatus = 'HOLD';
        message = 'Candidate on hold';
        
        // Store hold info
        const holdSheet = getSheet('HOLD_CANDIDATES');
        holdSheet.appendRow([
          generateId('HOLD'),
          candidateId,
          holdReason,
          reviewDate,
          data._user.id,
          now()
        ]);
        
      } else if (decision === 'REJECT') {
        newStatus = 'REJECTED';
        message = 'Candidate rejected';
        
        // Log rejection
        logRejection(candidateId, 'OWNER_DECISION', rejectionReason, data._user);
        
        // Blacklist if requested
        if (blacklist) {
          const blacklistSheet = getSheet('BLACKLIST');
          blacklistSheet.appendRow([
            generateId('BL'),
            candidateId,
            values[i][1], // name
            values[i][2], // mobile
            values[i][3], // email
            rejectionReason,
            data._user.id,
            now()
          ]);
        }
      }
      
      candidateSheet.getRange(i + 1, 8).setValue(newStatus);
      candidateSheet.getRange(i + 1, 11).setValue(now());
      
      return { success: true, message: message };
    }
  }
  
  return { success: false, error: 'Candidate not found', code: 'NOT_FOUND' };
}

function getFinalInterviewQueue(data) {
  // Get candidates who passed tests
  const candidates = getCandidates({
    ...data,
    filters: { status: 'TEST_COMPLETED' }
  });
  
  if (!candidates.success) {
    return candidates;
  }
  
  // Enrich with all evaluation data
  const callSheet = getSheet(CONFIG.SHEETS.CALL_LOGS);
  const feedbackSheet = getSheet('PRE_INTERVIEW_FEEDBACK');
  const testSheet = getSheet(CONFIG.SHEETS.TEST_RESULTS);
  
  const callData = callSheet.getDataRange().getValues();
  const feedbackData = feedbackSheet.getDataRange().getValues();
  const testData = testSheet.getDataRange().getValues();
  
  const enrichedCandidates = candidates.data.map(candidate => {
    let callMarks = {};
    let preInterviewMarks = {};
    let testResults = {};
    
    // Get call marks
    for (let i = 1; i < callData.length; i++) {
      if (callData[i][1] === candidate.id) {
        callMarks = {
          communication: callData[i][3],
          experience: callData[i][4]
        };
        break;
      }
    }
    
    // Get pre-interview marks
    for (let i = 1; i < feedbackData.length; i++) {
      if (feedbackData[i][1] === candidate.id) {
        preInterviewMarks = {
          communication: feedbackData[i][2],
          roleFit: feedbackData[i][3],
          overall: feedbackData[i][4]
        };
        break;
      }
    }
    
    // Get test results
    for (let i = 1; i < testData.length; i++) {
      if (testData[i][2] === candidate.id) {
        const testType = testData[i][3];
        testResults[testType] = {
          marks: testData[i][4],
          totalMarks: testData[i][5],
          percentage: testData[i][6],
          passed: testData[i][7]
        };
      }
    }
    
    // Calculate overall score
    const callAvg = (parseFloat(callMarks.communication || 0) + parseFloat(callMarks.experience || 0)) / 2;
    const preInterviewAvg = parseFloat(preInterviewMarks.overall || 0);
    const testAvg = Object.values(testResults).reduce((sum, test) => sum + parseFloat(test.percentage), 0) / Object.keys(testResults).length;
    
    const overallScore = ((callAvg * 10 + preInterviewAvg * 10 + testAvg) / 3).toFixed(1);
    
    return {
      ...candidate,
      callMarks,
      preInterviewMarks,
      testResults,
      overallScore: parseFloat(overallScore),
      strengths: generateStrengths(candidate, callMarks, preInterviewMarks, testResults),
      concerns: generateConcerns(candidate, callMarks, preInterviewMarks, testResults)
    };
  });
  
  // Sort by overall score descending
  enrichedCandidates.sort((a, b) => b.overallScore - a.overallScore);
  
  return { success: true, data: enrichedCandidates };
}

function finalInterviewDecision(data) {
  const { candidateId, decision, designation, department, offeredCTC, probationMonths, expectedJoining, selectionRemarks, sendOfferLetter, holdReason, rejectionReason } = data;
  
  if (!hasPermission(data._user, 'OWNER_DECISION')) {
    return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
  }
  
  const candidateSheet = getSheet(CONFIG.SHEETS.CANDIDATES);
  const values = candidateSheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === candidateId) {
      let newStatus = '';
      let message = '';
      
      if (decision === 'SELECT') {
        newStatus = 'SELECTED';
        message = 'Candidate selected successfully';
        
        // Store selection details
        const selectionSheet = getSheet('SELECTED_CANDIDATES');
        selectionSheet.appendRow([
          generateId('SEL'),
          candidateId,
          designation,
          department,
          offeredCTC,
          probationMonths,
          expectedJoining,
          selectionRemarks,
          'DOCUMENTS_PENDING',
          data._user.id,
          now()
        ]);
        
        // Send offer letter if requested
        if (sendOfferLetter) {
          // Trigger offer letter generation
          // sendOfferLetterEmail(candidateId, values[i]);
        }
        
      } else if (decision === 'HOLD') {
        newStatus = 'HOLD';
        message = 'Candidate on hold';
        
        const holdSheet = getSheet('HOLD_CANDIDATES');
        holdSheet.appendRow([
          generateId('HOLD'),
          candidateId,
          holdReason,
          '',
          data._user.id,
          now()
        ]);
        
      } else if (decision === 'REJECT') {
        newStatus = 'REJECTED';
        message = 'Candidate rejected';
        
        logRejection(candidateId, 'FINAL_INTERVIEW', rejectionReason, data._user);
      }
      
      candidateSheet.getRange(i + 1, 8).setValue(newStatus);
      candidateSheet.getRange(i + 1, 11).setValue(now());
      
      return { success: true, message: message };
    }
  }
  
  return { success: false, error: 'Candidate not found', code: 'NOT_FOUND' };
}

function getCandidateJourney(data) {
  const { candidateId } = data;
  
  // Get candidate details
  const candidateResult = getCandidateDetail({ candidateId });
  if (!candidateResult.success) {
    return candidateResult;
  }
  
  const candidate = candidateResult.data;
  
  // Build timeline from audit log
  const auditSheet = getSheet(CONFIG.SHEETS.AUDIT_LOG);
  const auditData = auditSheet.getDataRange().getValues();
  
  const timeline = [];
  
  for (let i = 1; i < auditData.length; i++) {
    const actionData = auditData[i][2];
    if (actionData && actionData.includes(candidateId)) {
      timeline.push({
        stage: auditData[i][1],
        description: getActionDescription(auditData[i][1]),
        timestamp: auditData[i][4],
        completed: true,
        data: {}
      });
    }
  }
  
  return {
    success: true,
    data: {
      candidate: candidate,
      timeline: timeline
    }
  };
}

function getCandidateCV(data) {
  const { candidateId } = data;
  
  const sheet = getSheet(CONFIG.SHEETS.CANDIDATES);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === candidateId) {
      return {
        success: true,
        data: {
          cvUrl: values[i][6] // Assuming CV URL is in column 7
        }
      };
    }
  }
  
  return { success: false, error: 'Candidate not found', code: 'NOT_FOUND' };
}

function getOwnerDashboardStats(data) {
  // Get various stats
  const ownerQueue = getOwnerQueue(data);
  const finalQueue = getFinalInterviewQueue(data);
  
  const selectedSheet = getSheet('SELECTED_CANDIDATES');
  const selectedData = selectedSheet.getDataRange().getValues();
  
  // Count selected this month
  const thisMonth = new Date().getMonth();
  let selectedThisMonth = 0;
  
  for (let i = 1; i < selectedData.length; i++) {
    const selectedDate = new Date(selectedData[i][10]);
    if (selectedDate.getMonth() === thisMonth) {
      selectedThisMonth++;
    }
  }
  
  // Count onboarding pending
  let onboardingPending = 0;
  for (let i = 1; i < selectedData.length; i++) {
    if (selectedData[i][8] !== 'JOINED') {
      onboardingPending++;
    }
  }
  
  return {
    success: true,
    data: {
      ownerQueueCount: ownerQueue.data ? ownerQueue.data.length : 0,
      finalInterviewCount: finalQueue.data ? finalQueue.data.length : 0,
      selectedThisMonth: selectedThisMonth,
      onboardingPending: onboardingPending
    }
  };
}

// Helper functions
function generateStrengths(candidate, callMarks, preInterviewMarks, testResults) {
  const strengths = [];
  
  if (parseFloat(callMarks.communication) >= 8) {
    strengths.push('Excellent communication skills');
  }
  if (parseFloat(callMarks.experience) >= 8) {
    strengths.push('Strong experience match');
  }
  if (parseFloat(preInterviewMarks.roleFit) >= 8) {
    strengths.push('Perfect role fit');
  }
  
  Object.entries(testResults).forEach(([testName, result]) => {
    if (result.percentage >= 80) {
      strengths.push(`Strong ${testName} skills`);
    }
  });
  
  if (strengths.length === 0) {
    strengths.push('Meets all basic requirements');
  }
  
  return strengths;
}

function generateConcerns(candidate, callMarks, preInterviewMarks, testResults) {
  const concerns = [];
  
  if (parseFloat(callMarks.communication) < 6) {
    concerns.push('Communication needs improvement');
  }
  
  Object.entries(testResults).forEach(([testName, result]) => {
    if (result.percentage < 70) {
      concerns.push(`${testName} score could be better`);
    }
  });
  
  if (concerns.length === 0) {
    concerns.push('No major concerns');
  }
  
  return concerns;
}

function getActionDescription(action) {
  const descriptions = {
    'ADD_CANDIDATE': 'Candidate added to system',
    'SHORTLIST_DECISION': 'Shortlisting decision made',
    'CALL_SCREENING': 'Call screening completed',
    'OWNER_DECISION': 'Owner decision recorded',
    'SCHEDULE_INTERVIEW': 'Interview scheduled',
    'PRE_INTERVIEW_FEEDBACK': 'Pre-interview feedback submitted',
    'SUBMIT_TEST': 'Test completed',
    'FINAL_INTERVIEW_DECISION': 'Final interview decision made'
  };
  
  return descriptions[action] || action;
}
function getTests(data) { return { success: true, data: [] }; }
function generateTestLink(data) { return { success: true }; }
function getTestByToken(data) { return { success: true, data: {} }; }
function submitTest(data) { return { success: true }; }
function getTestResults(data) { return { success: true, data: [] }; }
function getAdminQueue(data) { return { success: true, data: [] }; }
function adminUpdateMarks(data) { return { success: true }; }
function adminResumeCandidate(data) { return { success: true }; }
function adminRevertToHR(data) { return { success: true }; }
function adminRejectCandidate(data) { return { success: true }; }
function getRejectionLog(data) { return { success: true, data: [] }; }
function adminRevertRejection(data) { return { success: true }; }
function getAuditLog(data) { return { success: true, data: [] }; }
function getSelectedCandidates(data) { return { success: true, data: [] }; }
function uploadDocuments(data) { return { success: true }; }
function getCandidateDocuments(data) { return { success: true, data: [] }; }
function verifyDocuments(data) { return { success: true }; }
function setJoiningDate(data) { return { success: true }; }
function confirmJoining(data) { return { success: true }; }
function postponeJoining(data) { return { success: true }; }
function getProbationTracking(data) { return { success: true, data: [] }; }
function confirmEmployee(data) { return { success: true }; }
function getDashboardStats(data) { return { success: true, data: {} }; }
function getRecentActivity(data) { return { success: true, data: [] }; }
function getPendingActions(data) { return { success: true, data: [] }; }
function getNotifications(data) { return { success: true, data: [] }; }
function markNotificationRead(data) { return { success: true }; }
