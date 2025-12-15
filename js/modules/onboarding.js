/**
 * ============================================
 * HRMS/ATS SYSTEM - ONBOARDING MODULE
 * Document verification, joining, probation
 * ============================================
 */

const OnboardingModule = (() => {
    // Module state
    let selectedCandidates = [];
    let employees = [];
    let documents = [];
    let probationTracking = [];

    /**
     * Initialize onboarding list
     */
    const init = async () => {
        console.log('Initializing Onboarding Module');
        
        await loadSelectedCandidates();
        setupEventListeners();
    };

    /**
     * Initialize document verification
     */
    const initDocuments = async (candidateId) => {
        console.log('Initializing Document Verification:', candidateId);
        
        await loadDocuments(candidateId);
        setupDocumentListeners();
    };

    /**
     * Initialize probation tracking
     */
    const initProbation = async () => {
        console.log('Initializing Probation Tracking');
        
        await loadProbationTracking();
        setupProbationListeners();
    };

    /**
     * Load selected candidates (pending onboarding)
     */
    const loadSelectedCandidates = async () => {
        const container = document.getElementById('selected-candidates-list');
        if (!container) return;

        try {
            Utils.showLoader('Loading selected candidates...');
            
            const response = await API.request('GET_SELECTED_CANDIDATES', {
                filters: State.get('filters.onboarding') || {}
            });

            if (response.success) {
                selectedCandidates = response.data;
                renderSelectedCandidates(selectedCandidates);
                updateOnboardingStats();
            } else {
                Utils.showToast(response.error || 'Failed to load selected candidates', 'error');
                container.innerHTML = `<div class="empty-state">
                    <i class="icon-alert"></i>
                    <p>Failed to load candidates</p>
                </div>`;
            }
        } catch (error) {
            console.error('Error loading selected candidates:', error);
            Utils.showToast('Error loading candidates', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render selected candidates
     */
    const renderSelectedCandidates = (candidates) => {
        const container = document.getElementById('selected-candidates-list');
        if (!container) return;

        if (!candidates || candidates.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <i class="icon-users"></i>
                <p>No candidates selected for onboarding</p>
            </div>`;
            return;
        }

        const html = candidates.map(candidate => `
            <div class="onboarding-card" data-id="${candidate.id}">
                <div class="card-header">
                    <div class="candidate-info">
                        <h3>${Utils.escapeHtml(candidate.name)}</h3>
                        <span class="requirement-badge">${Utils.escapeHtml(candidate.requirementTitle)}</span>
                    </div>
                    <span class="status-badge status-${candidate.onboardingStatus.toLowerCase().replace('_', '-')}">
                        ${candidate.onboardingStatus.replace('_', ' ')}
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
                            <label>Selected Date:</label>
                            <span>${Utils.formatDate(candidate.selectedAt)}</span>
                        </div>
                        <div class="info-item">
                            <label>Expected Joining:</label>
                            <span>${candidate.expectedJoining ? Utils.formatDate(candidate.expectedJoining) : 'Not Set'}</span>
                        </div>
                    </div>

                    ${candidate.onboardingStatus === 'DOCUMENTS_PENDING' ? `
                        <div class="document-checklist">
                            <h4>Required Documents</h4>
                            <div class="checklist">
                                ${CONFIG.REQUIRED_DOCUMENTS.map(doc => {
                                    const uploaded = candidate.documents && candidate.documents.includes(doc.key);
                                    return `
                                        <div class="checklist-item ${uploaded ? 'checked' : ''}">
                                            <i class="icon-${uploaded ? 'check-circle' : 'circle'}"></i>
                                            <span>${doc.name}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${candidate.onboardingStatus === 'DOCUMENTS_VERIFIED' ? `
                        <div class="joining-info">
                            <p><i class="icon-info"></i> Documents verified. Set joining date to proceed.</p>
                        </div>
                    ` : ''}

                    ${candidate.onboardingStatus === 'JOINED' ? `
                        <div class="joined-info">
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Joined Date:</label>
                                    <span>${Utils.formatDate(candidate.joinedAt)}</span>
                                </div>
                                <div class="info-item">
                                    <label>Employee ID:</label>
                                    <span>${Utils.escapeHtml(candidate.employeeId)}</span>
                                </div>
                                <div class="info-item">
                                    <label>Probation End:</label>
                                    <span>${Utils.formatDate(candidate.probationEnd)}</span>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="card-actions">
                    ${candidate.onboardingStatus === 'DOCUMENTS_PENDING' ? `
                        <button class="btn btn-primary btn-sm" onclick="OnboardingModule.uploadDocuments('${candidate.id}')">
                            <i class="icon-upload"></i> Upload Documents
                        </button>
                    ` : ''}
                    
                    ${candidate.onboardingStatus === 'DOCUMENTS_UPLOADED' ? `
                        <button class="btn btn-primary btn-sm" onclick="OnboardingModule.verifyDocuments('${candidate.id}')">
                            <i class="icon-check"></i> Verify Documents
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="OnboardingModule.viewDocuments('${candidate.id}')">
                            <i class="icon-eye"></i> View Documents
                        </button>
                    ` : ''}
                    
                    ${candidate.onboardingStatus === 'DOCUMENTS_VERIFIED' ? `
                        <button class="btn btn-success btn-sm" onclick="OnboardingModule.setJoiningDate('${candidate.id}')">
                            <i class="icon-calendar"></i> Set Joining Date
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="OnboardingModule.viewDocuments('${candidate.id}')">
                            <i class="icon-eye"></i> View Documents
                        </button>
                    ` : ''}
                    
                    ${candidate.onboardingStatus === 'JOINING_SCHEDULED' ? `
                        <button class="btn btn-success btn-sm" onclick="OnboardingModule.confirmJoining('${candidate.id}')">
                            <i class="icon-user-check"></i> Confirm Joining
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="OnboardingModule.postponeJoining('${candidate.id}')">
                            <i class="icon-clock"></i> Postpone
                        </button>
                    ` : ''}
                    
                    ${candidate.onboardingStatus === 'JOINED' ? `
                        <button class="btn btn-primary btn-sm" onclick="OnboardingModule.viewEmployeeProfile('${candidate.employeeId}')">
                            <i class="icon-user"></i> View Profile
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="OnboardingModule.trackProbation('${candidate.employeeId}')">
                            <i class="icon-trending-up"></i> Probation
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    };

    /**
     * Upload documents
     */
    const uploadDocuments = async (candidateId) => {
        const candidate = selectedCandidates.find(c => c.id === candidateId);
        if (!candidate) return;

        const modal = Utils.createModal({
            title: 'Upload Documents',
            size: 'large',
            content: `
                <form id="upload-documents-form" enctype="multipart/form-data">
                    <input type="hidden" name="candidateId" value="${candidateId}">
                    
                    <div class="document-upload-list">
                        ${CONFIG.REQUIRED_DOCUMENTS.map(doc => `
                            <div class="document-upload-item">
                                <div class="document-info">
                                    <h4>${doc.name}</h4>
                                    <p class="text-muted">${doc.description}</p>
                                </div>
                                <div class="file-input-wrapper">
                                    <input type="file" name="doc_${doc.key}" 
                                           accept="${doc.accept || '.pdf,.jpg,.jpeg,.png'}"
                                           ${doc.required ? 'required' : ''}>
                                    <label>
                                        <i class="icon-upload"></i>
                                        Choose File
                                    </label>
                                    <span class="file-name">No file chosen</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="form-group">
                        <label>Notes</label>
                        <textarea name="notes" rows="2" placeholder="Any additional notes..."></textarea>
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
                    text: 'Upload Documents',
                    class: 'btn-primary',
                    onClick: async (modal) => {
                        const form = document.getElementById('upload-documents-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        await performDocumentUpload(form, modal);
                    }
                }
            ]
        });

        // File input change handlers
        const fileInputs = modal.element.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const fileName = e.target.files[0]?.name || 'No file chosen';
                const label = e.target.parentElement.querySelector('.file-name');
                if (label) label.textContent = fileName;
            });
        });
    };

    /**
     * Perform document upload
     */
    const performDocumentUpload = async (form, modal) => {
        try {
            Utils.showLoader('Uploading documents...');
            
            const formData = new FormData(form);
            
            // Convert to base64 for Google Apps Script
            const files = {};
            for (let [key, value] of formData.entries()) {
                if (key.startsWith('doc_') && value instanceof File) {
                    files[key] = await Utils.fileToBase64(value);
                }
            }

            const response = await API.request('UPLOAD_DOCUMENTS', {
                candidateId: formData.get('candidateId'),
                documents: files,
                notes: formData.get('notes')
            });

            if (response.success) {
                Utils.showToast('Documents uploaded successfully', 'success');
                modal.close();
                await loadSelectedCandidates();
            } else {
                Utils.showToast(response.error || 'Failed to upload documents', 'error');
            }
        } catch (error) {
            console.error('Error uploading documents:', error);
            Utils.showToast('Error uploading documents', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * View documents
     */
    const viewDocuments = async (candidateId) => {
        const candidate = selectedCandidates.find(c => c.id === candidateId);
        if (!candidate) return;

        try {
            Utils.showLoader('Loading documents...');
            
            const response = await API.request('GET_CANDIDATE_DOCUMENTS', {
                candidateId: candidateId
            });

            if (response.success) {
                showDocumentsModal(candidate, response.data);
            } else {
                Utils.showToast(response.error || 'Failed to load documents', 'error');
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            Utils.showToast('Error loading documents', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Show documents modal
     */
    const showDocumentsModal = (candidate, documents) => {
        Utils.createModal({
            title: `Documents - ${candidate.name}`,
            size: 'large',
            content: `
                <div class="documents-viewer">
                    ${documents.map(doc => `
                        <div class="document-card">
                            <div class="document-header">
                                <h4>${doc.documentName}</h4>
                                <span class="status-badge status-${doc.status.toLowerCase()}">
                                    ${doc.status}
                                </span>
                            </div>
                            <div class="document-body">
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Uploaded:</label>
                                        <span>${Utils.formatDate(doc.uploadedAt)}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Uploaded By:</label>
                                        <span>${Utils.escapeHtml(doc.uploadedBy)}</span>
                                    </div>
                                    ${doc.verifiedAt ? `
                                        <div class="info-item">
                                            <label>Verified:</label>
                                            <span>${Utils.formatDate(doc.verifiedAt)}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Verified By:</label>
                                            <span>${Utils.escapeHtml(doc.verifiedBy)}</span>
                                        </div>
                                    ` : ''}
                                </div>
                                ${doc.remark ? `
                                    <div class="document-remark">
                                        <label>Remark:</label>
                                        <p>${Utils.escapeHtml(doc.remark)}</p>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="document-actions">
                                <button class="btn btn-sm btn-primary" onclick="OnboardingModule.downloadDocument('${doc.id}')">
                                    <i class="icon-download"></i> Download
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="OnboardingModule.viewDocument('${doc.id}')">
                                    <i class="icon-eye"></i> View
                                </button>
                            </div>
                        </div>
                    `).join('')}
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
     * Verify documents
     */
    const verifyDocuments = async (candidateId) => {
        const candidate = selectedCandidates.find(c => c.id === candidateId);
        if (!candidate) return;

        try {
            Utils.showLoader('Loading documents...');
            
            const response = await API.request('GET_CANDIDATE_DOCUMENTS', {
                candidateId: candidateId
            });

            if (response.success) {
                showDocumentVerificationModal(candidate, response.data);
            } else {
                Utils.showToast(response.error || 'Failed to load documents', 'error');
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            Utils.showToast('Error loading documents', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Show document verification modal
     */
    const showDocumentVerificationModal = (candidate, documents) => {
        const modal = Utils.createModal({
            title: `Verify Documents - ${candidate.name}`,
            size: 'large',
            content: `
                <form id="verify-documents-form">
                    <input type="hidden" name="candidateId" value="${candidate.id}">
                    
                    <div class="documents-verification-list">
                        ${documents.map((doc, index) => `
                            <div class="document-verification-item">
                                <div class="document-info">
                                    <h4>${doc.documentName}</h4>
                                    <p class="text-muted">Uploaded: ${Utils.formatDate(doc.uploadedAt)}</p>
                                </div>
                                <div class="verification-actions">
                                    <button type="button" class="btn btn-sm btn-primary" 
                                            onclick="OnboardingModule.viewDocument('${doc.id}')">
                                        <i class="icon-eye"></i> View
                                    </button>
                                    <div class="verification-status">
                                        <label>
                                            <input type="radio" name="doc_${index}_status" value="VERIFIED" required>
                                            <span class="badge badge-success">Verified</span>
                                        </label>
                                        <label>
                                            <input type="radio" name="doc_${index}_status" value="REJECTED">
                                            <span class="badge badge-danger">Rejected</span>
                                        </label>
                                    </div>
                                    <input type="hidden" name="doc_${index}_id" value="${doc.id}">
                                    <input type="text" name="doc_${index}_remark" 
                                           placeholder="Remark (optional)" class="form-control form-control-sm">
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="form-group">
                        <label>Overall Verification Notes</label>
                        <textarea name="overallNotes" rows="2" 
                                  placeholder="Any additional notes..."></textarea>
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
                    text: 'Submit Verification',
                    class: 'btn-primary',
                    onClick: async (modal) => {
                        const form = document.getElementById('verify-documents-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        await submitDocumentVerification(form, modal);
                    }
                }
            ]
        });
    };

    /**
     * Submit document verification
     */
    const submitDocumentVerification = async (form, modal) => {
        try {
            Utils.showLoader('Submitting verification...');
            
            const formData = new FormData(form);
            const verifications = [];
            
            let index = 0;
            while (formData.has(`doc_${index}_id`)) {
                verifications.push({
                    documentId: formData.get(`doc_${index}_id`),
                    status: formData.get(`doc_${index}_status`),
                    remark: formData.get(`doc_${index}_remark`)
                });
                index++;
            }

            const response = await API.request('VERIFY_DOCUMENTS', {
                candidateId: formData.get('candidateId'),
                verifications: verifications,
                overallNotes: formData.get('overallNotes')
            });

            if (response.success) {
                Utils.showToast('Documents verified successfully', 'success');
                modal.close();
                await loadSelectedCandidates();
            } else {
                Utils.showToast(response.error || 'Failed to verify documents', 'error');
            }
        } catch (error) {
            console.error('Error verifying documents:', error);
            Utils.showToast('Error verifying documents', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Set joining date
     */
    const setJoiningDate = async (candidateId) => {
        const candidate = selectedCandidates.find(c => c.id === candidateId);
        if (!candidate) return;

        const modal = Utils.createModal({
            title: 'Set Joining Date',
            content: `
                <form id="set-joining-form">
                    <input type="hidden" name="candidateId" value="${candidateId}">
                    
                    <div class="form-group">
                        <label>Joining Date *</label>
                        <input type="date" name="joiningDate" required 
                               min="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label>Probation Period (Months) *</label>
                        <select name="probationMonths" required>
                            <option value="3">3 Months</option>
                            <option value="6" selected>6 Months</option>
                            <option value="12">12 Months</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Employee ID *</label>
                        <input type="text" name="employeeId" required 
                               placeholder="EMP001">
                    </div>

                    <div class="form-group">
                        <label>Department *</label>
                        <input type="text" name="department" required 
                               value="${Utils.escapeHtml(candidate.requirementDepartment || '')}">
                    </div>

                    <div class="form-group">
                        <label>Designation *</label>
                        <input type="text" name="designation" required 
                               value="${Utils.escapeHtml(candidate.requirementTitle || '')}">
                    </div>

                    <div class="form-group">
                        <label>Notes</label>
                        <textarea name="notes" rows="2" 
                                  placeholder="Additional joining instructions..."></textarea>
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
                    text: 'Set Joining Date',
                    class: 'btn-primary',
                    onClick: async (modal) => {
                        const form = document.getElementById('set-joining-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            candidateId: formData.get('candidateId'),
                            joiningDate: formData.get('joiningDate'),
                            probationMonths: parseInt(formData.get('probationMonths')),
                            employeeId: formData.get('employeeId'),
                            department: formData.get('department'),
                            designation: formData.get('designation'),
                            notes: formData.get('notes')
                        };

                        await performSetJoiningDate(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Perform set joining date
     */
    const performSetJoiningDate = async (data, modal) => {
        try {
            Utils.showLoader('Setting joining date...');
            
            const response = await API.request('SET_JOINING_DATE', data);

            if (response.success) {
                Utils.showToast('Joining date set successfully', 'success');
                modal.close();
                await loadSelectedCandidates();
            } else {
                Utils.showToast(response.error || 'Failed to set joining date', 'error');
            }
        } catch (error) {
            console.error('Error setting joining date:', error);
            Utils.showToast('Error setting joining date', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Confirm joining
     */
    const confirmJoining = async (candidateId) => {
        const candidate = selectedCandidates.find(c => c.id === candidateId);
        if (!candidate) return;

        const confirmed = await Utils.confirm(
            'Confirm Joining',
            `Confirm that ${candidate.name} has joined on ${Utils.formatDate(candidate.expectedJoining)}?`
        );

        if (!confirmed) return;

        try {
            Utils.showLoader('Confirming joining...');
            
            const response = await API.request('CONFIRM_JOINING', {
                candidateId: candidateId,
                actualJoiningDate: new Date().toISOString().split('T')[0]
            });

            if (response.success) {
                Utils.showToast('Joining confirmed successfully. Employee profile created.', 'success');
                await loadSelectedCandidates();
            } else {
                Utils.showToast(response.error || 'Failed to confirm joining', 'error');
            }
        } catch (error) {
            console.error('Error confirming joining:', error);
            Utils.showToast('Error confirming joining', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Postpone joining
     */
    const postponeJoining = async (candidateId) => {
        const candidate = selectedCandidates.find(c => c.id === candidateId);
        if (!candidate) return;

        const modal = Utils.createModal({
            title: 'Postpone Joining',
            content: `
                <form id="postpone-joining-form">
                    <input type="hidden" name="candidateId" value="${candidateId}">
                    
                    <div class="form-group">
                        <label>New Joining Date *</label>
                        <input type="date" name="newJoiningDate" required 
                               min="${new Date().toISOString().split('T')[0]}"
                               value="${candidate.expectedJoining}">
                    </div>

                    <div class="form-group">
                        <label>Reason for Postponement *</label>
                        <textarea name="reason" rows="3" required 
                                  placeholder="Reason for postponing joining date..."></textarea>
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
                    text: 'Postpone',
                    class: 'btn-warning',
                    onClick: async (modal) => {
                        const form = document.getElementById('postpone-joining-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const formData = new FormData(form);
                        const data = {
                            candidateId: formData.get('candidateId'),
                            newJoiningDate: formData.get('newJoiningDate'),
                            reason: formData.get('reason')
                        };

                        await performPostponeJoining(data, modal);
                    }
                }
            ]
        });
    };

    /**
     * Perform postpone joining
     */
    const performPostponeJoining = async (data, modal) => {
        try {
            Utils.showLoader('Postponing joining...');
            
            const response = await API.request('POSTPONE_JOINING', data);

            if (response.success) {
                Utils.showToast('Joining date postponed successfully', 'success');
                modal.close();
                await loadSelectedCandidates();
            } else {
                Utils.showToast(response.error || 'Failed to postpone joining', 'error');
            }
        } catch (error) {
            console.error('Error postponing joining:', error);
            Utils.showToast('Error postponing joining', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * View employee profile
     */
    const viewEmployeeProfile = (employeeId) => {
        UIRouter.navigateTo(`employee-profile.html?id=${employeeId}`);
    };

    /**
     * Track probation
     */
    const trackProbation = async (employeeId) => {
        UIRouter.navigateTo(`probation.html?id=${employeeId}`);
    };

    /**
     * Download document
     */
    const downloadDocument = async (documentId) => {
        try {
            Utils.showLoader('Downloading document...');
            
            const response = await API.request('DOWNLOAD_DOCUMENT', {
                documentId: documentId
            });

            if (response.success) {
                // Create download link
                const link = document.createElement('a');
                link.href = response.data.url;
                link.download = response.data.filename;
                link.click();
            } else {
                Utils.showToast(response.error || 'Failed to download document', 'error');
            }
        } catch (error) {
            console.error('Error downloading document:', error);
            Utils.showToast('Error downloading document', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * View document
     */
    const viewDocument = async (documentId) => {
        try {
            Utils.showLoader('Loading document...');
            
            const response = await API.request('VIEW_DOCUMENT', {
                documentId: documentId
            });

            if (response.success) {
                window.open(response.data.url, '_blank');
            } else {
                Utils.showToast(response.error || 'Failed to view document', 'error');
            }
        } catch (error) {
            console.error('Error viewing document:', error);
            Utils.showToast('Error viewing document', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Load documents
     */
    const loadDocuments = async (candidateId) => {
        // Implementation for loading documents
        console.log('Loading documents for:', candidateId);
    };

    /**
     * Load probation tracking
     */
    const loadProbationTracking = async () => {
        const container = document.getElementById('probation-list');
        if (!container) return;

        try {
            Utils.showLoader('Loading probation tracking...');
            
            const response = await API.request('GET_PROBATION_TRACKING', {
                filters: State.get('filters.probation') || {}
            });

            if (response.success) {
                probationTracking = response.data;
                renderProbationTracking(probationTracking);
            } else {
                Utils.showToast(response.error || 'Failed to load probation tracking', 'error');
            }
        } catch (error) {
            console.error('Error loading probation tracking:', error);
            Utils.showToast('Error loading probation tracking', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Render probation tracking
     */
    const renderProbationTracking = (employees) => {
        const container = document.getElementById('probation-list');
        if (!container) return;

        if (!employees || employees.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <i class="icon-users"></i>
                <p>No employees on probation</p>
            </div>`;
            return;
        }

        const html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Joined Date</th>
                        <th>Probation End</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(emp => {
                        const daysRemaining = Utils.daysBetween(new Date(), new Date(emp.probationEnd));
                        return `
                            <tr data-id="${emp.id}">
                                <td>${Utils.escapeHtml(emp.employeeId)}</td>
                                <td>${Utils.escapeHtml(emp.name)}</td>
                                <td>${Utils.escapeHtml(emp.department)}</td>
                                <td>${Utils.formatDate(emp.joinedAt)}</td>
                                <td>
                                    ${Utils.formatDate(emp.probationEnd)}
                                    <br>
                                    <small class="${daysRemaining <= 30 ? 'text-danger' : 'text-muted'}">
                                        ${daysRemaining} days remaining
                                    </small>
                                </td>
                                <td>
                                    <span class="status-badge status-${emp.probationStatus.toLowerCase()}">
                                        ${emp.probationStatus}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="OnboardingModule.viewProbationDetail('${emp.id}')">
                                        <i class="icon-eye"></i>
                                    </button>
                                    ${daysRemaining <= 30 ? `
                                        <button class="btn btn-sm btn-success" 
                                                onclick="OnboardingModule.confirmEmployee('${emp.id}')">
                                            <i class="icon-check"></i>
                                        </button>
                                    ` : ''}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    };

    /**
     * View probation detail
     */
    const viewProbationDetail = (employeeId) => {
        // Navigate to detailed probation view
        UIRouter.navigateTo(`probation-detail.html?id=${employeeId}`);
    };

    /**
     * Confirm employee (complete probation)
     */
    const confirmEmployee = async (employeeId) => {
        const employee = probationTracking.find(e => e.id === employeeId);
        if (!employee) return;

        const confirmed = await Utils.confirm(
            'Confirm Employee',
            `Confirm ${employee.name} as permanent employee?`
        );

        if (!confirmed) return;

        try {
            Utils.showLoader('Confirming employee...');
            
            const response = await API.request('CONFIRM_EMPLOYEE', {
                employeeId: employeeId
            });

            if (response.success) {
                Utils.showToast('Employee confirmed successfully', 'success');
                await loadProbationTracking();
            } else {
                Utils.showToast(response.error || 'Failed to confirm employee', 'error');
            }
        } catch (error) {
            console.error('Error confirming employee:', error);
            Utils.showToast('Error confirming employee', 'error');
        } finally {
            Utils.hideLoader();
        }
    };

    /**
     * Update onboarding stats
     */
    const updateOnboardingStats = () => {
        const documentsP = selectedCandidates.filter(c => c.onboardingStatus === 'DOCUMENTS_PENDING').length;
        const joiningScheduled = selectedCandidates.filter(c => c.onboardingStatus === 'JOINING_SCHEDULED').length;
        const joined = selectedCandidates.filter(c => c.onboardingStatus === 'JOINED').length;

        const statsContainer = document.getElementById('onboarding-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <h3>${documentsP}</h3>
                    <p>Documents Pending</p>
                </div>
                <div class="stat-card">
                    <h3>${joiningScheduled}</h3>
                    <p>Joining Scheduled</p>
                </div>
                <div class="stat-card">
                    <h3>${joined}</h3>
                    <p>Recently Joined</p>
                </div>
            `;
        }
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Refresh button
        const refreshBtn = document.getElementById('onboarding-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadSelectedCandidates);
        }
    };

    const setupDocumentListeners = () => {
        // Document specific listeners
    };

    const setupProbationListeners = () => {
        // Probation specific listeners
    };

    // Public API
    return {
        init,
        initDocuments,
        initProbation,
        uploadDocuments,
        viewDocuments,
        verifyDocuments,
        setJoiningDate,
        confirmJoining,
        postponeJoining,
        downloadDocument,
        viewDocument,
        viewEmployeeProfile,
        trackProbation,
        viewProbationDetail,
        confirmEmployee
    };
})();
