/**
 * ============================================
 * HRMS/ATS SYSTEM - REQUIREMENTS MODULE
 * Requirement creation, review, and approval
 * ============================================
 */

const RequirementsModule = (() => {
    // Module state
    let requirements = [];
    let templates = [];
    let currentRequirement = null;

    /**
     * Initialize requirements list
     */
    const init = async () => {
        console.log('Initializing Requirements Module');
        
        // Load templates for dropdown
        await loadTemplates();
        
        // Load requirements
        await loadRequirements();
        
        // Setup event listeners
        setupEventListeners();
    };

    /**
     * Initialize form for new requirement
     */
    const initForm = async () => {
        console.log('Initializing Requirement Form');
        
        await loadTemplates();
        renderForm();
        setupFormEventListeners();
    };

    /**
     * Initialize requirement detail view
     */
    const initDetail = async (id) => {
        console.log('Initializing Requirement Detail:', id);
        
        await loadRequirementDetail(id);
        setupDetailEventListeners();
    };

    /**
     * Load job templates
     */
    const loadTemplates = async () => {
        try {
            const result = await API.templates.getAll();
            if (result.success) {
                templates = result.data || [];
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    };

    /**
     * Load requirements list
     */
    const loadRequirements = async () => {
        const container = document.getElementById('requirements-list');
        if (!container) return;
        
        try {
            State.setLoading('requirements', true);
            
            const filters = State.getFilters('requirements');
            const pagination = State.getPagination('requirements');
            
            const result = await API.requirements.getAll({
                ...filters,
                page: pagination.page,
                pageSize: pagination.pageSize
            });
            
            if (result.success) {
                requirements = result.data || [];
                State.setData('requirements', requirements);
                State.setPagination('requirements', {
                    ...pagination,
                    total: result.total || 0
                });
                
                renderRequirementsList();
            } else {
                Utils.toast(result.error || 'Failed to load requirements', 'error');
            }
        } catch (error) {
            console.error('Error loading requirements:', error);
            Utils.toast('Error loading requirements', 'error');
        } finally {
            State.setLoading('requirements', false);
        }
    };

    /**
     * Load single requirement detail
     */
    const loadRequirementDetail = async (id) => {
        try {
            Utils.showLoader('Loading requirement...');
            
            const result = await API.requirements.getById(id);
            
            if (result.success) {
                currentRequirement = result.data;
                renderRequirementDetail();
            } else {
                Utils.toast(result.error || 'Failed to load requirement', 'error');
                Router.navigate('requirements');
            }
        } catch (error) {
            console.error('Error loading requirement:', error);
            Utils.toast('Error loading requirement', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render requirements list
     */
    const renderRequirementsList = () => {
        const container = document.getElementById('requirements-list');
        if (!container) return;
        
        const role = Auth.getUserRole();
        
        if (requirements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3 class="empty-state-title">No Requirements Found</h3>
                    <p class="empty-state-description">
                        ${role === 'EA' ? 'You haven\'t created any requirements yet.' : 'No requirements match your filters.'}
                    </p>
                    ${Auth.hasPermission('REQUIREMENT_CREATE') ? `
                        <button class="btn btn-primary" data-route="requirements/new">
                            + Raise New Requirement
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
                        <h3 class="table-title">Requirements</h3>
                        <p class="table-subtitle">Manage job requirements</p>
                    </div>
                    <div class="table-toolbar">
                        <div class="table-search">
                            <svg class="table-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                            </svg>
                            <input type="text" id="requirement-search" placeholder="Search requirements..." value="${State.getFilters('requirements').search || ''}">
                        </div>
                        <select id="requirement-status-filter" class="form-select" style="width: auto;">
                            <option value="">All Status</option>
                            <option value="PENDING_HR_REVIEW">Pending HR Review</option>
                            <option value="NEED_CLARIFICATION">Need Clarification</option>
                            <option value="APPROVED">Approved</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Job Role</th>
                                <th>Department</th>
                                <th>Positions</th>
                                <th>Status</th>
                                <th>Created By</th>
                                <th>Created Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${requirements.map(req => renderRequirementRow(req, role)).join('')}
                        </tbody>
                    </table>
                </div>
                ${renderPagination()}
            </div>
        `;
        
        container.innerHTML = tableHTML;
    };

    /**
     * Render single requirement row
     */
    const renderRequirementRow = (req, role) => {
        const canApprove = Auth.hasPermission('REQUIREMENT_APPROVE') && req.status === 'PENDING_HR_REVIEW';
        const canEdit = Auth.hasPermission('REQUIREMENT_EDIT') && 
                       (req.status === 'DRAFT' || req.status === 'NEED_CLARIFICATION');
        
        return `
            <tr data-id="${req.id}">
                <td><strong>${req.id}</strong></td>
                <td>${req.jobRole}</td>
                <td>${req.department || '-'}</td>
                <td>${req.positions || 1}</td>
                <td>${Utils.getStatusBadge(req.status)}</td>
                <td>${req.createdBy}</td>
                <td>${Utils.formatDate(req.createdAt)}</td>
                <td class="cell-actions">
                    <button class="btn btn-sm btn-ghost" onclick="RequirementsModule.viewDetail('${req.id}')" title="View">
                        👁️
                    </button>
                    ${canEdit ? `
                        <button class="btn btn-sm btn-ghost" onclick="RequirementsModule.editRequirement('${req.id}')" title="Edit">
                            ✏️
                        </button>
                    ` : ''}
                    ${canApprove ? `
                        <button class="btn btn-sm btn-success" onclick="RequirementsModule.approveRequirement('${req.id}')" title="Approve">
                            ✓
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="RequirementsModule.sendBackRequirement('${req.id}')" title="Send Back">
                            ↩️
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    };

    /**
     * Render pagination
     */
    const renderPagination = () => {
        const pagination = State.getPagination('requirements');
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
                    of ${pagination.total} requirements
                </div>
                <div class="pagination">
                    <button class="pagination-btn" ${pagination.page === 1 ? 'disabled' : ''} 
                            onclick="RequirementsModule.goToPage(${pagination.page - 1})">
                        ←
                    </button>
                    ${pages.map(p => p === '...' ? 
                        '<span class="pagination-ellipsis">...</span>' :
                        `<button class="pagination-btn ${p === pagination.page ? 'active' : ''}" 
                                 onclick="RequirementsModule.goToPage(${p})">${p}</button>`
                    ).join('')}
                    <button class="pagination-btn" ${pagination.page === totalPages ? 'disabled' : ''} 
                            onclick="RequirementsModule.goToPage(${pagination.page + 1})">
                        →
                    </button>
                </div>
            </div>
        `;
    };

    /**
     * Render requirement form
     */
    const renderForm = () => {
        const container = document.getElementById('requirement-form-container');
        if (!container) return;
        
        const templateOptions = templates.map(t => 
            `<option value="${t.id}" data-template='${JSON.stringify(t)}'>${t.jobRole}</option>`
        ).join('');
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Raise New Requirement</h3>
                </div>
                <div class="card-body">
                    <form id="requirement-form" class="form">
                        <div class="form-section">
                            <h4 class="form-section-title">Job Details</h4>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label form-label-required">Job Role</label>
                                    <select name="jobRole" id="job-role-select" class="form-select" required>
                                        <option value="">Select Job Role</option>
                                        ${templateOptions}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label form-label-required">Number of Positions</label>
                                    <input type="number" name="positions" class="form-input" min="1" value="1" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Department</label>
                                    <input type="text" name="department" id="department" class="form-input" placeholder="e.g., Sales, Accounts">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Location</label>
                                    <input type="text" name="location" id="location" class="form-input" placeholder="e.g., Mumbai, Delhi">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4 class="form-section-title">Requirements</h4>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Experience (Years)</label>
                                    <div class="flex gap-2">
                                        <input type="number" name="expMin" id="exp-min" class="form-input" placeholder="Min" min="0">
                                        <span class="flex items-center">to</span>
                                        <input type="number" name="expMax" id="exp-max" class="form-input" placeholder="Max" min="0">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Salary Range (Monthly)</label>
                                    <div class="flex gap-2">
                                        <input type="number" name="salaryMin" id="salary-min" class="form-input" placeholder="Min">
                                        <span class="flex items-center">to</span>
                                        <input type="number" name="salaryMax" id="salary-max" class="form-input" placeholder="Max">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Required Skills</label>
                                <textarea name="skills" id="skills" class="form-textarea" placeholder="Enter required skills (comma separated)"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Qualifications</label>
                                <textarea name="qualifications" id="qualifications" class="form-textarea" placeholder="Enter required qualifications"></textarea>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4 class="form-section-title">Job Description</h4>
                            
                            <div class="form-group">
                                <label class="form-label form-label-required">Job Description</label>
                                <textarea name="description" id="description" class="form-textarea form-textarea-lg" 
                                          placeholder="Enter detailed job description" required></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Additional Remarks</label>
                                <textarea name="remarks" class="form-textarea" placeholder="Any additional notes or remarks"></textarea>
                            </div>
                        </div>
                        
                        <div class="form-actions form-actions-between">
                            <button type="button" class="btn btn-secondary" onclick="Router.back()">Cancel</button>
                            <div class="flex gap-3">
                                <button type="button" class="btn btn-secondary" onclick="RequirementsModule.saveDraft()">
                                    Save as Draft
                                </button>
                                <button type="submit" class="btn btn-primary">Submit for Review</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
    };

    /**
     * Render requirement detail
     */
    const renderRequirementDetail = () => {
        const container = document.getElementById('requirement-detail-container');
        if (!container || !currentRequirement) return;
        
        const req = currentRequirement;
        const canApprove = Auth.hasPermission('REQUIREMENT_APPROVE') && req.status === 'PENDING_HR_REVIEW';
        const canEdit = Auth.hasPermission('REQUIREMENT_EDIT') && 
                       (req.status === 'DRAFT' || req.status === 'NEED_CLARIFICATION');
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-info">
                    <h1>Requirement: ${req.id}</h1>
                    <p>${req.jobRole} - ${req.department || 'General'}</p>
                </div>
                <div class="page-actions">
                    ${canEdit ? `
                        <button class="btn btn-secondary" onclick="RequirementsModule.editRequirement('${req.id}')">
                            ✏️ Edit
                        </button>
                    ` : ''}
                    ${canApprove ? `
                        <button class="btn btn-warning" onclick="RequirementsModule.sendBackRequirement('${req.id}')">
                            ↩️ Send Back
                        </button>
                        <button class="btn btn-success" onclick="RequirementsModule.approveRequirement('${req.id}')">
                            ✓ Approve
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-6">
                <div class="card" style="grid-column: span 2;">
                    <div class="card-header">
                        <h3>Requirement Details</h3>
                    </div>
                    <div class="card-body">
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label class="text-muted text-sm">Status</label>
                                <div class="mt-1">${Utils.getStatusBadge(req.status)}</div>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Positions</label>
                                <div class="mt-1"><strong>${req.positions || 1}</strong></div>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Experience Required</label>
                                <div class="mt-1">${req.expMin || 0} - ${req.expMax || 'Any'} years</div>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Salary Range</label>
                                <div class="mt-1">${req.salaryMin ? Utils.formatCurrency(req.salaryMin) : 'N/A'} - ${req.salaryMax ? Utils.formatCurrency(req.salaryMax) : 'N/A'}</div>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Location</label>
                                <div class="mt-1">${req.location || 'Not specified'}</div>
                            </div>
                            <div>
                                <label class="text-muted text-sm">Department</label>
                                <div class="mt-1">${req.department || 'Not specified'}</div>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <label class="text-muted text-sm">Required Skills</label>
                            <div class="mt-1 flex flex-wrap gap-2">
                                ${(req.skills || '').split(',').filter(s => s.trim()).map(skill => 
                                    `<span class="badge badge-primary">${skill.trim()}</span>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <label class="text-muted text-sm">Qualifications</label>
                            <p class="mt-1">${req.qualifications || 'Not specified'}</p>
                        </div>
                        
                        <div>
                            <label class="text-muted text-sm">Job Description</label>
                            <div class="mt-1 p-4 bg-gray-50 rounded-lg">
                                ${(req.description || '').replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3>Activity</h3>
                    </div>
                    <div class="card-body">
                        <div class="timeline">
                            ${(req.history || []).map(h => `
                                <div class="timeline-item">
                                    <div class="timeline-dot"></div>
                                    <div class="timeline-content">
                                        <p class="timeline-text">${h.action}</p>
                                        <span class="timeline-date">${Utils.formatDate(h.timestamp, 'DD MMM, HH:mm')} by ${h.by}</span>
                                        ${h.remark ? `<p class="timeline-remark">${h.remark}</p>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Search
        const searchInput = document.getElementById('requirement-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                State.setFilters('requirements', {
                    ...State.getFilters('requirements'),
                    search: e.target.value
                });
                loadRequirements();
            }, 300));
        }
        
        // Status filter
        const statusFilter = document.getElementById('requirement-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                State.setFilters('requirements', {
                    ...State.getFilters('requirements'),
                    status: e.target.value
                });
                loadRequirements();
            });
        }
    };

    /**
     * Setup form event listeners
     */
    const setupFormEventListeners = () => {
        // Job role template auto-fill
        const jobRoleSelect = document.getElementById('job-role-select');
        if (jobRoleSelect) {
            jobRoleSelect.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                const templateData = selectedOption?.dataset?.template;
                
                if (templateData) {
                    const template = JSON.parse(templateData);
                    autoFillFromTemplate(template);
                }
            });
        }
        
        // Form submission
        const form = document.getElementById('requirement-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    };

    /**
     * Auto-fill form from template
     */
    const autoFillFromTemplate = (template) => {
        if (template.department) {
            document.getElementById('department').value = template.department;
        }
        if (template.location) {
            document.getElementById('location').value = template.location;
        }
        if (template.expMin !== undefined) {
            document.getElementById('exp-min').value = template.expMin;
        }
        if (template.expMax !== undefined) {
            document.getElementById('exp-max').value = template.expMax;
        }
        if (template.salaryMin !== undefined) {
            document.getElementById('salary-min').value = template.salaryMin;
        }
        if (template.salaryMax !== undefined) {
            document.getElementById('salary-max').value = template.salaryMax;
        }
        if (template.skills) {
            document.getElementById('skills').value = template.skills;
        }
        if (template.qualifications) {
            document.getElementById('qualifications').value = template.qualifications;
        }
        if (template.description) {
            document.getElementById('description').value = template.description;
        }
    };

    /**
     * Handle form submission
     */
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const formData = Utils.getFormData(form);
        
        // Validate
        const { isValid } = Utils.validateForm(form, {
            jobRole: { required: true },
            positions: { required: true },
            description: { required: true }
        });
        
        if (!isValid) return;
        
        try {
            Utils.showLoader('Submitting requirement...');
            
            const result = await API.requirements.create({
                ...formData,
                status: 'PENDING_HR_REVIEW'
            });
            
            if (result.success) {
                Utils.toast('Requirement submitted for review!', 'success');
                Router.navigate('requirements');
            } else {
                Utils.toast(result.error || 'Failed to submit requirement', 'error');
            }
        } catch (error) {
            console.error('Submit error:', error);
            Utils.toast('Error submitting requirement', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Save as draft
     */
    const saveDraft = async () => {
        const form = document.getElementById('requirement-form');
        const formData = Utils.getFormData(form);
        
        try {
            Utils.showLoader('Saving draft...');
            
            const result = await API.requirements.create({
                ...formData,
                status: 'DRAFT'
            });
            
            if (result.success) {
                Utils.toast('Draft saved!', 'success');
            } else {
                Utils.toast(result.error || 'Failed to save draft', 'error');
            }
        } catch (error) {
            console.error('Save draft error:', error);
            Utils.toast('Error saving draft', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * View requirement detail
     */
    const viewDetail = (id) => {
        Router.navigate(`requirements/${id}`);
    };

    /**
     * Edit requirement
     */
    const editRequirement = (id) => {
        Router.navigate(`requirements/${id}/edit`);
    };

    /**
     * Approve requirement
     */
    const approveRequirement = async (id) => {
        if (!confirm('Are you sure you want to approve this requirement?')) return;
        
        try {
            Utils.showLoader('Approving...');
            
            const result = await API.requirements.approve(id);
            
            if (result.success) {
                Utils.toast('Requirement approved!', 'success');
                loadRequirements();
            } else {
                Utils.toast(result.error || 'Failed to approve', 'error');
            }
        } catch (error) {
            console.error('Approve error:', error);
            Utils.toast('Error approving requirement', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Send back requirement
     */
    const sendBackRequirement = async (id) => {
        const remark = prompt('Please provide a reason for sending back:');
        if (remark === null) return;
        
        if (!remark.trim()) {
            Utils.toast('Remark is required', 'warning');
            return;
        }
        
        try {
            Utils.showLoader('Sending back...');
            
            const result = await API.requirements.sendBack(id, remark);
            
            if (result.success) {
                Utils.toast('Requirement sent back!', 'success');
                loadRequirements();
            } else {
                Utils.toast(result.error || 'Failed to send back', 'error');
            }
        } catch (error) {
            console.error('Send back error:', error);
            Utils.toast('Error sending back requirement', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Go to page
     */
    const goToPage = (page) => {
        State.setPagination('requirements', {
            ...State.getPagination('requirements'),
            page
        });
        loadRequirements();
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
        initForm,
        initDetail,
        loadRequirements,
        viewDetail,
        editRequirement,
        approveRequirement,
        sendBackRequirement,
        saveDraft,
        goToPage
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RequirementsModule;
}
