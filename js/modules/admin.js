/**
 * ============================================
 * HRMS/ATS SYSTEM - ADMIN MODULE
 * Admin panel, marks editing, rejection revert
 * ============================================
 */

const AdminModule = (() => {
    // Module state
    let adminQueue = [];
    let rejectionLog = [];
    let auditLog = [];
    let users = [];
    let permissions = [];

    /**
     * Initialize admin dashboard
     */
    const init = async () => {
        console.log('Initializing Admin Module');
        
        await loadAdminQueue();
        await loadRejectionLog();
        setupEventListeners();
        renderStats();
    };

    /**
     * Initialize admin queue (pre-interview fail, test fail)
     */
    const initQueue = async () => {
        console.log('Initializing Admin Queue');
        
        await loadAdminQueue();
        setupQueueListeners();
    };

    /**
     * Initialize rejection log
     */
    const initRejectionLog = async () => {
        console.log('Initializing Rejection Log');
        
        await loadRejectionLog();
        setupRejectionLogListeners();
    };

    /**
     * Initialize user management
     */
    const initUserManagement = async () => {
        console.log('Initializing User Management');
        
        await loadUsers();
        await loadPermissions();
        setupUserManagementListeners();
    };

    /**
     * Initialize audit log
     */
    const initAuditLog = async () => {
        console.log('Initializing Audit Log');
        
        await loadAuditLog();
        setupAuditLogListeners();
    };

    /**
     * Load admin queue
     */
    const loadAdminQueue = async () => {
        const container = document.getElementById('admin-queue-list');
        if (!container) return;

        try {
            Utils.showLoader('Loading admin queue...');
            
            const response = await API.request('GET_ADMIN_QUEUE', {
                filters: State.get('filters.adminQueue') || {}
            });

            if (response.success) {
                adminQueue = response.data;
                renderAdminQueue(adminQueue);
                updateQueueStats();
            } else {
                Utils.showToast(response.error || 'Failed to load admin queue', 'error');
                container.innerHTML = `<div class="empty-state">
                    <i class="icon-alert"></i>
                    <p>Failed to load admin queue</p>
                </div>`;
            }
        } catch (error) {
            console.error('Error loading admin queue:', error);
            Utils.showToast('Error loading admin queue', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render admin queue
     */
    const renderAdminQueue = (items) => {
        const container = document.getElementById('admin-queue-list');
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <i class="icon-check-circle"></i>
                <p>No items in admin queue</p>
            </div>`;
            return;
        }

        const html = items.map(item => `
            <div class="admin-queue-card" data-id="${item.id}">
                <div class="queue-card-header">
                    <div class="candidate-info">
                        <h3>${Utils.escapeHtml(item.candidateName)}</h3>
                        <span class="requirement-badge">${Utils.escapeHtml(item.requirementTitle)}</span>
                    </div>
                    <span class="status-badge status-${item.queueType.toLowerCase().replace('_', '-')}">
                        ${item.queueType.replace('_', ' ')}
                    </span>
                </div>
                
                <div class="queue-card-body">
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Stage:</label>
                            <span>${item.stage}</span>
                        </div>
                        <div class="info-item">
                            <label>Failed Date:</label>
                            <span>${Utils.formatDate(item.failedAt)}</span>
                        </div>
                        <div class="info-item">
                            <label>Reviewed By:</label>
                            <span>${Utils.escapeHtml(item.reviewedBy)}</span>
                        </div>
                    </div>

                    ${item.queueType === 'PRE_INTERVIEW_FAIL' ? `
                        <div class="marks-section">
                            <h4>HR Marks</h4>
                            <div class="marks-grid">
                                <div class="mark-item">
                                    <label>Communication:</label>
                                    <span class="mark-value ${item.marks.communication < 6 ? 'mark-fail' : 'mark-pass'}">
                                        ${item.marks.communication}/10
                                    </span>
                                </div>
                                <div class="mark-item">
                                    <label>Role Fit:</label>
                                    <span class="mark-value ${item.marks.roleFit < 6 ? 'mark-fail' : 'mark-pass'}">
                                        ${item.marks.roleFit}/10
                                    </span>
                                </div>
                                <div class="mark-item">
                                    <label>Overall:</label>
                                    <span class="mark-value ${item.marks.overall < 6 ? 'mark-fail' : 'mark-pass'}">
                                        ${item.marks.overall}/10
                                    </span>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    ${item.queueType === 'TEST_FAIL' ? `
                        <div class="marks-section">
                            <h4>Test Results</h4>
                            <div class="marks-grid">
                                ${Object.entries(item.testResults).map(([testName, score]) => `
                                    <div class="mark-item">
                                        <label>${testName}:</label>
                                        <span class="mark-value ${score.percentage < 60 ? 'mark-fail' : 'mark-pass'}">
                                            ${score.percentage}%
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="remark-section">
                        <label>Remark:</label>
                        <p>${Utils.escapeHtml(item.remark || 'No remark')}</p>
                    </div>
                </div>

                <div class="queue-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="AdminModule.editMarks('${item.id}')">
                        <i class="icon-edit"></i> Edit Marks
                    </button>
                    <button class="btn btn-success btn-sm" onclick="AdminModule.resumeCandidate('${item.id}')">
                        <i class="icon-check"></i> Resume
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="AdminModule.revertToHR('${item.id}')">
                        <i class="icon-arrow-left"></i> Revert to HR
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="AdminModule.rejectCandidate('${item.id}')">
                        <i class="icon-x"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    };

    /**
     * Edit marks (HR marks or test marks)
     */
    const editMarks = async (queueId) => {
        const item = adminQueue.find(q => q.id === queueId);
        if (!item) return;

        const modal = Utils.createModal({
            title: 'Edit Marks',
            size: 'medium',
            content: `
                <form id="edit-marks-form">
                    <input type="hidden" name="queueId" value="${queueId}">
                    
                    ${item.queueType === 'PRE_INTERVIEW_FAIL' ? `
                        <div class="form-group">
                            <label>Communication (0-10) *</label>
                            <input type="number" name="communication" min="0" max="10" 
                                   value="${item.marks.communication}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Role Fit (0-10) *</label>
                            <input type="number" name="roleFit" min="0" max="10" 
                                   value="${item.marks.roleFit}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Overall (Auto-calculated)</label>
                            <input type="number" name="overall" readonly 
                                   value="${item.marks.overall}">
                        </div>
                    ` : ''}

                    ${item.queueType === 'TEST_FAIL' ? `
                        ${Object.entries(item.testResults).map(([testName, score]) => `
                            <div class="form-group">
                                <label>${testName} Marks (0-100) *</label>
                                <input type="number" name="test_${testName}" min="0" max="100" 
                                       value="${score.marks}" required>
                            </div>
                        `).join('')}
                    ` : ''}
                    
                    <div class="form-group">
                        <label>Admin Remark *</label>
                        <textarea name="adminRemark" rows="3" required 
                                  placeholder="Reason for marks change..."></textarea>
                    </div>
                </form>
            `,
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    onClick: (modal) => modal.close()
                },
                {
                    text: 'Update Marks',
                    class: 'btn-primary',
                    onClick: async (modal) => {
                        const form = document.getElementById('edit-marks-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            queueId: formData.get('queueId'),
                            adminRemark: formData.get('adminRemark'),
                            marks: {}
                        };

                        if (item.queueType === 'PRE_INTERVIEW_FAIL') {
                            const comm = parseFloat(formData.get('communication'));
                            const role = parseFloat(formData.get('roleFit'));
                            data.marks = {
                                communication: comm,
                                roleFit: role,
                                overall: ((comm + role) / 2).toFixed(1)
                            };
                        } else {
                            Object.keys(item.testResults).forEach(testName => {
                                data.marks[testName] = parseFloat(formData.get(`test_${testName}`));
                            });
                        }

                        await updateMarks(data, modal);
                    }
                }
            ]
        });

        // Auto-calculate overall for pre-interview
        if (item.queueType === 'PRE_INTERVIEW_FAIL') {
            const form = document.getElementById('edit-marks-form');
            const commInput = form.querySelector('[name="communication"]');
            const roleInput = form.querySelector('[name="roleFit"]');
            const overallInput = form.querySelector('[name="overall"]');

            const calculate = () => {
                const comm = parseFloat(commInput.value) || 0;
                const role = parseFloat(roleInput.value) || 0;
                overallInput.value = ((comm + role) / 2).toFixed(1);
            };

            commInput.addEventListener('input', calculate);
            roleInput.addEventListener('input', calculate);
        }
    };

    /**
     * Update marks
     */
    const updateMarks = async (data, modal) => {
        try {
            Utils.showLoader('Updating marks...');
            
            const response = await API.request('ADMIN_UPDATE_MARKS', data);

            if (response.success) {
                Utils.showToast('Marks updated successfully', 'success');
                modal.close();
                await loadAdminQueue();
            } else {
                Utils.showToast(response.error || 'Failed to update marks', 'error');
            }
        } catch (error) {
            console.error('Error updating marks:', error);
            Utils.showToast('Error updating marks', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Resume candidate (move back to process)
     */
    const resumeCandidate = async (queueId) => {
        const item = adminQueue.find(q => q.id === queueId);
        if (!item) return;

        const confirmed = await Utils.confirm(
            'Resume Candidate',
            `Are you sure you want to resume ${item.candidateName}? This will move them back to the active process.`
        );

        if (!confirmed) return;

        try {
            Utils.showLoader('Resuming candidate...');
            
            const response = await API.request('ADMIN_RESUME_CANDIDATE', {
                queueId: queueId,
                candidateId: item.candidateId
            });

            if (response.success) {
                Utils.showToast('Candidate resumed successfully', 'success');
                await loadAdminQueue();
            } else {
                Utils.showToast(response.error || 'Failed to resume candidate', 'error');
            }
        } catch (error) {
            console.error('Error resuming candidate:', error);
            Utils.showToast('Error resuming candidate', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Revert to HR
     */
    const revertToHR = async (queueId) => {
        const item = adminQueue.find(q => q.id === queueId);
        if (!item) return;

        const modal = Utils.createModal({
            title: 'Revert to HR',
            content: `
                <form id="revert-hr-form">
                    <input type="hidden" name="queueId" value="${queueId}">
                    
                    <p>Revert ${item.candidateName} back to HR for re-evaluation?</p>
                    
                    <div class="form-group">
                        <label>Remark for HR *</label>
                        <textarea name="remark" rows="3" required 
                                  placeholder="Instructions for HR..."></textarea>
                    </div>
                </form>
            `,
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    onClick: (modal) => modal.close()
                },
                {
                    text: 'Revert to HR',
                    class: 'btn-primary',
                    onClick: async (modal) => {
                        const form = document.getElementById('revert-hr-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            queueId: formData.get('queueId'),
                            remark: formData.get('remark')
                        };

                        await performRevertToHR(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Perform revert to HR
     */
    const performRevertToHR = async (data, modal) => {
        try {
            Utils.showLoader('Reverting to HR...');
            
            const response = await API.request('ADMIN_REVERT_TO_HR', data);

            if (response.success) {
                Utils.showToast('Candidate reverted to HR successfully', 'success');
                modal.close();
                await loadAdminQueue();
            } else {
                Utils.showToast(response.error || 'Failed to revert to HR', 'error');
            }
        } catch (error) {
            console.error('Error reverting to HR:', error);
            Utils.showToast('Error reverting to HR', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Reject candidate from admin queue
     */
    const rejectCandidate = async (queueId) => {
        const item = adminQueue.find(q => q.id === queueId);
        if (!item) return;

        const modal = Utils.createModal({
            title: 'Reject Candidate',
            content: `
                <form id="admin-reject-form">
                    <input type="hidden" name="queueId" value="${queueId}">
                    
                    <div class="alert alert-danger">
                        <i class="icon-alert-triangle"></i>
                        This will permanently reject ${item.candidateName} and move them to rejection log.
                    </div>
                    
                    <div class="form-group">
                        <label>Rejection Reason *</label>
                        <textarea name="rejectionReason" rows="3" required 
                                  placeholder="Detailed reason for rejection..."></textarea>
                    </div>
                </form>
            `,
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    onClick: (modal) => modal.close()
                },
                {
                    text: 'Reject Candidate',
                    class: 'btn-danger',
                    onClick: async (modal) => {
                        const form = document.getElementById('admin-reject-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            queueId: formData.get('queueId'),
                            rejectionReason: formData.get('rejectionReason')
                        };

                        await performRejection(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Perform rejection
     */
    const performRejection = async (data, modal) => {
        try {
            Utils.showLoader('Rejecting candidate...');
            
            const response = await API.request('ADMIN_REJECT_CANDIDATE', data);

            if (response.success) {
                Utils.showToast('Candidate rejected successfully', 'success');
                modal.close();
                await loadAdminQueue();
            } else {
                Utils.showToast(response.error || 'Failed to reject candidate', 'error');
            }
        } catch (error) {
            console.error('Error rejecting candidate:', error);
            Utils.showToast('Error rejecting candidate', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Load rejection log
     */
    const loadRejectionLog = async () => {
        const container = document.getElementById('rejection-log-list');
        if (!container) return;

        try {
            Utils.showLoader('Loading rejection log...');
            
            const response = await API.request('GET_REJECTION_LOG', {
                filters: State.get('filters.rejectionLog') || {}
            });

            if (response.success) {
                rejectionLog = response.data;
                renderRejectionLog(rejectionLog);
            } else {
                Utils.showToast(response.error || 'Failed to load rejection log', 'error');
            }
        } catch (error) {
            console.error('Error loading rejection log:', error);
            Utils.showToast('Error loading rejection log', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render rejection log
     */
    const renderRejectionLog = (logs) => {
        const container = document.getElementById('rejection-log-list');
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <i class="icon-check-circle"></i>
                <p>No rejections logged</p>
            </div>`;
            return;
        }

        const html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Candidate</th>
                        <th>Requirement</th>
                        <th>Stage</th>
                        <th>Rejected By</th>
                        <th>Rejected Date</th>
                        <th>Reason</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(log => `
                        <tr data-id="${log.id}">
                            <td>${Utils.escapeHtml(log.candidateName)}</td>
                            <td>${Utils.escapeHtml(log.requirementTitle)}</td>
                            <td><span class="status-badge status-${log.stage.toLowerCase()}">${log.stage}</span></td>
                            <td>${Utils.escapeHtml(log.rejectedBy)}</td>
                            <td>${Utils.formatDate(log.rejectedAt)}</td>
                            <td>
                                <span class="text-truncate" title="${Utils.escapeHtml(log.reason)}">
                                    ${Utils.escapeHtml(log.reason)}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="AdminModule.viewRejectionDetail('${log.id}')">
                                    <i class="icon-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-success" onclick="AdminModule.revertRejection('${log.id}')">
                                    <i class="icon-rotate-ccw"></i> Revert
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    };

    /**
     * Revert rejection (restore candidate)
     */
    const revertRejection = async (logId) => {
        const log = rejectionLog.find(l => l.id === logId);
        if (!log) return;

        const confirmed = await Utils.confirm(
            'Revert Rejection',
            `Are you sure you want to revert rejection of ${log.candidateName}? This will restore them to ${log.stage} stage.`
        );

        if (!confirmed) return;

        try {
            Utils.showLoader('Reverting rejection...');
            
            const response = await API.request('ADMIN_REVERT_REJECTION', {
                logId: logId,
                candidateId: log.candidateId
            });

            if (response.success) {
                Utils.showToast('Rejection reverted successfully', 'success');
                await loadRejectionLog();
            } else {
                Utils.showToast(response.error || 'Failed to revert rejection', 'error');
            }
        } catch (error) {
            console.error('Error reverting rejection:', error);
            Utils.showToast('Error reverting rejection', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * View rejection detail
     */
    const viewRejectionDetail = (logId) => {
        const log = rejectionLog.find(l => l.id === logId);
        if (!log) return;

        Utils.createModal({
            title: 'Rejection Details',
            size: 'large',
            content: `
                <div class="detail-view">
                    <div class="detail-section">
                        <h3>Candidate Information</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Name:</label>
                                <span>${Utils.escapeHtml(log.candidateName)}</span>
                            </div>
                            <div class="info-item">
                                <label>Mobile:</label>
                                <span>${Utils.escapeHtml(log.candidateMobile)}</span>
                            </div>
                            <div class="info-item">
                                <label>Email:</label>
                                <span>${Utils.escapeHtml(log.candidateEmail)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Rejection Details</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Stage:</label>
                                <span class="status-badge status-${log.stage.toLowerCase()}">${log.stage}</span>
                            </div>
                            <div class="info-item">
                                <label>Rejected By:</label>
                                <span>${Utils.escapeHtml(log.rejectedBy)}</span>
                            </div>
                            <div class="info-item">
                                <label>Rejected Date:</label>
                                <span>${Utils.formatDate(log.rejectedAt)}</span>
                            </div>
                            <div class="info-item full-width">
                                <label>Reason:</label>
                                <p>${Utils.escapeHtml(log.reason)}</p>
                            </div>
                        </div>
                    </div>

                    ${log.timeline ? `
                        <div class="detail-section">
                            <h3>Candidate Timeline</h3>
                            <div class="timeline">
                                ${log.timeline.map(event => `
                                    <div class="timeline-item">
                                        <div class="timeline-marker"></div>
                                        <div class="timeline-content">
                                            <div class="timeline-header">
                                                <strong>${event.action}</strong>
                                                <span class="timeline-date">${Utils.formatDate(event.timestamp)}</span>
                                            </div>
                                            <p>${Utils.escapeHtml(event.remark || '')}</p>
                                            <small>By ${Utils.escapeHtml(event.user)}</small>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `,
            buttons: [
                {
                    text: 'Close',
                    class: 'btn-secondary',
                    onClick: (modal) => modal.close()
                }
            ]
        });
    };

    /**
     * Update queue stats
     */
    const updateQueueStats = () => {
        const preInterviewCount = adminQueue.filter(q => q.queueType === 'PRE_INTERVIEW_FAIL').length;
        const testFailCount = adminQueue.filter(q => q.queueType === 'TEST_FAIL').length;

        const statsContainer = document.getElementById('admin-queue-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <h3>${preInterviewCount}</h3>
                    <p>Pre-Interview Failed</p>
                </div>
                <div class="stat-card">
                    <h3>${testFailCount}</h3>
                    <p>Test Failed</p>
                </div>
                <div class="stat-card">
                    <h3>${adminQueue.length}</h3>
                    <p>Total in Queue</p>
                </div>
            `;
        }
    };

    /**
     * Render stats
     */
    const renderStats = () => {
        // Implement dashboard stats rendering
        console.log('Rendering admin stats');
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Filter buttons
        const filterBtn = document.getElementById('admin-filter-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', showFilterModal);
        }

        // Refresh button
        const refreshBtn = document.getElementById('admin-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadAdminQueue();
                loadRejectionLog();
            });
        }
    };

    const setupQueueListeners = () => {
        setupEventListeners();
    };

    const setupRejectionLogListeners = () => {
        // Filter buttons
        const filterBtn = document.getElementById('rejection-log-filter-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', showRejectionLogFilterModal);
        }
    };

    const setupUserManagementListeners = () => {
        // Add user button
        const addUserBtn = document.getElementById('add-user-btn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', showAddUserModal);
        }
    };

    const setupAuditLogListeners = () => {
        // Audit log filters
    };

    /**
     * Show filter modal
     */
    const showFilterModal = () => {
        // Implement filter modal
        console.log('Show admin filter modal');
    };

    const showRejectionLogFilterModal = () => {
        // Implement rejection log filter modal
        console.log('Show rejection log filter modal');
    };

    const showAddUserModal = () => {
        // Implement add user modal
        console.log('Show add user modal');
    };

    // Public API
    return {
        init,
        initQueue,
        initRejectionLog,
        initUserManagement,
        initAuditLog,
        editMarks,
        resumeCandidate,
        revertToHR,
        rejectCandidate,
        revertRejection,
        viewRejectionDetail
    };
})();
