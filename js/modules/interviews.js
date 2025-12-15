/**
 * ============================================
 * HRMS/ATS SYSTEM - INTERVIEWS MODULE
 * Interview scheduling and feedback
 * ============================================
 */

const InterviewsModule = (() => {
    // Module state
    let interviewsList = [];
    let scheduledInterviews = [];
    let candidatesForInterview = [];

    /**
     * Initialize interviews module
     */
    const init = async () => {
        console.log('Initializing Interviews Module');
        
        await loadScheduledInterviews();
        await loadCandidatesForInterview();
        setupEventListeners();
    };

    /**
     * Load scheduled interviews
     */
    const loadScheduledInterviews = async () => {
        try {
            const result = await API.interviews.getScheduled();
            
            if (result.success) {
                scheduledInterviews = result.data || [];
                renderScheduledInterviews();
            }
        } catch (error) {
            console.error('Error loading scheduled interviews:', error);
        }
    };

    /**
     * Load candidates ready for interview scheduling
     */
    const loadCandidatesForInterview = async () => {
        try {
            const result = await API.candidates.getAll({ status: 'CALL_CLEARED' });
            
            if (result.success) {
                candidatesForInterview = result.data || [];
                renderCandidatesForScheduling();
            }
        } catch (error) {
            console.error('Error loading candidates:', error);
        }
    };

    /**
     * Render scheduled interviews
     */
    const renderScheduledInterviews = () => {
        const container = document.getElementById('scheduled-interviews');
        if (!container) return;
        
        // Group by date
        const groupedByDate = groupInterviewsByDate(scheduledInterviews);
        
        if (Object.keys(groupedByDate).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <h3 class="empty-state-title">No Scheduled Interviews</h3>
                    <p class="empty-state-description">Schedule interviews for candidates who cleared call screening.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        Object.keys(groupedByDate).forEach(date => {
            const interviews = groupedByDate[date];
            html += `
                <div class="interview-date-group">
                    <h4 class="interview-date-header">
                        📅 ${Utils.formatDate(date, 'DD MMMM, YYYY (dddd)')}
                        <span class="badge badge-primary">${interviews.length} interviews</span>
                    </h4>
                    <div class="interview-list">
                        ${interviews.map(i => renderInterviewCard(i)).join('')}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = `<div class="card"><div class="card-body">${html}</div></div>`;
    };

    /**
     * Group interviews by date
     */
    const groupInterviewsByDate = (interviews) => {
        return interviews.reduce((groups, interview) => {
            const date = interview.scheduledDate;
            if (!groups[date]) groups[date] = [];
            groups[date].push(interview);
            return groups;
        }, {});
    };

    /**
     * Render single interview card
     */
    const renderInterviewCard = (interview) => {
        const statusBadge = getInterviewStatusBadge(interview.status);
        const isToday = Utils.formatDate(interview.scheduledDate, 'YYYY-MM-DD') === Utils.formatDate(new Date(), 'YYYY-MM-DD');
        
        return `
            <div class="interview-card ${isToday ? 'interview-today' : ''}">
                <div class="interview-time">
                    <span class="time">${interview.scheduledTime || 'TBD'}</span>
                    ${interview.type === 'WALK_IN' ? '<span class="badge badge-info">Walk-in</span>' : ''}
                </div>
                <div class="interview-details">
                    <div class="interview-candidate">
                        <div class="avatar avatar-sm">${interview.candidateName?.charAt(0) || '?'}</div>
                        <div>
                            <div class="interview-candidate-name">${interview.candidateName}</div>
                            <div class="interview-candidate-meta">${interview.jobRole} • ${interview.mobile}</div>
                        </div>
                    </div>
                    <div class="interview-meta">
                        ${statusBadge}
                        ${interview.interviewers ? `<span class="text-muted">Interviewer: ${interview.interviewers}</span>` : ''}
                    </div>
                </div>
                <div class="interview-actions">
                    ${getInterviewActions(interview)}
                </div>
            </div>
        `;
    };

    /**
     * Get interview status badge
     */
    const getInterviewStatusBadge = (status) => {
        const badges = {
            'SCHEDULED': '<span class="badge badge-info">Scheduled</span>',
            'IN_PROGRESS': '<span class="badge badge-warning">In Progress</span>',
            'COMPLETED': '<span class="badge badge-success">Completed</span>',
            'NO_SHOW': '<span class="badge badge-danger">No Show</span>',
            'RESCHEDULED': '<span class="badge badge-secondary">Rescheduled</span>'
        };
        return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
    };

    /**
     * Get interview action buttons
     */
    const getInterviewActions = (interview) => {
        if (interview.status === 'COMPLETED') {
            return `<button class="btn btn-sm btn-outline-primary" onclick="InterviewsModule.viewFeedback('${interview.id}')">View Feedback</button>`;
        }
        
        if (interview.status === 'SCHEDULED') {
            return `
                <button class="btn btn-sm btn-primary" onclick="InterviewsModule.startInterview('${interview.id}')">Start</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="InterviewsModule.reschedule('${interview.id}')">Reschedule</button>
                <button class="btn btn-sm btn-outline-danger" onclick="InterviewsModule.markNoShow('${interview.id}')">No Show</button>
            `;
        }
        
        if (interview.status === 'IN_PROGRESS') {
            return `<button class="btn btn-sm btn-success" onclick="InterviewsModule.openFeedbackForm('${interview.id}')">Complete & Feedback</button>`;
        }
        
        return '';
    };

    /**
     * Render candidates for scheduling
     */
    const renderCandidatesForScheduling = () => {
        const container = document.getElementById('candidates-for-scheduling');
        if (!container) return;
        
        if (candidatesForInterview.length === 0) {
            container.innerHTML = `<p class="text-muted p-4">No candidates waiting for interview scheduling</p>`;
            return;
        }
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Ready for Interview (${candidatesForInterview.length})</h3>
                </div>
                <div class="card-body p-0">
                    <div class="list-view">
                        ${candidatesForInterview.map(c => `
                            <div class="list-item">
                                <div class="avatar avatar-md">${c.name.charAt(0)}</div>
                                <div class="list-item-main">
                                    <div class="list-item-title">${c.name}</div>
                                    <div class="list-item-meta">
                                        <span>📱 ${c.mobile}</span>
                                        <span>💼 ${c.jobRole}</span>
                                        <span>📊 Call Score: ${c.callScore || '-'}</span>
                                    </div>
                                </div>
                                <div class="list-item-actions">
                                    <button class="btn btn-primary btn-sm" onclick="InterviewsModule.openScheduleModal('${c.id}')">
                                        📅 Schedule Interview
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
     * Open schedule interview modal
     */
    const openScheduleModal = (candidateId) => {
        const candidate = candidatesForInterview.find(c => c.id === candidateId);
        if (!candidate) {
            Utils.toast('Candidate not found', 'error');
            return;
        }
        
        // Default to next working day
        const defaultDate = getNextWorkingDay();
        
        const modalHTML = `
            <div id="schedule-modal" class="modal-backdrop active">
                <div class="modal">
                    <div class="modal-header">
                        <h3>📅 Schedule Interview</h3>
                        <button class="modal-close" onclick="InterviewsModule.closeScheduleModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info mb-4">
                            <strong>${candidate.name}</strong><br>
                            ${candidate.jobRole} • ${candidate.mobile}
                        </div>
                        
                        <form id="schedule-form">
                            <input type="hidden" name="candidateId" value="${candidateId}">
                            
                            <div class="form-group">
                                <label class="form-label form-label-required">Interview Type</label>
                                <div class="form-check-group-inline">
                                    <label class="form-check">
                                        <input type="radio" name="type" value="SCHEDULED" class="form-check-input" checked>
                                        <span class="form-check-label">Scheduled Interview</span>
                                    </label>
                                    <label class="form-check">
                                        <input type="radio" name="type" value="WALK_IN" class="form-check-input">
                                        <span class="form-check-label">Walk-in Interview</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label form-label-required">Date</label>
                                    <input type="date" name="scheduledDate" class="form-input" 
                                           value="${defaultDate}" min="${Utils.formatDate(new Date(), 'YYYY-MM-DD')}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label form-label-required">Time</label>
                                    <input type="time" name="scheduledTime" class="form-input" value="10:00" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Interviewer(s)</label>
                                <input type="text" name="interviewers" class="form-input" placeholder="Enter interviewer names">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Notes for Candidate</label>
                                <textarea name="notes" class="form-textarea" 
                                          placeholder="Any instructions or notes to share with the candidate..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-check">
                                    <input type="checkbox" name="sendNotification" class="form-check-input" checked>
                                    <span class="form-check-label">Send SMS notification to candidate</span>
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="InterviewsModule.closeScheduleModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="InterviewsModule.submitSchedule()">
                            Schedule Interview
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    /**
     * Get next working day
     */
    const getNextWorkingDay = () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        
        // Skip weekends
        while (date.getDay() === 0 || date.getDay() === 6) {
            date.setDate(date.getDate() + 1);
        }
        
        return Utils.formatDate(date, 'YYYY-MM-DD');
    };

    /**
     * Close schedule modal
     */
    const closeScheduleModal = () => {
        document.getElementById('schedule-modal')?.remove();
    };

    /**
     * Submit schedule
     */
    const submitSchedule = async () => {
        const form = document.getElementById('schedule-form');
        if (!form) return;
        
        const formData = Utils.getFormData(form);
        
        // Validate
        if (!formData.scheduledDate || !formData.scheduledTime) {
            Utils.toast('Please select date and time', 'warning');
            return;
        }
        
        try {
            Utils.showLoader('Scheduling interview...');
            
            const result = await API.interviews.schedule({
                candidateId: formData.candidateId,
                type: formData.type,
                scheduledDate: formData.scheduledDate,
                scheduledTime: formData.scheduledTime,
                interviewers: formData.interviewers,
                notes: formData.notes,
                sendNotification: formData.sendNotification === 'on'
            });
            
            if (result.success) {
                Utils.toast('Interview scheduled!', 'success');
                closeScheduleModal();
                loadScheduledInterviews();
                loadCandidatesForInterview();
            } else {
                Utils.toast(result.error || 'Failed to schedule', 'error');
            }
        } catch (error) {
            console.error('Schedule error:', error);
            Utils.toast('Error scheduling interview', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Start interview
     */
    const startInterview = async (interviewId) => {
        try {
            Utils.showLoader('Starting interview...');
            
            const result = await API.interviews.updateStatus(interviewId, 'IN_PROGRESS');
            
            if (result.success) {
                Utils.toast('Interview started', 'success');
                loadScheduledInterviews();
            } else {
                Utils.toast(result.error || 'Failed to start', 'error');
            }
        } catch (error) {
            console.error('Start interview error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Mark as no show
     */
    const markNoShow = async (interviewId) => {
        const confirmed = await Utils.confirm('Mark this candidate as No Show?');
        if (!confirmed) return;
        
        try {
            Utils.showLoader('Updating...');
            
            const result = await API.interviews.updateStatus(interviewId, 'NO_SHOW');
            
            if (result.success) {
                Utils.toast('Marked as No Show', 'info');
                loadScheduledInterviews();
            }
        } catch (error) {
            console.error('No show error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Reschedule interview
     */
    const reschedule = async (interviewId) => {
        const interview = scheduledInterviews.find(i => i.id === interviewId);
        if (!interview) return;
        
        const modalHTML = `
            <div id="reschedule-modal" class="modal-backdrop active">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Reschedule Interview</h3>
                        <button class="modal-close" onclick="InterviewsModule.closeRescheduleModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="reschedule-form">
                            <input type="hidden" name="interviewId" value="${interviewId}">
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label form-label-required">New Date</label>
                                    <input type="date" name="newDate" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label form-label-required">New Time</label>
                                    <input type="time" name="newTime" class="form-input" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label form-label-required">Reason for Rescheduling</label>
                                <textarea name="reason" class="form-textarea" required></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="InterviewsModule.closeRescheduleModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="InterviewsModule.submitReschedule()">Reschedule</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    /**
     * Close reschedule modal
     */
    const closeRescheduleModal = () => {
        document.getElementById('reschedule-modal')?.remove();
    };

    /**
     * Submit reschedule
     */
    const submitReschedule = async () => {
        const form = document.getElementById('reschedule-form');
        const formData = Utils.getFormData(form);
        
        if (!formData.newDate || !formData.newTime || !formData.reason?.trim()) {
            Utils.toast('Please fill all fields', 'warning');
            return;
        }
        
        try {
            Utils.showLoader('Rescheduling...');
            
            const result = await API.interviews.reschedule(formData.interviewId, {
                newDate: formData.newDate,
                newTime: formData.newTime,
                reason: formData.reason
            });
            
            if (result.success) {
                Utils.toast('Interview rescheduled', 'success');
                closeRescheduleModal();
                loadScheduledInterviews();
            }
        } catch (error) {
            console.error('Reschedule error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Open feedback form
     */
    const openFeedbackForm = (interviewId) => {
        const interview = scheduledInterviews.find(i => i.id === interviewId);
        if (!interview) return;
        
        const modalHTML = `
            <div id="feedback-modal" class="modal-backdrop active">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3>📝 Interview Feedback</h3>
                        <button class="modal-close" onclick="InterviewsModule.closeFeedbackModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info mb-4">
                            <strong>${interview.candidateName}</strong> | ${interview.jobRole}
                        </div>
                        
                        <form id="feedback-form">
                            <input type="hidden" name="interviewId" value="${interviewId}">
                            
                            <div class="feedback-section">
                                <h4>Pre-Interview Assessment</h4>
                                
                                <div class="form-group">
                                    <label class="form-label form-label-required">Technical Skills (0-10)</label>
                                    <div class="score-input-group">
                                        <input type="range" name="technicalScore" class="form-range" 
                                               min="0" max="10" value="5" 
                                               oninput="document.getElementById('tech-score').textContent = this.value">
                                        <span id="tech-score" class="score-display">5</span>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label form-label-required">Communication Skills (0-10)</label>
                                    <div class="score-input-group">
                                        <input type="range" name="communicationScore" class="form-range" 
                                               min="0" max="10" value="5"
                                               oninput="document.getElementById('comm-score').textContent = this.value">
                                        <span id="comm-score" class="score-display">5</span>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label form-label-required">Attitude & Professionalism (0-10)</label>
                                    <div class="score-input-group">
                                        <input type="range" name="attitudeScore" class="form-range" 
                                               min="0" max="10" value="5"
                                               oninput="document.getElementById('att-score').textContent = this.value">
                                        <span id="att-score" class="score-display">5</span>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label form-label-required">Relevant Experience (0-10)</label>
                                    <div class="score-input-group">
                                        <input type="range" name="experienceScore" class="form-range" 
                                               min="0" max="10" value="5"
                                               oninput="document.getElementById('exp-score').textContent = this.value">
                                        <span id="exp-score" class="score-display">5</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="total-score-display">
                                <span>Total Pre-Interview Score:</span>
                                <span id="total-preinterview-score" class="score-value">20/40</span>
                                <span id="pass-indicator" class="badge badge-warning">Pending</span>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Strengths</label>
                                <textarea name="strengths" class="form-textarea" placeholder="Candidate strengths..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Areas of Concern</label>
                                <textarea name="concerns" class="form-textarea" placeholder="Areas that need attention..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label form-label-required">Recommendation</label>
                                <div class="form-check-group">
                                    <label class="form-check">
                                        <input type="radio" name="recommendation" value="PASS" class="form-check-input">
                                        <span class="form-check-label">✅ Pass - Move to Test</span>
                                    </label>
                                    <label class="form-check">
                                        <input type="radio" name="recommendation" value="HOLD" class="form-check-input">
                                        <span class="form-check-label">⏸️ Hold - Need More Discussion</span>
                                    </label>
                                    <label class="form-check">
                                        <input type="radio" name="recommendation" value="REJECT" class="form-check-input">
                                        <span class="form-check-label">❌ Reject</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div id="rejection-reason-container" class="hidden">
                                <div class="form-group">
                                    <label class="form-label form-label-required">Rejection Reason</label>
                                    <textarea name="rejectionReason" class="form-textarea"></textarea>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="InterviewsModule.closeFeedbackModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="InterviewsModule.submitFeedback()">Submit Feedback</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup score calculation
        setupScoreCalculation();
        
        // Setup recommendation change listener
        document.querySelectorAll('input[name="recommendation"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const container = document.getElementById('rejection-reason-container');
                container?.classList.toggle('hidden', e.target.value !== 'REJECT');
            });
        });
    };

    /**
     * Setup score calculation
     */
    const setupScoreCalculation = () => {
        const scoreInputs = document.querySelectorAll('#feedback-form input[type="range"]');
        
        const calculateTotal = () => {
            let total = 0;
            scoreInputs.forEach(input => {
                total += parseInt(input.value) || 0;
            });
            
            document.getElementById('total-preinterview-score').textContent = `${total}/40`;
            
            const indicator = document.getElementById('pass-indicator');
            if (total >= 24) { // 60% threshold (6/10 * 4 categories)
                indicator.textContent = 'Likely Pass';
                indicator.className = 'badge badge-success';
            } else {
                indicator.textContent = 'Below Threshold';
                indicator.className = 'badge badge-danger';
            }
        };
        
        scoreInputs.forEach(input => {
            input.addEventListener('input', calculateTotal);
        });
        
        calculateTotal();
    };

    /**
     * Close feedback modal
     */
    const closeFeedbackModal = () => {
        document.getElementById('feedback-modal')?.remove();
    };

    /**
     * Submit feedback
     */
    const submitFeedback = async () => {
        const form = document.getElementById('feedback-form');
        const formData = Utils.getFormData(form);
        
        if (!formData.recommendation) {
            Utils.toast('Please select a recommendation', 'warning');
            return;
        }
        
        if (formData.recommendation === 'REJECT' && !formData.rejectionReason?.trim()) {
            Utils.toast('Please provide rejection reason', 'warning');
            return;
        }
        
        try {
            Utils.showLoader('Submitting feedback...');
            
            const totalScore = parseInt(formData.technicalScore) + 
                              parseInt(formData.communicationScore) + 
                              parseInt(formData.attitudeScore) + 
                              parseInt(formData.experienceScore);
            
            const result = await API.interviews.submitFeedback({
                interviewId: formData.interviewId,
                technicalScore: parseInt(formData.technicalScore),
                communicationScore: parseInt(formData.communicationScore),
                attitudeScore: parseInt(formData.attitudeScore),
                experienceScore: parseInt(formData.experienceScore),
                totalScore,
                strengths: formData.strengths,
                concerns: formData.concerns,
                recommendation: formData.recommendation,
                rejectionReason: formData.rejectionReason
            });
            
            if (result.success) {
                Utils.toast('Feedback submitted!', 'success');
                closeFeedbackModal();
                loadScheduledInterviews();
            } else {
                Utils.toast(result.error || 'Failed to submit feedback', 'error');
            }
        } catch (error) {
            console.error('Submit feedback error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * View feedback
     */
    const viewFeedback = async (interviewId) => {
        try {
            Utils.showLoader('Loading feedback...');
            
            const result = await API.interviews.getFeedback(interviewId);
            
            if (result.success && result.data) {
                const fb = result.data;
                
                const modalHTML = `
                    <div id="view-feedback-modal" class="modal-backdrop active">
                        <div class="modal">
                            <div class="modal-header">
                                <h3>Interview Feedback</h3>
                                <button class="modal-close" onclick="document.getElementById('view-feedback-modal').remove()">×</button>
                            </div>
                            <div class="modal-body">
                                <div class="feedback-summary">
                                    <div class="score-grid">
                                        <div class="score-item">
                                            <span class="score-label">Technical</span>
                                            <span class="score-value">${fb.technicalScore}/10</span>
                                        </div>
                                        <div class="score-item">
                                            <span class="score-label">Communication</span>
                                            <span class="score-value">${fb.communicationScore}/10</span>
                                        </div>
                                        <div class="score-item">
                                            <span class="score-label">Attitude</span>
                                            <span class="score-value">${fb.attitudeScore}/10</span>
                                        </div>
                                        <div class="score-item">
                                            <span class="score-label">Experience</span>
                                            <span class="score-value">${fb.experienceScore}/10</span>
                                        </div>
                                    </div>
                                    <div class="total-score">
                                        <strong>Total: ${fb.totalScore}/40</strong>
                                        <span class="badge ${fb.recommendation === 'PASS' ? 'badge-success' : fb.recommendation === 'REJECT' ? 'badge-danger' : 'badge-warning'}">
                                            ${fb.recommendation}
                                        </span>
                                    </div>
                                </div>
                                
                                ${fb.strengths ? `<div class="feedback-section"><h4>Strengths</h4><p>${fb.strengths}</p></div>` : ''}
                                ${fb.concerns ? `<div class="feedback-section"><h4>Concerns</h4><p>${fb.concerns}</p></div>` : ''}
                                ${fb.rejectionReason ? `<div class="feedback-section"><h4>Rejection Reason</h4><p>${fb.rejectionReason}</p></div>` : ''}
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-primary" onclick="document.getElementById('view-feedback-modal').remove()">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }
        } catch (error) {
            console.error('View feedback error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Tab switching
        document.querySelectorAll('.interviews-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.interviews-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.interviews-tab-content').forEach(c => c.classList.add('hidden'));
                document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');
            });
        });
    };

    // Public interface
    return {
        init,
        loadScheduledInterviews,
        loadCandidatesForInterview,
        openScheduleModal,
        closeScheduleModal,
        submitSchedule,
        startInterview,
        markNoShow,
        reschedule,
        closeRescheduleModal,
        submitReschedule,
        openFeedbackForm,
        closeFeedbackModal,
        submitFeedback,
        viewFeedback
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InterviewsModule;
}
