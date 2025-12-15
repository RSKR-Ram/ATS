/**
 * ============================================
 * HRMS/ATS SYSTEM - TESTS MODULE
 * Test scheduling, execution, and grading
 * ============================================
 */

const TestsModule = (() => {
    // Module state
    let pendingTests = [];
    let testResults = [];
    let testLinks = [];

    /**
     * Initialize tests module
     */
    const init = async () => {
        console.log('Initializing Tests Module');
        
        await loadPendingTests();
        await loadTestResults();
        setupEventListeners();
    };

    /**
     * Load candidates pending for test
     */
    const loadPendingTests = async () => {
        try {
            const result = await API.candidates.getAll({ status: 'INTERVIEW_CLEARED' });
            
            if (result.success) {
                pendingTests = result.data || [];
                renderPendingTests();
            }
        } catch (error) {
            console.error('Error loading pending tests:', error);
        }
    };

    /**
     * Load test results
     */
    const loadTestResults = async () => {
        try {
            const result = await API.tests.getResults();
            
            if (result.success) {
                testResults = result.data || [];
                renderTestResults();
            }
        } catch (error) {
            console.error('Error loading test results:', error);
        }
    };

    /**
     * Render pending tests
     */
    const renderPendingTests = () => {
        const container = document.getElementById('pending-tests');
        if (!container) return;
        
        if (pendingTests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3 class="empty-state-title">No Pending Tests</h3>
                    <p class="empty-state-description">Candidates who clear interviews will appear here for testing.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Ready for Test (${pendingTests.length})</h3>
                </div>
                <div class="card-body p-0">
                    <div class="list-view">
                        ${pendingTests.map(c => `
                            <div class="list-item">
                                <div class="avatar avatar-md">${c.name.charAt(0)}</div>
                                <div class="list-item-main">
                                    <div class="list-item-title">${c.name}</div>
                                    <div class="list-item-meta">
                                        <span>📱 ${c.mobile}</span>
                                        <span>💼 ${c.jobRole}</span>
                                        <span>📊 Interview Score: ${c.interviewScore || '-'}/40</span>
                                    </div>
                                </div>
                                <div class="list-item-actions">
                                    <button class="btn btn-primary btn-sm" onclick="TestsModule.openSendTestModal('${c.id}')">
                                        📧 Send Test Link
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
     * Render test results
     */
    const renderTestResults = () => {
        const container = document.getElementById('test-results');
        if (!container) return;
        
        if (testResults.length === 0) {
            container.innerHTML = '<p class="text-muted p-4">No test results yet</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Test Results</h3>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Job Role</th>
                                <th>Test Type</th>
                                <th>Score</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testResults.map(t => `
                                <tr>
                                    <td>
                                        <div class="cell-avatar">
                                            <div class="cell-avatar-img">${t.candidateName?.charAt(0) || '?'}</div>
                                            <div class="cell-avatar-info">
                                                <div class="cell-avatar-name">${t.candidateName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${t.jobRole}</td>
                                    <td><span class="badge badge-secondary">${t.testType}</span></td>
                                    <td>
                                        <span class="score-badge ${getScoreBadgeClass(t.score, t.maxScore)}">
                                            ${t.score}/${t.maxScore}
                                        </span>
                                    </td>
                                    <td>${getTestStatusBadge(t.status)}</td>
                                    <td class="cell-date">${Utils.formatDate(t.submittedAt, 'DD MMM, HH:mm')}</td>
                                    <td>
                                        <div class="table-actions">
                                            <button class="btn btn-sm btn-outline-primary" onclick="TestsModule.viewTestDetails('${t.id}')">View</button>
                                            ${t.status === 'PENDING_REVIEW' ? `
                                                <button class="btn btn-sm btn-primary" onclick="TestsModule.openGradeModal('${t.id}')">Grade</button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    /**
     * Get score badge class
     */
    const getScoreBadgeClass = (score, maxScore) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return 'score-excellent';
        if (percentage >= 60) return 'score-good';
        if (percentage >= 40) return 'score-average';
        return 'score-poor';
    };

    /**
     * Get test status badge
     */
    const getTestStatusBadge = (status) => {
        const badges = {
            'PENDING': '<span class="badge badge-warning">Pending</span>',
            'IN_PROGRESS': '<span class="badge badge-info">In Progress</span>',
            'SUBMITTED': '<span class="badge badge-primary">Submitted</span>',
            'PENDING_REVIEW': '<span class="badge badge-warning">Pending Review</span>',
            'GRADED': '<span class="badge badge-success">Graded</span>',
            'EXPIRED': '<span class="badge badge-danger">Expired</span>'
        };
        return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
    };

    /**
     * Open send test modal
     */
    const openSendTestModal = (candidateId) => {
        const candidate = pendingTests.find(c => c.id === candidateId);
        if (!candidate) {
            Utils.toast('Candidate not found', 'error');
            return;
        }
        
        // Get test types for this job role
        const testTypes = CONFIG.TEST_TYPES[candidate.jobRole] || ['GENERAL'];
        
        const modalHTML = `
            <div id="send-test-modal" class="modal-backdrop active">
                <div class="modal">
                    <div class="modal-header">
                        <h3>📧 Send Test Link</h3>
                        <button class="modal-close" onclick="TestsModule.closeSendTestModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info mb-4">
                            <strong>${candidate.name}</strong><br>
                            ${candidate.jobRole} • ${candidate.mobile}
                        </div>
                        
                        <form id="send-test-form">
                            <input type="hidden" name="candidateId" value="${candidateId}">
                            <input type="hidden" name="jobRole" value="${candidate.jobRole}">
                            
                            <div class="form-group">
                                <label class="form-label form-label-required">Select Test Type</label>
                                <div class="test-type-options">
                                    ${testTypes.map((type, idx) => `
                                        <label class="test-type-option">
                                            <input type="radio" name="testType" value="${type}" ${idx === 0 ? 'checked' : ''}>
                                            <div class="test-type-content">
                                                <span class="test-type-icon">${getTestTypeIcon(type)}</span>
                                                <span class="test-type-name">${type}</span>
                                                <span class="test-type-desc">${getTestTypeDescription(type)}</span>
                                            </div>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Link Validity</label>
                                <select name="validity" class="form-select">
                                    <option value="24">24 Hours (Default)</option>
                                    <option value="48">48 Hours</option>
                                    <option value="72">72 Hours</option>
                                </select>
                                <p class="form-hint">Test link will expire after this duration</p>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Additional Instructions</label>
                                <textarea name="instructions" class="form-textarea" 
                                          placeholder="Any additional instructions for the candidate..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-check">
                                    <input type="checkbox" name="sendSMS" class="form-check-input" checked>
                                    <span class="form-check-label">Send SMS notification with test link</span>
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="TestsModule.closeSendTestModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="TestsModule.sendTestLink()">
                            📧 Generate & Send Link
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    /**
     * Get test type icon
     */
    const getTestTypeIcon = (type) => {
        const icons = {
            'TALLY': '📊',
            'EXCEL': '📈',
            'VOICE': '🎤',
            'TYPING': '⌨️',
            'GENERAL': '📝',
            'CODING': '💻',
            'APTITUDE': '🧠'
        };
        return icons[type] || '📝';
    };

    /**
     * Get test type description
     */
    const getTestTypeDescription = (type) => {
        const descriptions = {
            'TALLY': 'Accounting software proficiency',
            'EXCEL': 'Spreadsheet skills & formulas',
            'VOICE': 'Voice/Communication assessment',
            'TYPING': 'Typing speed & accuracy',
            'GENERAL': 'General aptitude test',
            'CODING': 'Programming skills test',
            'APTITUDE': 'Logical reasoning & aptitude'
        };
        return descriptions[type] || 'Skills assessment';
    };

    /**
     * Close send test modal
     */
    const closeSendTestModal = () => {
        document.getElementById('send-test-modal')?.remove();
    };

    /**
     * Send test link
     */
    const sendTestLink = async () => {
        const form = document.getElementById('send-test-form');
        const formData = Utils.getFormData(form);
        
        try {
            Utils.showLoader('Generating test link...');
            
            const result = await API.tests.sendLink({
                candidateId: formData.candidateId,
                testType: formData.testType,
                jobRole: formData.jobRole,
                validity: parseInt(formData.validity),
                instructions: formData.instructions,
                sendSMS: formData.sendSMS === 'on'
            });
            
            if (result.success) {
                Utils.toast('Test link sent successfully!', 'success');
                closeSendTestModal();
                
                // Show link info
                if (result.testLink) {
                    showTestLinkInfo(result.testLink, formData);
                }
                
                loadPendingTests();
            } else {
                Utils.toast(result.error || 'Failed to send test link', 'error');
            }
        } catch (error) {
            console.error('Send test link error:', error);
            Utils.toast('Error sending test link', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Show test link info
     */
    const showTestLinkInfo = (link, formData) => {
        const modalHTML = `
            <div id="link-info-modal" class="modal-backdrop active">
                <div class="modal">
                    <div class="modal-header">
                        <h3>✅ Test Link Generated</h3>
                        <button class="modal-close" onclick="document.getElementById('link-info-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-success">
                            <p>Test link has been generated and ${formData.sendSMS === 'on' ? 'sent to the candidate via SMS' : 'is ready to share'}.</p>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Test Link</label>
                            <div class="input-group">
                                <input type="text" id="test-link-input" class="form-input" value="${link}" readonly>
                                <button class="btn btn-primary" onclick="TestsModule.copyTestLink()">📋 Copy</button>
                            </div>
                        </div>
                        
                        <div class="link-info">
                            <p><strong>Test Type:</strong> ${formData.testType}</p>
                            <p><strong>Valid For:</strong> ${formData.validity} hours</p>
                            <p><strong>Expires:</strong> ${Utils.formatDate(new Date(Date.now() + formData.validity * 60 * 60 * 1000), 'DD MMM YYYY, HH:mm')}</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="document.getElementById('link-info-modal').remove()">Done</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    /**
     * Copy test link
     */
    const copyTestLink = () => {
        const input = document.getElementById('test-link-input');
        if (input) {
            input.select();
            document.execCommand('copy');
            Utils.toast('Link copied to clipboard!', 'success');
        }
    };

    /**
     * View test details
     */
    const viewTestDetails = async (testId) => {
        try {
            Utils.showLoader('Loading test details...');
            
            const result = await API.tests.getDetails(testId);
            
            if (result.success && result.data) {
                const test = result.data;
                
                const modalHTML = `
                    <div id="test-details-modal" class="modal-backdrop active">
                        <div class="modal modal-lg">
                            <div class="modal-header">
                                <h3>Test Details</h3>
                                <button class="modal-close" onclick="document.getElementById('test-details-modal').remove()">×</button>
                            </div>
                            <div class="modal-body">
                                <div class="test-details-header">
                                    <div>
                                        <h4>${test.candidateName}</h4>
                                        <p>${test.jobRole} | ${test.testType}</p>
                                    </div>
                                    <div class="test-score-display">
                                        <span class="score-big">${test.score}</span>
                                        <span class="score-max">/${test.maxScore}</span>
                                        <span class="score-percentage">(${Math.round((test.score/test.maxScore)*100)}%)</span>
                                    </div>
                                </div>
                                
                                <div class="test-timeline">
                                    <div class="timeline-item">
                                        <span class="timeline-label">Link Sent:</span>
                                        <span class="timeline-value">${Utils.formatDate(test.sentAt, 'DD MMM YYYY, HH:mm')}</span>
                                    </div>
                                    <div class="timeline-item">
                                        <span class="timeline-label">Started:</span>
                                        <span class="timeline-value">${test.startedAt ? Utils.formatDate(test.startedAt, 'DD MMM YYYY, HH:mm') : '-'}</span>
                                    </div>
                                    <div class="timeline-item">
                                        <span class="timeline-label">Submitted:</span>
                                        <span class="timeline-value">${test.submittedAt ? Utils.formatDate(test.submittedAt, 'DD MMM YYYY, HH:mm') : '-'}</span>
                                    </div>
                                    <div class="timeline-item">
                                        <span class="timeline-label">Duration:</span>
                                        <span class="timeline-value">${test.duration || '-'}</span>
                                    </div>
                                </div>
                                
                                ${test.answers ? renderTestAnswers(test.answers) : ''}
                                
                                ${test.feedback ? `
                                    <div class="test-feedback">
                                        <h5>Grader's Feedback</h5>
                                        <p>${test.feedback}</p>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-primary" onclick="document.getElementById('test-details-modal').remove()">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }
        } catch (error) {
            console.error('View test details error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render test answers
     */
    const renderTestAnswers = (answers) => {
        if (!answers || answers.length === 0) return '';
        
        return `
            <div class="test-answers">
                <h5>Answers</h5>
                <div class="answers-list">
                    ${answers.map((a, idx) => `
                        <div class="answer-item ${a.isCorrect ? 'correct' : 'incorrect'}">
                            <div class="answer-number">Q${idx + 1}</div>
                            <div class="answer-content">
                                <div class="question-text">${a.question}</div>
                                <div class="given-answer">
                                    <strong>Answer:</strong> ${a.answer}
                                </div>
                                ${a.correctAnswer ? `
                                    <div class="correct-answer">
                                        <strong>Correct:</strong> ${a.correctAnswer}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="answer-marks">
                                ${a.marks}/${a.maxMarks}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    /**
     * Open grade modal
     */
    const openGradeModal = (testId) => {
        const test = testResults.find(t => t.id === testId);
        if (!test) return;
        
        const modalHTML = `
            <div id="grade-modal" class="modal-backdrop active">
                <div class="modal">
                    <div class="modal-header">
                        <h3>📝 Grade Test</h3>
                        <button class="modal-close" onclick="TestsModule.closeGradeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info mb-4">
                            <strong>${test.candidateName}</strong><br>
                            ${test.testType} Test | Auto Score: ${test.score}/${test.maxScore}
                        </div>
                        
                        <form id="grade-form">
                            <input type="hidden" name="testId" value="${testId}">
                            
                            <div class="form-group">
                                <label class="form-label form-label-required">Final Score</label>
                                <div class="form-row">
                                    <input type="number" name="finalScore" class="form-input" 
                                           value="${test.score}" min="0" max="${test.maxScore}" required>
                                    <span class="score-max-label">/ ${test.maxScore}</span>
                                </div>
                                <p class="form-hint">Adjust if manual review changes the score</p>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Feedback / Notes</label>
                                <textarea name="feedback" class="form-textarea" 
                                          placeholder="Any feedback on the test performance..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label form-label-required">Result</label>
                                <div class="form-check-group-inline">
                                    <label class="form-check">
                                        <input type="radio" name="result" value="PASS" class="form-check-input" 
                                               ${test.score >= test.maxScore * 0.6 ? 'checked' : ''}>
                                        <span class="form-check-label">✅ Pass - Move to Owner Review</span>
                                    </label>
                                    <label class="form-check">
                                        <input type="radio" name="result" value="FAIL" class="form-check-input"
                                               ${test.score < test.maxScore * 0.6 ? 'checked' : ''}>
                                        <span class="form-check-label">❌ Fail - Reject</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div id="fail-reason-container" class="hidden">
                                <div class="form-group">
                                    <label class="form-label form-label-required">Rejection Reason</label>
                                    <textarea name="rejectionReason" class="form-textarea"></textarea>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="TestsModule.closeGradeModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="TestsModule.submitGrade()">Submit Grade</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup result change listener
        document.querySelectorAll('input[name="result"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('fail-reason-container')?.classList.toggle('hidden', e.target.value !== 'FAIL');
            });
        });
    };

    /**
     * Close grade modal
     */
    const closeGradeModal = () => {
        document.getElementById('grade-modal')?.remove();
    };

    /**
     * Submit grade
     */
    const submitGrade = async () => {
        const form = document.getElementById('grade-form');
        const formData = Utils.getFormData(form);
        
        if (!formData.result) {
            Utils.toast('Please select pass or fail', 'warning');
            return;
        }
        
        if (formData.result === 'FAIL' && !formData.rejectionReason?.trim()) {
            Utils.toast('Please provide rejection reason', 'warning');
            return;
        }
        
        try {
            Utils.showLoader('Submitting grade...');
            
            const result = await API.tests.grade({
                testId: formData.testId,
                finalScore: parseInt(formData.finalScore),
                feedback: formData.feedback,
                result: formData.result,
                rejectionReason: formData.rejectionReason
            });
            
            if (result.success) {
                Utils.toast('Grade submitted!', 'success');
                closeGradeModal();
                loadTestResults();
            } else {
                Utils.toast(result.error || 'Failed to submit grade', 'error');
            }
        } catch (error) {
            console.error('Submit grade error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Get active test links
     */
    const getActiveLinks = async () => {
        try {
            const result = await API.tests.getActiveLinks();
            
            if (result.success) {
                testLinks = result.data || [];
                renderActiveLinks();
            }
        } catch (error) {
            console.error('Error loading active links:', error);
        }
    };

    /**
     * Render active links
     */
    const renderActiveLinks = () => {
        const container = document.getElementById('active-test-links');
        if (!container) return;
        
        if (testLinks.length === 0) {
            container.innerHTML = '<p class="text-muted p-4">No active test links</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Active Test Links</h3>
                </div>
                <div class="card-body p-0">
                    <div class="list-view">
                        ${testLinks.map(link => `
                            <div class="list-item ${isLinkExpiringSoon(link.expiresAt) ? 'expiring-soon' : ''}">
                                <div class="list-item-main">
                                    <div class="list-item-title">${link.candidateName}</div>
                                    <div class="list-item-meta">
                                        <span>📝 ${link.testType}</span>
                                        <span>⏰ Expires: ${Utils.formatDate(link.expiresAt, 'DD MMM, HH:mm')}</span>
                                    </div>
                                </div>
                                <div class="list-item-actions">
                                    ${getLinkStatusBadge(link.status)}
                                    <button class="btn btn-sm btn-outline-danger" onclick="TestsModule.revokeLink('${link.id}')">
                                        Revoke
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
     * Check if link is expiring soon
     */
    const isLinkExpiringSoon = (expiresAt) => {
        const hoursLeft = (new Date(expiresAt) - new Date()) / (1000 * 60 * 60);
        return hoursLeft > 0 && hoursLeft < 6;
    };

    /**
     * Get link status badge
     */
    const getLinkStatusBadge = (status) => {
        const badges = {
            'ACTIVE': '<span class="badge badge-success">Active</span>',
            'USED': '<span class="badge badge-info">Used</span>',
            'EXPIRED': '<span class="badge badge-danger">Expired</span>',
            'REVOKED': '<span class="badge badge-secondary">Revoked</span>'
        };
        return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
    };

    /**
     * Revoke test link
     */
    const revokeLink = async (linkId) => {
        const confirmed = await Utils.confirm('Revoke this test link? The candidate will no longer be able to access the test.');
        if (!confirmed) return;
        
        try {
            Utils.showLoader('Revoking link...');
            
            const result = await API.tests.revokeLink(linkId);
            
            if (result.success) {
                Utils.toast('Link revoked', 'success');
                getActiveLinks();
            }
        } catch (error) {
            console.error('Revoke link error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Tab switching
        document.querySelectorAll('.tests-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tests-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.tests-tab-content').forEach(c => c.classList.add('hidden'));
                document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');
                
                // Load tab-specific data
                if (tabName === 'links') {
                    getActiveLinks();
                }
            });
        });
    };

    // Public interface
    return {
        init,
        loadPendingTests,
        loadTestResults,
        openSendTestModal,
        closeSendTestModal,
        sendTestLink,
        copyTestLink,
        viewTestDetails,
        openGradeModal,
        closeGradeModal,
        submitGrade,
        getActiveLinks,
        revokeLink
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestsModule;
}
