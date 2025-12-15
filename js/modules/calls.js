/**
 * ============================================
 * HRMS/ATS SYSTEM - CALLS MODULE
 * Call screening and logging
 * ============================================
 */

const CallsModule = (() => {
    // Module state
    let callLogs = [];
    let pendingCalls = [];

    /**
     * Initialize calls module
     */
    const init = async () => {
        console.log('Initializing Calls Module');
        
        await loadPendingCalls();
        await loadCallLogs();
        setupEventListeners();
    };

    /**
     * Load pending calls (candidates in ON_CALL status)
     */
    const loadPendingCalls = async () => {
        try {
            const result = await API.candidates.getAll({ status: 'ON_CALL' });
            
            if (result.success) {
                pendingCalls = result.data || [];
                renderPendingCalls();
            }
        } catch (error) {
            console.error('Error loading pending calls:', error);
        }
    };

    /**
     * Load call logs
     */
    const loadCallLogs = async () => {
        try {
            const result = await API.calls.getAllLogs();
            
            if (result.success) {
                callLogs = result.data || [];
                renderCallLogs();
            }
        } catch (error) {
            console.error('Error loading call logs:', error);
        }
    };

    /**
     * Render pending calls
     */
    const renderPendingCalls = () => {
        const container = document.getElementById('pending-calls');
        if (!container) return;
        
        if (pendingCalls.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📞</div>
                    <h3 class="empty-state-title">No Pending Calls</h3>
                    <p class="empty-state-description">All candidates have been screened.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Pending Calls (${pendingCalls.length})</h3>
                </div>
                <div class="card-body p-0">
                    <div class="list-view">
                        ${pendingCalls.map(c => `
                            <div class="list-item">
                                <div class="avatar avatar-md">${c.name.charAt(0)}</div>
                                <div class="list-item-main">
                                    <div class="list-item-title">${c.name}</div>
                                    <div class="list-item-meta">
                                        <span>📱 ${c.mobile}</span>
                                        <span>💼 ${c.jobRole}</span>
                                    </div>
                                </div>
                                <div class="list-item-actions">
                                    <button class="btn btn-primary btn-sm" onclick="CallsModule.openCallModal('${c.id}')">
                                        📞 Call Now
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * Render call logs
     */
    const renderCallLogs = () => {
        const container = document.getElementById('call-logs');
        if (!container) return;
        
        if (callLogs.length === 0) {
            container.innerHTML = '<p class="text-muted p-4">No call logs yet</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Recent Call Logs</h3>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Status</th>
                                <th>Duration</th>
                                <th>Score</th>
                                <th>Called By</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${callLogs.map(log => `
                                <tr>
                                    <td>
                                        <div class="cell-avatar">
                                            <div class="cell-avatar-img">${log.candidateName?.charAt(0) || '?'}</div>
                                            <div class="cell-avatar-info">
                                                <div class="cell-avatar-name">${log.candidateName}</div>
                                                <div class="cell-avatar-meta">${log.mobile}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${getCallStatusBadge(log.status)}</td>
                                    <td>${log.duration || '-'}</td>
                                    <td>${log.score ? `${log.score}/10` : '-'}</td>
                                    <td>${log.calledBy}</td>
                                    <td class="cell-date">${Utils.formatDate(log.timestamp, 'DD MMM, HH:mm')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    /**
     * Get call status badge
     */
    const getCallStatusBadge = (status) => {
        const badges = {
            'NO_ANSWER': '<span class="badge badge-warning">No Answer</span>',
            'NOT_REACHABLE': '<span class="badge badge-secondary">Not Reachable</span>',
            'REJECTED': '<span class="badge badge-danger">Rejected</span>',
            'CALL_DONE': '<span class="badge badge-success">Call Done</span>'
        };
        return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
    };

    /**
     * Open call modal
     */
    const openCallModal = (candidateId) => {
        const candidate = pendingCalls.find(c => c.id === candidateId);
        if (!candidate) {
            Utils.toast('Candidate not found', 'error');
            return;
        }
        
        const modalHTML = `
            <div id="call-modal" class="modal-backdrop active">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3>📞 Call Screening: ${candidate.name}</h3>
                        <button class="modal-close" onclick="CallsModule.closeCallModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-4">
                            <div class="alert alert-info">
                                <p><strong>Mobile:</strong> ${candidate.mobile}</p>
                                <p><strong>Job Role:</strong> ${candidate.jobRole}</p>
                            </div>
                        </div>
                        
                        <form id="call-screening-form">
                            <input type="hidden" name="candidateId" value="${candidateId}">
                            
                            <div class="form-group">
                                <label class="form-label form-label-required">Call Status</label>
                                <div class="grid grid-cols-4 gap-3">
                                    ${CONFIG.CALL_OPTIONS.map(opt => `
                                        <label class="call-option">
                                            <input type="radio" name="callStatus" value="${opt.id}" required>
                                            <div class="call-option-content">
                                                <span class="call-option-icon">${opt.icon}</span>
                                                <span class="call-option-label">${opt.label}</span>
                                            </div>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div id="call-done-fields" class="hidden">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Communication Score (0-10)</label>
                                        <input type="range" name="communicationScore" class="form-range" 
                                               min="0" max="10" value="5" 
                                               oninput="document.getElementById('comm-score-display').textContent = this.value">
                                        <div class="range-labels">
                                            <span>0</span>
                                            <span id="comm-score-display">5</span>
                                            <span>10</span>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Experience Score (0-10)</label>
                                        <input type="range" name="experienceScore" class="form-range" 
                                               min="0" max="10" value="5"
                                               oninput="document.getElementById('exp-score-display').textContent = this.value">
                                        <div class="range-labels">
                                            <span>0</span>
                                            <span id="exp-score-display">5</span>
                                            <span>10</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Key Points Discussed</label>
                                    <textarea name="notes" class="form-textarea" placeholder="Enter key discussion points..."></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Recommend for Interview?</label>
                                    <div class="form-check-group-inline">
                                        <label class="form-check">
                                            <input type="radio" name="recommend" value="yes" class="form-check-input">
                                            <span class="form-check-label">Yes, Recommend</span>
                                        </label>
                                        <label class="form-check">
                                            <input type="radio" name="recommend" value="no" class="form-check-input">
                                            <span class="form-check-label">No, Not Recommended</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="rejection-reason-field" class="hidden">
                                <div class="form-group">
                                    <label class="form-label form-label-required">Rejection Reason</label>
                                    <textarea name="rejectionReason" class="form-textarea" 
                                              placeholder="Enter reason for rejection..."></textarea>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="CallsModule.closeCallModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="CallsModule.submitCallScreening()">
                            Submit Call Log
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup call status change listener
        document.querySelectorAll('input[name="callStatus"]').forEach(radio => {
            radio.addEventListener('change', handleCallStatusChange);
        });
    };

    /**
     * Handle call status change
     */
    const handleCallStatusChange = (e) => {
        const status = e.target.value;
        const callDoneFields = document.getElementById('call-done-fields');
        const rejectionField = document.getElementById('rejection-reason-field');
        
        // Hide all conditional fields first
        callDoneFields?.classList.add('hidden');
        rejectionField?.classList.add('hidden');
        
        // Show relevant fields
        if (status === 'CALL_DONE') {
            callDoneFields?.classList.remove('hidden');
        } else if (status === 'REJECTED') {
            rejectionField?.classList.remove('hidden');
        }
    };

    /**
     * Close call modal
     */
    const closeCallModal = () => {
        document.getElementById('call-modal')?.remove();
    };

    /**
     * Submit call screening
     */
    const submitCallScreening = async () => {
        const form = document.getElementById('call-screening-form');
        if (!form) return;
        
        const formData = Utils.getFormData(form);
        
        // Validate
        if (!formData.callStatus) {
            Utils.toast('Please select a call status', 'warning');
            return;
        }
        
        if (formData.callStatus === 'REJECTED' && !formData.rejectionReason?.trim()) {
            Utils.toast('Please provide rejection reason', 'warning');
            return;
        }
        
        if (formData.callStatus === 'CALL_DONE' && !formData.recommend) {
            Utils.toast('Please select recommendation', 'warning');
            return;
        }
        
        try {
            Utils.showLoader('Submitting call log...');
            
            const callData = {
                communicationScore: parseInt(formData.communicationScore) || 0,
                experienceScore: parseInt(formData.experienceScore) || 0,
                notes: formData.notes || '',
                recommend: formData.recommend === 'yes',
                rejectionReason: formData.rejectionReason || ''
            };
            
            const result = await API.calls.log(formData.candidateId, formData.callStatus, callData);
            
            if (result.success) {
                Utils.toast('Call log submitted!', 'success');
                closeCallModal();
                
                // Refresh data
                loadPendingCalls();
                loadCallLogs();
            } else {
                Utils.toast(result.error || 'Failed to submit call log', 'error');
            }
        } catch (error) {
            console.error('Submit call log error:', error);
            Utils.toast('Error submitting call log', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Quick call action (for list view)
     */
    const quickCallAction = async (candidateId, status) => {
        try {
            Utils.showLoader('Updating...');
            
            const result = await API.calls.log(candidateId, status, {});
            
            if (result.success) {
                Utils.toast(`Marked as ${status.replace('_', ' ')}`, 'info');
                loadPendingCalls();
            } else {
                Utils.toast(result.error || 'Action failed', 'error');
            }
        } catch (error) {
            console.error('Quick call action error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Any global event listeners for calls module
    };

    // Public interface
    return {
        init,
        loadPendingCalls,
        loadCallLogs,
        openCallModal,
        closeCallModal,
        submitCallScreening,
        quickCallAction
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CallsModule;
}
