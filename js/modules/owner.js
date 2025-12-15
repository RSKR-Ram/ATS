/**
 * ============================================
 * HRMS/ATS SYSTEM - OWNER MODULE
 * Owner decision queue, final interview, strategic view
 * ============================================
 */

const OwnerModule = (() => {
    // Module state
    let ownerQueue = [];
    let finalInterviewQueue = [];
    let selectedCandidates = [];
    let dashboardStats = {};

    /**
     * Initialize owner dashboard
     */
    const init = async () => {
        console.log('Initializing Owner Module');
        
        await loadOwnerQueue();
        await loadFinalInterviewQueue();
        await loadDashboardStats();
        setupEventListeners();
        renderDashboard();
    };

    /**
     * Initialize owner queue (post call screening)
     */
    const initOwnerQueue = async () => {
        console.log('Initializing Owner Queue');
        
        await loadOwnerQueue();
        setupOwnerQueueListeners();
    };

    /**
     * Initialize final interview queue (post tests)
     */
    const initFinalInterviewQueue = async () => {
        console.log('Initializing Final Interview Queue');
        
        await loadFinalInterviewQueue();
        setupFinalInterviewListeners();
    };

    /**
     * Initialize candidate journey view
     */
    const initCandidateJourney = async (candidateId) => {
        console.log('Initializing Candidate Journey:', candidateId);
        
        await loadCandidateJourney(candidateId);
        setupJourneyListeners();
    };

    /**
     * Load owner queue (candidates after call screening)
     */
    const loadOwnerQueue = async () => {
        const container = document.getElementById('owner-queue-list');
        if (!container) return;

        try {
            Utils.showLoader('Loading owner queue...');
            
            const response = await API.request('GET_OWNER_QUEUE', {
                filters: State.get('filters.ownerQueue') || {}
            });

            if (response.success) {
                ownerQueue = response.data;
                renderOwnerQueue(ownerQueue);
                updateOwnerQueueStats();
            } else {
                Utils.showToast(response.error || 'Failed to load owner queue', 'error');
                container.innerHTML = `<div class="empty-state">
                    <i class="icon-alert"></i>
                    <p>Failed to load owner queue</p>
                </div>`;
            }
        } catch (error) {
            console.error('Error loading owner queue:', error);
            Utils.showToast('Error loading owner queue', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render owner queue
     */
    const renderOwnerQueue = (queue) => {
        const container = document.getElementById('owner-queue-list');
        if (!container) return;

        if (!queue || queue.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <i class="icon-check-circle"></i>
                <p>No candidates in owner queue</p>
            </div>`;
            return;
        }

        const html = queue.map(candidate => `
            <div class="owner-queue-card" data-id="${candidate.id}">
                <div class="card-header">
                    <div class="candidate-info">
                        <h3>${Utils.escapeHtml(candidate.name)}</h3>
                        <div class="candidate-meta">
                            <span class="requirement-badge">${Utils.escapeHtml(candidate.requirementTitle)}</span>
                            <span class="source-badge">${Utils.escapeHtml(candidate.source)}</span>
                        </div>
                    </div>
                    <span class="priority-badge priority-${candidate.priority || 'medium'}">
                        ${candidate.priority || 'Medium'} Priority
                    </span>
                </div>

                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Mobile:</label>
                            <span>${Utils.escapeHtml(candidate.mobile)}</span>
                        </div>
                        <div class="info-item">
                            <label>Email:</label>
                            <span>${Utils.escapeHtml(candidate.email)}</span>
                        </div>
                        <div class="info-item">
                            <label>Experience:</label>
                            <span>${candidate.experience} years</span>
                        </div>
                        <div class="info-item">
                            <label>Current CTC:</label>
                            <span>₹${Utils.formatNumber(candidate.currentCTC)}</span>
                        </div>
                        <div class="info-item">
                            <label>Expected CTC:</label>
                            <span>₹${Utils.formatNumber(candidate.expectedCTC)}</span>
                        </div>
                        <div class="info-item">
                            <label>Notice Period:</label>
                            <span>${candidate.noticePeriod}</span>
                        </div>
                    </div>

                    <!-- Call Screening Results -->
                    <div class="call-screening-summary">
                        <h4>Call Screening Summary</h4>
                        <div class="marks-grid">
                            <div class="mark-item">
                                <label>Communication:</label>
                                <div class="mark-bar">
                                    <div class="mark-fill" style="width: ${candidate.callMarks.communication * 10}%"></div>
                                    <span class="mark-value">${candidate.callMarks.communication}/10</span>
                                </div>
                            </div>
                            <div class="mark-item">
                                <label>Experience Match:</label>
                                <div class="mark-bar">
                                    <div class="mark-fill" style="width: ${candidate.callMarks.experience * 10}%"></div>
                                    <span class="mark-value">${candidate.callMarks.experience}/10</span>
                                </div>
                            </div>
                            <div class="mark-item">
                                <label>HR Recommendation:</label>
                                <span class="badge ${candidate.callMarks.recommend ? 'badge-success' : 'badge-warning'}">
                                    ${candidate.callMarks.recommend ? 'Recommended' : 'Not Recommended'}
                                </span>
                            </div>
                        </div>
                        <div class="hr-remark">
                            <label>HR Remark:</label>
                            <p>${Utils.escapeHtml(candidate.callMarks.remark || 'No remark')}</p>
                        </div>
                    </div>

                    <!-- Key Highlights -->
                    <div class="highlights-section">
                        <h4>Key Highlights</h4>
                        <ul class="highlights-list">
                            ${candidate.highlights ? candidate.highlights.map(h => `
                                <li><i class="icon-check"></i> ${Utils.escapeHtml(h)}</li>
                            `).join('') : '<li>No highlights available</li>'}
                        </ul>
                    </div>

                    <!-- Timeline -->
                    <div class="timeline-summary">
                        <small class="text-muted">
                            Added: ${Utils.formatDate(candidate.createdAt)} | 
                            Call Screened: ${Utils.formatDate(candidate.callScreenedAt)} | 
                            Waiting: ${Utils.daysBetween(new Date(candidate.callScreenedAt), new Date())} days
                        </small>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="OwnerModule.viewCandidateDetail('${candidate.id}')">
                        <i class="icon-eye"></i> View Details
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="OwnerModule.viewCV('${candidate.id}')">
                        <i class="icon-file-text"></i> View CV
                    </button>
                    <button class="btn btn-success btn-sm" onclick="OwnerModule.approveForInterview('${candidate.id}')">
                        <i class="icon-check"></i> Approve for Walk-in
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="OwnerModule.holdCandidate('${candidate.id}')">
                        <i class="icon-pause"></i> Hold
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="OwnerModule.rejectCandidate('${candidate.id}')">
                        <i class="icon-x"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    };

    /**
     * Approve candidate for interview
     */
    const approveForInterview = async (candidateId) => {
        const candidate = ownerQueue.find(c => c.id === candidateId);
        if (!candidate) return;

        const modal = Utils.createModal({
            title: 'Approve for Walk-in Interview',
            content: `
                <form id="owner-approve-form">
                    <input type="hidden" name="candidateId" value="${candidateId}">
                    
                    <div class="candidate-summary">
                        <h4>${Utils.escapeHtml(candidate.name)}</h4>
                        <p>${Utils.escapeHtml(candidate.requirementTitle)}</p>
                    </div>

                    <div class="form-group">
                        <label>Priority *</label>
                        <select name="priority" required>
                            <option value="high">High - Schedule within 2 days</option>
                            <option value="medium" selected>Medium - Schedule within 1 week</option>
                            <option value="low">Low - Schedule as per availability</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Interview Type *</label>
                        <select name="interviewType" required>
                            <option value="walk-in">Walk-in (Visit office)</option>
                            <option value="scheduled">Scheduled Interview</option>
                            <option value="virtual">Virtual Interview</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Owner Remarks</label>
                        <textarea name="ownerRemarks" rows="3" 
                                  placeholder="Any special instructions or notes..."></textarea>
                    </div>

                    <div class="alert alert-info">
                        <i class="icon-info"></i>
                        HR will schedule the interview based on your priority and type selection.
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
                    text: 'Approve for Interview',
                    class: 'btn-success',
                    onClick: async (modal) => {
                        const form = document.getElementById('owner-approve-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            candidateId: formData.get('candidateId'),
                            decision: 'APPROVE',
                            priority: formData.get('priority'),
                            interviewType: formData.get('interviewType'),
                            ownerRemarks: formData.get('ownerRemarks')
                        };

                        await performOwnerDecision(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Hold candidate
     */
    const holdCandidate = async (candidateId) => {
        const candidate = ownerQueue.find(c => c.id === candidateId);
        if (!candidate) return;

        const modal = Utils.createModal({
            title: 'Hold Candidate',
            content: `
                <form id="owner-hold-form">
                    <input type="hidden" name="candidateId" value="${candidateId}">
                    
                    <p>Hold ${candidate.name} for future consideration?</p>

                    <div class="form-group">
                        <label>Hold Reason *</label>
                        <select name="holdReason" required>
                            <option value="">Select reason</option>
                            <option value="budget">Budget constraints</option>
                            <option value="position_filled">Position may be filled</option>
                            <option value="timing">Wrong timing</option>
                            <option value="review_later">Review later</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Expected Review Date</label>
                        <input type="date" name="reviewDate" 
                               min="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label>Remarks *</label>
                        <textarea name="remarks" rows="3" required 
                                  placeholder="Reason for holding..."></textarea>
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
                    text: 'Hold Candidate',
                    class: 'btn-warning',
                    onClick: async (modal) => {
                        const form = document.getElementById('owner-hold-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            candidateId: formData.get('candidateId'),
                            decision: 'HOLD',
                            holdReason: formData.get('holdReason'),
                            reviewDate: formData.get('reviewDate'),
                            remarks: formData.get('remarks')
                        };

                        await performOwnerDecision(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Reject candidate
     */
    const rejectCandidate = async (candidateId) => {
        const candidate = ownerQueue.find(c => c.id === candidateId);
        if (!candidate) return;

        const modal = Utils.createModal({
            title: 'Reject Candidate',
            content: `
                <form id="owner-reject-form">
                    <input type="hidden" name="candidateId" value="${candidateId}">
                    
                    <div class="alert alert-danger">
                        <i class="icon-alert-triangle"></i>
                        This will reject ${candidate.name} and move them to rejection log.
                    </div>

                    <div class="form-group">
                        <label>Rejection Reason *</label>
                        <select name="rejectionReason" required>
                            <option value="">Select reason</option>
                            <option value="overqualified">Overqualified</option>
                            <option value="underqualified">Underqualified</option>
                            <option value="salary_mismatch">Salary expectations too high</option>
                            <option value="notice_period">Notice period too long</option>
                            <option value="attitude">Attitude concerns</option>
                            <option value="location">Location constraint</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Detailed Remarks *</label>
                        <textarea name="remarks" rows="4" required 
                                  placeholder="Detailed reason for rejection..."></textarea>
                    </div>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="blacklist">
                            Blacklist candidate (won't appear in future)
                        </label>
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
                        const form = document.getElementById('owner-reject-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            candidateId: formData.get('candidateId'),
                            decision: 'REJECT',
                            rejectionReason: formData.get('rejectionReason'),
                            remarks: formData.get('remarks'),
                            blacklist: formData.get('blacklist') === 'on'
                        };

                        await performOwnerDecision(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Perform owner decision
     */
    const performOwnerDecision = async (data, modal) => {
        try {
            Utils.showLoader('Processing decision...');
            
            const response = await API.request('OWNER_DECISION', data);

            if (response.success) {
                Utils.showToast(response.message || 'Decision recorded successfully', 'success');
                modal.close();
                await loadOwnerQueue();
            } else {
                Utils.showToast(response.error || 'Failed to process decision', 'error');
            }
        } catch (error) {
            console.error('Error processing owner decision:', error);
            Utils.showToast('Error processing decision', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Load final interview queue (post tests)
     */
    const loadFinalInterviewQueue = async () => {
        const container = document.getElementById('final-interview-list');
        if (!container) return;

        try {
            Utils.showLoader('Loading final interview queue...');
            
            const response = await API.request('GET_FINAL_INTERVIEW_QUEUE', {
                filters: State.get('filters.finalInterview') || {}
            });

            if (response.success) {
                finalInterviewQueue = response.data;
                renderFinalInterviewQueue(finalInterviewQueue);
            } else {
                Utils.showToast(response.error || 'Failed to load final interview queue', 'error');
            }
        } catch (error) {
            console.error('Error loading final interview queue:', error);
            Utils.showToast('Error loading final interview queue', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render final interview queue
     */
    const renderFinalInterviewQueue = (queue) => {
        const container = document.getElementById('final-interview-list');
        if (!container) return;

        if (!queue || queue.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <i class="icon-users"></i>
                <p>No candidates ready for final interview</p>
            </div>`;
            return;
        }

        const html = queue.map(candidate => `
            <div class="final-interview-card" data-id="${candidate.id}">
                <div class="card-header">
                    <div class="candidate-info">
                        <h3>${Utils.escapeHtml(candidate.name)}</h3>
                        <span class="requirement-badge">${Utils.escapeHtml(candidate.requirementTitle)}</span>
                    </div>
                    <span class="status-badge status-${candidate.overallStatus}">
                        ${candidate.overallScore >= 80 ? 'Excellent' : candidate.overallScore >= 60 ? 'Good' : 'Average'}
                    </span>
                </div>

                <div class="card-body">
                    <!-- Complete Score Summary -->
                    <div class="score-summary">
                        <h4>Complete Evaluation Summary</h4>
                        
                        <!-- Call Screening -->
                        <div class="evaluation-section">
                            <h5>Call Screening</h5>
                            <div class="marks-compact">
                                <span>Communication: ${candidate.callMarks.communication}/10</span>
                                <span>Experience: ${candidate.callMarks.experience}/10</span>
                            </div>
                        </div>

                        <!-- Pre-Interview Feedback -->
                        <div class="evaluation-section">
                            <h5>Pre-Interview Feedback</h5>
                            <div class="marks-compact">
                                <span>Communication: ${candidate.preInterviewMarks.communication}/10</span>
                                <span>Role Fit: ${candidate.preInterviewMarks.roleFit}/10</span>
                                <span>Overall: ${candidate.preInterviewMarks.overall}/10</span>
                            </div>
                        </div>

                        <!-- Test Results -->
                        <div class="evaluation-section">
                            <h5>Test Results</h5>
                            <div class="test-results-grid">
                                ${Object.entries(candidate.testResults).map(([testName, result]) => `
                                    <div class="test-result-item">
                                        <label>${testName}:</label>
                                        <span class="test-score ${result.passed ? 'passed' : 'failed'}">
                                            ${result.percentage}% (${result.marks}/${result.totalMarks})
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Overall Score -->
                        <div class="overall-score">
                            <h5>Overall Score</h5>
                            <div class="score-circle">
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#eee" stroke-width="10"/>
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#4ade80" stroke-width="10"
                                            stroke-dasharray="${candidate.overallScore * 2.83} 283"
                                            transform="rotate(-90 50 50)"/>
                                </svg>
                                <div class="score-text">${candidate.overallScore}%</div>
                            </div>
                        </div>
                    </div>

                    <!-- Key Strengths & Weaknesses -->
                    <div class="swot-section">
                        <div class="strengths">
                            <h5><i class="icon-check-circle"></i> Strengths</h5>
                            <ul>
                                ${candidate.strengths.map(s => `<li>${Utils.escapeHtml(s)}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="concerns">
                            <h5><i class="icon-alert-circle"></i> Concerns</h5>
                            <ul>
                                ${candidate.concerns.map(c => `<li>${Utils.escapeHtml(c)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="OwnerModule.viewCompleteJourney('${candidate.id}')">
                        <i class="icon-map"></i> Complete Journey
                    </button>
                    <button class="btn btn-success btn-sm" onclick="OwnerModule.selectCandidate('${candidate.id}')">
                        <i class="icon-user-check"></i> Select
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="OwnerModule.holdFinalCandidate('${candidate.id}')">
                        <i class="icon-pause"></i> Hold
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="OwnerModule.rejectFinalCandidate('${candidate.id}')">
                        <i class="icon-x"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    };

    /**
     * Select candidate (final selection)
     */
    const selectCandidate = async (candidateId) => {
        const candidate = finalInterviewQueue.find(c => c.id === candidateId);
        if (!candidate) return;

        const modal = Utils.createModal({
            title: 'Select Candidate',
            size: 'large',
            content: `
                <form id="final-select-form">
                    <input type="hidden" name="candidateId" value="${candidateId}">
                    
                    <div class="alert alert-success">
                        <i class="icon-check-circle"></i>
                        <strong>Congratulations!</strong> You are about to select ${candidate.name} for ${candidate.requirementTitle}.
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Offered Designation *</label>
                            <input type="text" name="designation" required 
                                   value="${Utils.escapeHtml(candidate.requirementTitle)}">
                        </div>
                        <div class="form-group">
                            <label>Department *</label>
                            <input type="text" name="department" required 
                                   value="${Utils.escapeHtml(candidate.department)}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Offered CTC (Annual) *</label>
                            <input type="number" name="offeredCTC" required 
                                   value="${candidate.expectedCTC}"
                                   placeholder="₹">
                        </div>
                        <div class="form-group">
                            <label>Probation Period *</label>
                            <select name="probationMonths" required>
                                <option value="3">3 Months</option>
                                <option value="6" selected>6 Months</option>
                                <option value="12">12 Months</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Expected Joining Date *</label>
                        <input type="date" name="expectedJoining" required 
                               min="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label>Selection Remarks</label>
                        <textarea name="selectionRemarks" rows="3" 
                                  placeholder="Any special terms or conditions..."></textarea>
                    </div>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="sendOfferLetter" checked>
                            Send offer letter immediately
                        </label>
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
                    text: 'Select Candidate',
                    class: 'btn-success',
                    onClick: async (modal) => {
                        const form = document.getElementById('final-select-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            candidateId: formData.get('candidateId'),
                            decision: 'SELECT',
                            designation: formData.get('designation'),
                            department: formData.get('department'),
                            offeredCTC: parseFloat(formData.get('offeredCTC')),
                            probationMonths: parseInt(formData.get('probationMonths')),
                            expectedJoining: formData.get('expectedJoining'),
                            selectionRemarks: formData.get('selectionRemarks'),
                            sendOfferLetter: formData.get('sendOfferLetter') === 'on'
                        };

                        await performFinalDecision(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Hold final candidate
     */
    const holdFinalCandidate = async (candidateId) => {
        const candidate = finalInterviewQueue.find(c => c.id === candidateId);
        if (!candidate) return;

        const modal = Utils.createModal({
            title: 'Hold Candidate',
            content: `
                <form id="final-hold-form">
                    <input type="hidden" name="candidateId" value="${candidateId}">
                    
                    <p>Hold ${candidate.name} in waitlist?</p>

                    <div class="form-group">
                        <label>Hold Reason *</label>
                        <textarea name="holdReason" rows="3" required 
                                  placeholder="Reason for holding..."></textarea>
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
                    text: 'Hold',
                    class: 'btn-warning',
                    onClick: async (modal) => {
                        const form = document.getElementById('final-hold-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            candidateId: formData.get('candidateId'),
                            decision: 'HOLD',
                            holdReason: formData.get('holdReason')
                        };

                        await performFinalDecision(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Reject final candidate
     */
    const rejectFinalCandidate = async (candidateId) => {
        const candidate = finalInterviewQueue.find(c => c.id === candidateId);
        if (!candidate) return;

        const modal = Utils.createModal({
            title: 'Reject Candidate',
            content: `
                <form id="final-reject-form">
                    <input type="hidden" name="candidateId" value="${candidateId}">
                    
                    <div class="alert alert-danger">
                        <i class="icon-alert-triangle"></i>
                        This will permanently reject ${candidate.name}.
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
                    text: 'Reject',
                    class: 'btn-danger',
                    onClick: async (modal) => {
                        const form = document.getElementById('final-reject-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            candidateId: formData.get('candidateId'),
                            decision: 'REJECT',
                            rejectionReason: formData.get('rejectionReason')
                        };

                        await performFinalDecision(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Perform final decision
     */
    const performFinalDecision = async (data, modal) => {
        try {
            Utils.showLoader('Processing decision...');
            
            const response = await API.request('FINAL_INTERVIEW_DECISION', data);

            if (response.success) {
                Utils.showToast(response.message || 'Decision recorded successfully', 'success');
                modal.close();
                await loadFinalInterviewQueue();
            } else {
                Utils.showToast(response.error || 'Failed to process decision', 'error');
            }
        } catch (error) {
            console.error('Error processing final decision:', error);
            Utils.showToast('Error processing decision', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * View candidate detail
     */
    const viewCandidateDetail = (candidateId) => {
        UIRouter.navigateTo(`candidate-detail.html?id=${candidateId}`);
    };

    /**
     * View CV
     */
    const viewCV = async (candidateId) => {
        try {
            const response = await API.request('GET_CANDIDATE_CV', { candidateId });
            if (response.success && response.data.cvUrl) {
                window.open(response.data.cvUrl, '_blank');
            } else {
                Utils.showToast('CV not available', 'error');
            }
        } catch (error) {
            console.error('Error viewing CV:', error);
            Utils.showToast('Error viewing CV', 'error');
        }
    };

    /**
     * View complete candidate journey
     */
    const viewCompleteJourney = (candidateId) => {
        UIRouter.navigateTo(`candidate-journey.html?id=${candidateId}`);
    };

    /**
     * Load candidate journey
     */
    const loadCandidateJourney = async (candidateId) => {
        try {
            Utils.showLoader('Loading candidate journey...');
            
            const response = await API.request('GET_CANDIDATE_JOURNEY', { candidateId });

            if (response.success) {
                renderCandidateJourney(response.data);
            } else {
                Utils.showToast(response.error || 'Failed to load journey', 'error');
            }
        } catch (error) {
            console.error('Error loading candidate journey:', error);
            Utils.showToast('Error loading journey', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render candidate journey
     */
    const renderCandidateJourney = (journeyData) => {
        const container = document.getElementById('candidate-journey-container');
        if (!container) return;

        const html = `
            <div class="journey-view">
                <!-- Candidate Header -->
                <div class="journey-header">
                    <h2>${Utils.escapeHtml(journeyData.candidate.name)}</h2>
                    <span class="current-status">${journeyData.candidate.currentStatus}</span>
                </div>

                <!-- Journey Timeline -->
                <div class="journey-timeline">
                    ${journeyData.timeline.map(event => `
                        <div class="timeline-item ${event.completed ? 'completed' : 'pending'}">
                            <div class="timeline-marker">
                                <i class="icon-${event.completed ? 'check-circle' : 'circle'}"></i>
                            </div>
                            <div class="timeline-content">
                                <h4>${event.stage}</h4>
                                <p>${Utils.escapeHtml(event.description)}</p>
                                ${event.data ? `<div class="timeline-data">${renderEventData(event.data)}</div>` : ''}
                                <small>${Utils.formatDate(event.timestamp)}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    };

    /**
     * Render event data
     */
    const renderEventData = (data) => {
        return Object.entries(data).map(([key, value]) => `
            <span class="data-item"><strong>${key}:</strong> ${value}</span>
        `).join('');
    };

    /**
     * Load dashboard stats
     */
    const loadDashboardStats = async () => {
        try {
            const response = await API.request('GET_OWNER_DASHBOARD_STATS');
            
            if (response.success) {
                dashboardStats = response.data;
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    };

    /**
     * Render dashboard
     */
    const renderDashboard = () => {
        const statsContainer = document.getElementById('owner-stats');
        if (!statsContainer) return;

        const html = `
            <div class="stat-card">
                <h3>${ownerQueue.length}</h3>
                <p>Pending Your Review</p>
            </div>
            <div class="stat-card">
                <h3>${finalInterviewQueue.length}</h3>
                <p>Ready for Final Decision</p>
            </div>
            <div class="stat-card">
                <h3>${dashboardStats.selectedThisMonth || 0}</h3>
                <p>Selected This Month</p>
            </div>
            <div class="stat-card">
                <h3>${dashboardStats.onboardingPending || 0}</h3>
                <p>Onboarding Pending</p>
            </div>
        `;

        statsContainer.innerHTML = html;
    };

    /**
     * Update owner queue stats
     */
    const updateOwnerQueueStats = () => {
        const statsContainer = document.getElementById('owner-queue-stats');
        if (!statsContainer) return;

        const highPriority = ownerQueue.filter(c => c.priority === 'high').length;
        const recommended = ownerQueue.filter(c => c.callMarks.recommend).length;

        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>${ownerQueue.length}</h3>
                <p>Total in Queue</p>
            </div>
            <div class="stat-card">
                <h3>${highPriority}</h3>
                <p>High Priority</p>
            </div>
            <div class="stat-card">
                <h3>${recommended}</h3>
                <p>HR Recommended</p>
            </div>
        `;
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Refresh buttons
        const refreshBtn = document.getElementById('owner-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadOwnerQueue();
                loadFinalInterviewQueue();
            });
        }

        // Filter buttons
        const filterBtn = document.getElementById('owner-filter-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', showFilterModal);
        }
    };

    const setupOwnerQueueListeners = () => {
        setupEventListeners();
    };

    const setupFinalInterviewListeners = () => {
        setupEventListeners();
    };

    const setupJourneyListeners = () => {
        // Journey specific listeners
    };

    /**
     * Show filter modal
     */
    const showFilterModal = () => {
        // Implement filter modal
        console.log('Show owner filter modal');
    };

    // Public API
    return {
        init,
        initOwnerQueue,
        initFinalInterviewQueue,
        initCandidateJourney,
        approveForInterview,
        holdCandidate,
        rejectCandidate,
        selectCandidate,
        holdFinalCandidate,
        rejectFinalCandidate,
        viewCandidateDetail,
        viewCV,
        viewCompleteJourney
    };
})();
