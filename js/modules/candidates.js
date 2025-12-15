/**
 * ============================================
 * HRMS/ATS SYSTEM - CANDIDATES MODULE
 * Candidate management, shortlisting, bulk upload
 * ============================================
 */

const CandidatesModule = (() => {
    // Module state
    let candidates = [];
    let currentCandidate = null;
    let selectedCandidates = new Set();

    /**
     * Initialize candidates list
     */
    const init = async () => {
        console.log('Initializing Candidates Module');
        
        await loadCandidates();
        setupEventListeners();
    };

    /**
     * Initialize add candidate form
     */
    const initAddForm = async () => {
        console.log('Initializing Add Candidate Form');
        
        renderAddForm();
        setupAddFormListeners();
    };

    /**
     * Initialize candidate detail view
     */
    const initDetail = async (id) => {
        console.log('Initializing Candidate Detail:', id);
        
        await loadCandidateDetail(id);
        await loadCandidateHistory(id);
        setupDetailEventListeners();
    };

    /**
     * Load candidates list
     */
    const loadCandidates = async () => {
        const container = document.getElementById('candidates-list');
        if (!container) return;
        
        try {
            State.setLoading('candidates', true);
            
            const filters = State.getFilters('candidates');
            const pagination = State.getPagination('candidates');
            
            const result = await API.candidates.getAll({
                ...filters,
                page: pagination.page,
                pageSize: pagination.pageSize
            });
            
            if (result.success) {
                candidates = result.data || [];
                State.setData('candidates', candidates);
                State.setPagination('candidates', {
                    ...pagination,
                    total: result.total || 0
                });
                
                renderCandidatesList();
            } else {
                Utils.toast(result.error || 'Failed to load candidates', 'error');
            }
        } catch (error) {
            console.error('Error loading candidates:', error);
            Utils.toast('Error loading candidates', 'error');
        } finally {
            State.setLoading('candidates', false);
        }
    };

    /**
     * Load single candidate detail
     */
    const loadCandidateDetail = async (id) => {
        try {
            Utils.showLoader('Loading candidate...');
            
            const result = await API.candidates.getById(id);
            
            if (result.success) {
                currentCandidate = result.data;
                renderCandidateDetail();
            } else {
                Utils.toast(result.error || 'Failed to load candidate', 'error');
                Router.navigate('candidates');
            }
        } catch (error) {
            console.error('Error loading candidate:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Load candidate history
     */
    const loadCandidateHistory = async (id) => {
        try {
            const result = await API.candidates.getHistory(id);
            
            if (result.success && currentCandidate) {
                currentCandidate.history = result.data || [];
                renderCandidateHistory();
            }
        } catch (error) {
            console.error('Error loading candidate history:', error);
        }
    };

    /**
     * Render candidates list
     */
    const renderCandidatesList = () => {
        const container = document.getElementById('candidates-list');
        if (!container) return;
        
        if (candidates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3 class="empty-state-title">No Candidates Found</h3>
                    <p class="empty-state-description">No candidates match your filters or no candidates added yet.</p>
                    ${Auth.hasPermission('CANDIDATE_ADD') ? `
                        <button class="btn btn-primary" data-route="candidates/add">
                            + Add Candidate
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        const tableHTML = `
            <div class="table-container">
                <div class="table-header">
                    <div>
                        <h3 class="table-title">Candidates</h3>
                        <p class="table-subtitle">${candidates.length} candidates found</p>
                    </div>
                    <div class="table-toolbar">
                        <div class="table-search">
                            <svg class="table-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                            </svg>
                            <input type="text" id="candidate-search" placeholder="Search candidates...">
                        </div>
                        <select id="candidate-status-filter" class="form-select" style="width: auto;">
                            <option value="">All Status</option>
                            <option value="NEW">New</option>
                            <option value="SHORTLISTED">Shortlisted</option>
                            <option value="ON_CALL">On Call</option>
                            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                            <option value="TEST_PENDING">Test Pending</option>
                            <option value="SELECTED">Selected</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                        ${Auth.hasPermission('CANDIDATE_ADD') ? `
                            <button class="btn btn-primary" onclick="CandidatesModule.showBulkUploadModal()">
                                📁 Bulk Upload
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                ${selectedCandidates.size > 0 ? renderBulkActions() : ''}
                
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th class="cell-checkbox">
                                    <input type="checkbox" id="select-all-candidates" 
                                           onchange="CandidatesModule.toggleSelectAll(this.checked)">
                                </th>
                                <th>Candidate</th>
                                <th>Job Role</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th>Stage Score</th>
                                <th>Applied Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${candidates.map(c => renderCandidateRow(c)).join('')}
                        </tbody>
                    </table>
                </div>
                ${renderPagination()}
            </div>
        `;
        
        container.innerHTML = tableHTML;
    };

    /**
     * Render single candidate row
     */
    const renderCandidateRow = (candidate) => {
        const initials = candidate.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        return `
            <tr data-id="${candidate.id}">
                <td class="cell-checkbox">
                    <input type="checkbox" 
                           ${selectedCandidates.has(candidate.id) ? 'checked' : ''}
                           onchange="CandidatesModule.toggleSelectCandidate('${candidate.id}', this.checked)">
                </td>
                <td>
                    <div class="cell-avatar">
                        <div class="cell-avatar-img">${initials}</div>
                        <div class="cell-avatar-info">
                            <div class="cell-avatar-name">${candidate.name}</div>
                            <div class="cell-avatar-meta">${candidate.mobile}</div>
                        </div>
                    </div>
                </td>
                <td>${candidate.jobRole || '-'}</td>
                <td>${candidate.source || '-'}</td>
                <td>${Utils.getStatusBadge(candidate.status)}</td>
                <td>
                    ${candidate.currentScore !== undefined ? `
                        <span class="cell-score">
                            <span class="score-value ${Utils.getScoreClass(candidate.currentScore)}">${candidate.currentScore}</span>
                            <span class="score-max">/ 10</span>
                        </span>
                    ` : '-'}
                </td>
                <td class="cell-date">${Utils.formatDate(candidate.createdAt)}</td>
                <td class="cell-actions">
                    <button class="btn btn-sm btn-ghost" onclick="CandidatesModule.viewDetail('${candidate.id}')" title="View">
                        👁️
                    </button>
                    ${getActionButtons(candidate)}
                </td>
            </tr>
        `;
    };

    /**
     * Get action buttons based on candidate status
     */
    const getActionButtons = (candidate) => {
        let buttons = '';
        
        switch (candidate.status) {
            case 'NEW':
                if (Auth.hasPermission('SHORTLIST_APPROVE')) {
                    buttons += `
                        <button class="btn btn-sm btn-success" onclick="CandidatesModule.shortlist('${candidate.id}', true)" title="Shortlist">✓</button>
                        <button class="btn btn-sm btn-danger" onclick="CandidatesModule.shortlist('${candidate.id}', false)" title="Reject">✕</button>
                    `;
                }
                break;
            case 'SHORTLISTED':
                if (Auth.hasPermission('CALL_SCREENING')) {
                    buttons += `
                        <button class="btn btn-sm btn-primary" onclick="CandidatesModule.moveToCall('${candidate.id}')" title="Move to Call">📞</button>
                    `;
                }
                break;
            case 'ON_CALL':
                if (Auth.hasPermission('CALL_SCREENING')) {
                    buttons += `
                        <button class="btn btn-sm btn-primary" onclick="CallsModule.openCallModal('${candidate.id}')" title="Log Call">📞</button>
                    `;
                }
                break;
        }
        
        return buttons;
    };

    /**
     * Render bulk actions bar
     */
    const renderBulkActions = () => {
        return `
            <div class="bulk-actions">
                <span class="bulk-actions-count">${selectedCandidates.size} selected</span>
                <div class="bulk-actions-buttons">
                    <button class="btn btn-sm btn-success" onclick="CandidatesModule.bulkShortlist(true)">
                        ✓ Shortlist All
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="CandidatesModule.bulkShortlist(false)">
                        ✕ Reject All
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="CandidatesModule.clearSelection()">
                        Clear Selection
                    </button>
                </div>
            </div>
        `;
    };

    /**
     * Render pagination
     */
    const renderPagination = () => {
        const pagination = State.getPagination('candidates');
        const totalPages = Math.ceil(pagination.total / pagination.pageSize);
        
        if (totalPages <= 1) return '';
        
        let pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }
        
        return `
            <div class="table-footer">
                <div class="table-info">
                    Showing ${((pagination.page - 1) * pagination.pageSize) + 1} - 
                    ${Math.min(pagination.page * pagination.pageSize, pagination.total)} 
                    of ${pagination.total} candidates
                </div>
                <div class="pagination">
                    <button class="pagination-btn" ${pagination.page === 1 ? 'disabled' : ''} 
                            onclick="CandidatesModule.goToPage(${pagination.page - 1})">←</button>
                    ${pages.map(p => p === '...' ? 
                        '<span class="pagination-ellipsis">...</span>' :
                        `<button class="pagination-btn ${p === pagination.page ? 'active' : ''}" 
                                 onclick="CandidatesModule.goToPage(${p})">${p}</button>`
                    ).join('')}
                    <button class="pagination-btn" ${pagination.page === totalPages ? 'disabled' : ''} 
                            onclick="CandidatesModule.goToPage(${pagination.page + 1})">→</button>
                </div>
            </div>
        `;
    };

    /**
     * Render add candidate form
     */
    const renderAddForm = () => {
        const container = document.getElementById('candidate-form-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="grid grid-cols-2 gap-6">
                <!-- Single Add -->
                <div class="card">
                    <div class="card-header">
                        <h3>Add Single Candidate</h3>
                    </div>
                    <div class="card-body">
                        <form id="add-candidate-form" class="form">
                            <div class="form-group">
                                <label class="form-label form-label-required">Full Name</label>
                                <input type="text" name="name" class="form-input" required>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label form-label-required">Mobile Number</label>
                                    <input type="tel" name="mobile" class="form-input" pattern="[0-9]{10}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Email</label>
                                    <input type="email" name="email" class="form-input">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label form-label-required">Job Role</label>
                                    <select name="jobRole" class="form-select" required>
                                        <option value="">Select Job Role</option>
                                        ${CONFIG.JOB_ROLES.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Source</label>
                                    <select name="source" class="form-select">
                                        <option value="">Select Source</option>
                                        <option value="Naukri">Naukri</option>
                                        <option value="Indeed">Indeed</option>
                                        <option value="LinkedIn">LinkedIn</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Walk-in">Walk-in</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Upload CV</label>
                                <div class="file-upload" id="cv-upload">
                                    <input type="file" name="cv" class="file-upload-input" accept=".pdf,.doc,.docx">
                                    <div class="file-upload-icon">📄</div>
                                    <p class="file-upload-text"><span>Click to upload</span> or drag and drop</p>
                                    <p class="file-upload-hint">PDF or DOC (max. 5MB)</p>
                                </div>
                                <div id="cv-preview" class="file-list"></div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="Router.back()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Add Candidate</button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Bulk Upload -->
                <div class="card">
                    <div class="card-header">
                        <h3>Bulk Upload CVs</h3>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info mb-4">
                            <div class="alert-content">
                                <p class="alert-title">File Naming Format</p>
                                <p class="alert-message">Name_Mobile_Source.pdf<br>Example: Rajesh_Kumar_9876543210_Naukri.pdf</p>
                            </div>
                        </div>
                        
                        <div class="file-upload" id="bulk-upload">
                            <input type="file" id="bulk-cv-input" class="file-upload-input" accept=".pdf" multiple>
                            <div class="file-upload-icon">📁</div>
                            <p class="file-upload-text"><span>Click to upload</span> or drag and drop</p>
                            <p class="file-upload-hint">Multiple PDFs allowed (max. 50 files)</p>
                        </div>
                        
                        <div id="bulk-preview" class="mt-4"></div>
                        
                        <div id="bulk-actions" class="form-actions hidden">
                            <button type="button" class="btn btn-secondary" onclick="CandidatesModule.clearBulkUpload()">
                                Clear All
                            </button>
                            <button type="button" class="btn btn-primary" onclick="CandidatesModule.processBulkUpload()">
                                Upload All Candidates
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * Render candidate detail
     */
    const renderCandidateDetail = () => {
        const container = document.getElementById('candidate-detail-container');
        if (!container || !currentCandidate) return;
        
        const c = currentCandidate;
        const initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-info flex items-center gap-4">
                    <div class="avatar avatar-lg">${initials}</div>
                    <div>
                        <h1>${c.name}</h1>
                        <p>${c.jobRole} • ${c.mobile}</p>
                    </div>
                </div>
                <div class="page-actions">
                    ${Utils.getStatusBadge(c.status)}
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-6">
                <!-- Main Info -->
                <div class="card" style="grid-column: span 2;">
                    <div class="card-header">
                        <h3>Candidate Information</h3>
                    </div>
                    <div class="card-body">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-muted text-sm">Email</label>
                                <p>${c.email || 'Not provided'}</p>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Mobile</label>
                                <p>${c.mobile}</p>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Source</label>
                                <p>${c.source || 'Unknown'}</p>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Applied For</label>
                                <p>${c.jobRole}</p>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Experience</label>
                                <p>${c.experience || 'Not specified'}</p>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Current CTC</label>
                                <p>${c.currentCTC ? Utils.formatCurrency(c.currentCTC) : 'Not specified'}</p>
                            </div>
                        </div>
                        
                        ${c.cvUrl ? `
                            <div class="mt-4">
                                <a href="${c.cvUrl}" target="_blank" class="btn btn-secondary">
                                    📄 View CV
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Scores -->
                <div class="card">
                    <div class="card-header">
                        <h3>Evaluation Scores</h3>
                    </div>
                    <div class="card-body">
                        ${renderScores(c)}
                    </div>
                </div>
                
                <!-- Action Panel -->
                <div class="card" style="grid-column: span 2;">
                    <div class="card-header">
                        <h3>Actions</h3>
                    </div>
                    <div class="card-body">
                        ${renderActionPanel(c)}
                    </div>
                </div>
                
                <!-- History -->
                <div class="card">
                    <div class="card-header">
                        <h3>History</h3>
                    </div>
                    <div class="card-body" id="candidate-history">
                        <p class="text-muted">Loading history...</p>
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * Render scores section
     */
    const renderScores = (candidate) => {
        if (!candidate.scores || Object.keys(candidate.scores).length === 0) {
            return '<p class="text-muted">No scores yet</p>';
        }
        
        return Object.entries(candidate.scores).map(([key, score]) => `
            <div class="mb-3">
                <div class="flex justify-between mb-1">
                    <span class="text-sm">${Utils.titleCase(key.replace(/_/g, ' '))}</span>
                    <span class="font-semibold ${Utils.getScoreClass(score)}">${score}/10</span>
                </div>
                <div class="progress">
                    <div class="progress-bar" style="width: ${score * 10}%"></div>
                </div>
            </div>
        `).join('');
    };

    /**
     * Render action panel based on status
     */
    const renderActionPanel = (candidate) => {
        const status = candidate.status;
        let html = '';
        
        switch (status) {
            case 'NEW':
                if (Auth.hasPermission('SHORTLIST_APPROVE')) {
                    html = `
                        <div class="alert alert-info mb-4">
                            <p>Review the CV and decide if the candidate should be shortlisted.</p>
                        </div>
                        <div class="flex gap-3">
                            <button class="btn btn-success btn-lg" onclick="CandidatesModule.shortlist('${candidate.id}', true)">
                                ✓ Shortlist
                            </button>
                            <button class="btn btn-danger btn-lg" onclick="CandidatesModule.shortlist('${candidate.id}', false)">
                                ✕ Reject
                            </button>
                        </div>
                    `;
                }
                break;
                
            case 'SHORTLISTED':
                if (Auth.hasPermission('CALL_SCREENING')) {
                    html = `
                        <button class="btn btn-primary btn-lg" onclick="CandidatesModule.moveToCall('${candidate.id}')">
                            📞 Move to Call Screening
                        </button>
                    `;
                }
                break;
                
            case 'ON_CALL':
                if (Auth.hasPermission('CALL_SCREENING')) {
                    html = `
                        <button class="btn btn-primary btn-lg" onclick="CallsModule.openCallModal('${candidate.id}')">
                            📞 Log Call
                        </button>
                    `;
                }
                break;
                
            case 'OWNER_REVIEW':
                if (Auth.hasAnyRole(['OWNER', 'ADMIN'])) {
                    html = `
                        <div class="flex gap-3">
                            <button class="btn btn-success btn-lg" onclick="CandidatesModule.ownerDecision('${candidate.id}', 'APPROVE')">
                                ✓ Approve for Interview
                            </button>
                            <button class="btn btn-warning btn-lg" onclick="CandidatesModule.ownerDecision('${candidate.id}', 'HOLD')">
                                ⏸ Hold
                            </button>
                            <button class="btn btn-danger btn-lg" onclick="CandidatesModule.ownerDecision('${candidate.id}', 'REJECT')">
                                ✕ Reject
                            </button>
                        </div>
                    `;
                }
                break;
                
            default:
                html = `<p class="text-muted">No actions available for current status.</p>`;
        }
        
        return html;
    };

    /**
     * Render candidate history
     */
    const renderCandidateHistory = () => {
        const container = document.getElementById('candidate-history');
        if (!container || !currentCandidate?.history) return;
        
        if (currentCandidate.history.length === 0) {
            container.innerHTML = '<p class="text-muted">No history yet</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="timeline">
                ${currentCandidate.history.map(h => `
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <p class="timeline-text"><strong>${h.action}</strong></p>
                            <span class="timeline-date">${Utils.formatDate(h.timestamp, 'DD MMM, HH:mm')}</span>
                            ${h.by ? `<span class="text-muted"> by ${h.by}</span>` : ''}
                            ${h.remark ? `<p class="mt-1 text-sm text-muted">${h.remark}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Search
        const searchInput = document.getElementById('candidate-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                State.setFilters('candidates', {
                    ...State.getFilters('candidates'),
                    search: e.target.value
                });
                loadCandidates();
            }, 300));
        }
        
        // Status filter
        const statusFilter = document.getElementById('candidate-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                State.setFilters('candidates', {
                    ...State.getFilters('candidates'),
                    status: e.target.value
                });
                loadCandidates();
            });
        }
    };

    /**
     * Setup add form event listeners
     */
    const setupAddFormListeners = () => {
        // Single add form
        const form = document.getElementById('add-candidate-form');
        if (form) {
            form.addEventListener('submit', handleAddCandidate);
        }
        
        // CV upload preview
        const cvInput = document.querySelector('input[name="cv"]');
        if (cvInput) {
            cvInput.addEventListener('change', handleCVPreview);
        }
        
        // Bulk upload
        const bulkInput = document.getElementById('bulk-cv-input');
        if (bulkInput) {
            bulkInput.addEventListener('change', handleBulkUploadPreview);
        }
        
        // Drag and drop
        setupDragAndDrop();
    };

    /**
     * Setup drag and drop
     */
    const setupDragAndDrop = () => {
        const uploadAreas = document.querySelectorAll('.file-upload');
        
        uploadAreas.forEach(area => {
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('dragover');
            });
            
            area.addEventListener('dragleave', () => {
                area.classList.remove('dragover');
            });
            
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('dragover');
                
                const input = area.querySelector('input[type="file"]');
                if (input && e.dataTransfer.files.length) {
                    input.files = e.dataTransfer.files;
                    input.dispatchEvent(new Event('change'));
                }
            });
        });
    };

    /**
     * Handle CV preview
     */
    const handleCVPreview = (e) => {
        const file = e.target.files[0];
        const preview = document.getElementById('cv-preview');
        
        if (!file) {
            preview.innerHTML = '';
            return;
        }
        
        preview.innerHTML = `
            <div class="file-item">
                <div class="file-item-icon">📄</div>
                <div class="file-item-info">
                    <div class="file-item-name">${file.name}</div>
                    <div class="file-item-size">${Utils.formatFileSize(file.size)}</div>
                </div>
                <button class="file-item-remove" onclick="CandidatesModule.removeCVFile()">×</button>
            </div>
        `;
    };

    /**
     * Handle bulk upload preview
     */
    const handleBulkUploadPreview = (e) => {
        const files = Array.from(e.target.files);
        const preview = document.getElementById('bulk-preview');
        const actions = document.getElementById('bulk-actions');
        
        if (files.length === 0) {
            preview.innerHTML = '';
            actions.classList.add('hidden');
            return;
        }
        
        const parsedFiles = files.map(file => {
            const parsed = Utils.parseCVFilename(file.name);
            return {
                file,
                parsed,
                valid: !!parsed
            };
        });
        
        const validCount = parsedFiles.filter(f => f.valid).length;
        const invalidCount = parsedFiles.length - validCount;
        
        preview.innerHTML = `
            <div class="mb-3">
                <span class="badge badge-success">${validCount} valid</span>
                ${invalidCount > 0 ? `<span class="badge badge-danger ml-2">${invalidCount} invalid</span>` : ''}
            </div>
            <div class="file-list">
                ${parsedFiles.map((f, i) => `
                    <div class="file-item ${f.valid ? '' : 'bg-danger-50'}">
                        <div class="file-item-icon">${f.valid ? '✓' : '✕'}</div>
                        <div class="file-item-info">
                            <div class="file-item-name">${f.file.name}</div>
                            ${f.valid ? `
                                <div class="file-item-size">
                                    ${f.parsed.name} • ${f.parsed.mobile} • ${f.parsed.source}
                                </div>
                            ` : `
                                <div class="file-item-size text-danger">
                                    Invalid format. Expected: Name_Mobile_Source.pdf
                                </div>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        actions.classList.remove('hidden');
    };

    /**
     * Remove CV file
     */
    const removeCVFile = () => {
        const input = document.querySelector('input[name="cv"]');
        const preview = document.getElementById('cv-preview');
        
        if (input) input.value = '';
        if (preview) preview.innerHTML = '';
    };

    /**
     * Clear bulk upload
     */
    const clearBulkUpload = () => {
        const input = document.getElementById('bulk-cv-input');
        const preview = document.getElementById('bulk-preview');
        const actions = document.getElementById('bulk-actions');
        
        if (input) input.value = '';
        if (preview) preview.innerHTML = '';
        if (actions) actions.classList.add('hidden');
    };

    /**
     * Handle add candidate form
     */
    const handleAddCandidate = async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const formData = Utils.getFormData(form);
        
        // Validate
        const { isValid } = Utils.validateForm(form, {
            name: { required: true },
            mobile: { required: true, pattern: /^\d{10}$/, patternMessage: 'Enter valid 10-digit mobile' },
            jobRole: { required: true }
        });
        
        if (!isValid) return;
        
        try {
            Utils.showLoader('Adding candidate...');
            
            // Handle file upload
            const cvInput = document.querySelector('input[name="cv"]');
            if (cvInput?.files[0]) {
                formData.cvFile = await Utils.fileToBase64(cvInput.files[0]);
                formData.cvFileName = cvInput.files[0].name;
            }
            
            const result = await API.candidates.add(formData);
            
            if (result.success) {
                // Show relevance popup
                showRelevancePopup(result.data.id);
            } else {
                Utils.toast(result.error || 'Failed to add candidate', 'error');
            }
        } catch (error) {
            console.error('Add candidate error:', error);
            Utils.toast('Error adding candidate', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Show relevance popup after adding candidate
     */
    const showRelevancePopup = (candidateId) => {
        const modalHTML = `
            <div id="relevance-modal" class="modal-backdrop active">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Is CV Relevant?</h3>
                    </div>
                    <div class="modal-body text-center">
                        <p class="mb-4">Review the CV and decide if it matches the job requirements.</p>
                        <div class="flex gap-4 justify-center">
                            <button class="btn btn-success btn-lg" onclick="CandidatesModule.handleRelevance('${candidateId}', true)">
                                ✓ Yes, Relevant
                            </button>
                            <button class="btn btn-danger btn-lg" onclick="CandidatesModule.handleRelevance('${candidateId}', false)">
                                ✕ No, Not Relevant
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    /**
     * Handle relevance decision
     */
    const handleRelevance = async (candidateId, isRelevant) => {
        // Close modal
        document.getElementById('relevance-modal')?.remove();
        
        if (isRelevant) {
            Utils.toast('Candidate added and marked as relevant!', 'success');
            Router.navigate('candidates');
        } else {
            try {
                await API.candidates.shortlist(candidateId, false, 'CV not relevant');
                Utils.toast('Candidate rejected and moved to rejection log', 'info');
                Router.navigate('candidates');
            } catch (error) {
                console.error('Reject error:', error);
            }
        }
    };

    /**
     * Process bulk upload
     */
    const processBulkUpload = async () => {
        const input = document.getElementById('bulk-cv-input');
        if (!input?.files?.length) return;
        
        const files = Array.from(input.files);
        const validFiles = files.filter(f => Utils.parseCVFilename(f.name));
        
        if (validFiles.length === 0) {
            Utils.toast('No valid files to upload', 'error');
            return;
        }
        
        try {
            Utils.showLoader(`Uploading ${validFiles.length} candidates...`);
            
            const candidates = await Promise.all(validFiles.map(async file => {
                const parsed = Utils.parseCVFilename(file.name);
                const cvData = await Utils.fileToBase64(file);
                
                return {
                    name: parsed.name,
                    mobile: parsed.mobile,
                    source: parsed.source,
                    cvFile: cvData,
                    cvFileName: file.name
                };
            }));
            
            const result = await API.candidates.bulkAdd(candidates);
            
            if (result.success) {
                Utils.toast(`Successfully added ${result.data.count} candidates!`, 'success');
                clearBulkUpload();
                Router.navigate('candidates');
            } else {
                Utils.toast(result.error || 'Some uploads failed', 'warning');
            }
        } catch (error) {
            console.error('Bulk upload error:', error);
            Utils.toast('Error processing bulk upload', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * View candidate detail
     */
    const viewDetail = (id) => {
        Router.navigate(`candidates/${id}`);
    };

    /**
     * Shortlist/Reject candidate
     */
    const shortlist = async (id, approve) => {
        const remark = approve ? '' : prompt('Reason for rejection:');
        if (!approve && remark === null) return;
        
        try {
            Utils.showLoader(approve ? 'Shortlisting...' : 'Rejecting...');
            
            const result = await API.candidates.shortlist(id, approve, remark || '');
            
            if (result.success) {
                Utils.toast(approve ? 'Candidate shortlisted!' : 'Candidate rejected', approve ? 'success' : 'info');
                loadCandidates();
            } else {
                Utils.toast(result.error || 'Action failed', 'error');
            }
        } catch (error) {
            console.error('Shortlist error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Move to call screening
     */
    const moveToCall = async (id) => {
        try {
            Utils.showLoader('Moving to call screening...');
            
            const result = await API.candidates.update(id, { status: 'ON_CALL' });
            
            if (result.success) {
                Utils.toast('Moved to call screening!', 'success');
                loadCandidates();
            } else {
                Utils.toast(result.error || 'Action failed', 'error');
            }
        } catch (error) {
            console.error('Move to call error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Owner decision
     */
    const ownerDecision = async (id, decision) => {
        const remark = decision === 'REJECT' ? prompt('Reason for rejection:') : '';
        if (decision === 'REJECT' && remark === null) return;
        
        try {
            Utils.showLoader('Processing decision...');
            
            const result = await API.interviews.ownerDecision(id, decision, remark || '');
            
            if (result.success) {
                Utils.toast(`Decision: ${decision}`, 'success');
                loadCandidateDetail(id);
            } else {
                Utils.toast(result.error || 'Action failed', 'error');
            }
        } catch (error) {
            console.error('Owner decision error:', error);
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Toggle select all
     */
    const toggleSelectAll = (checked) => {
        if (checked) {
            candidates.forEach(c => selectedCandidates.add(c.id));
        } else {
            selectedCandidates.clear();
        }
        renderCandidatesList();
    };

    /**
     * Toggle select single candidate
     */
    const toggleSelectCandidate = (id, checked) => {
        if (checked) {
            selectedCandidates.add(id);
        } else {
            selectedCandidates.delete(id);
        }
        renderCandidatesList();
    };

    /**
     * Clear selection
     */
    const clearSelection = () => {
        selectedCandidates.clear();
        renderCandidatesList();
    };

    /**
     * Bulk shortlist
     */
    const bulkShortlist = async (approve) => {
        if (selectedCandidates.size === 0) return;
        
        if (!confirm(`Are you sure you want to ${approve ? 'shortlist' : 'reject'} ${selectedCandidates.size} candidates?`)) {
            return;
        }
        
        try {
            Utils.showLoader(`Processing ${selectedCandidates.size} candidates...`);
            
            const promises = Array.from(selectedCandidates).map(id => 
                API.candidates.shortlist(id, approve, approve ? '' : 'Bulk rejection')
            );
            
            await Promise.all(promises);
            
            Utils.toast(`${selectedCandidates.size} candidates ${approve ? 'shortlisted' : 'rejected'}!`, 'success');
            selectedCandidates.clear();
            loadCandidates();
        } catch (error) {
            console.error('Bulk shortlist error:', error);
            Utils.toast('Some operations failed', 'warning');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Go to page
     */
    const goToPage = (page) => {
        State.setPagination('candidates', {
            ...State.getPagination('candidates'),
            page
        });
        loadCandidates();
    };

    /**
     * Setup detail event listeners
     */
    const setupDetailEventListeners = () => {
        // Any detail-specific event listeners
    };

    // Public interface
    return {
        init,
        initAddForm,
        initDetail,
        loadCandidates,
        viewDetail,
        shortlist,
        moveToCall,
        ownerDecision,
        toggleSelectAll,
        toggleSelectCandidate,
        clearSelection,
        bulkShortlist,
        goToPage,
        removeCVFile,
        clearBulkUpload,
        processBulkUpload,
        handleRelevance,
        showBulkUploadModal: () => Router.navigate('candidates/add')
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CandidatesModule;
}
