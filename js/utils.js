/**
 * ============================================
 * HRMS/ATS SYSTEM - UTILITIES MODULE
 * Helper functions and common utilities
 * ============================================
 */

const Utils = (() => {
    // Toast container reference
    let toastContainer = null;

    /**
     * Initialize utilities
     */
    const init = () => {
        // Create toast container
        createToastContainer();
        
        // Create loader element
        createLoader();
    };

    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================

    /**
     * Create toast container
     */
    const createToastContainer = () => {
        if (!document.getElementById('toast-container')) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        } else {
            toastContainer = document.getElementById('toast-container');
        }
    };

    /**
     * Show toast notification
     */
    const toast = (message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) => {
        if (!toastContainer) createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = getToastIcon(type);
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    /**
     * Get toast icon based on type
     */
    const getToastIcon = (type) => {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    };

    // ==========================================
    // LOADING STATES
    // ==========================================

    /**
     * Create loader element
     */
    const createLoader = () => {
        if (!document.getElementById('global-loader')) {
            const loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.className = 'global-loader hidden';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="spinner spinner-lg"></div>
                    <p class="loader-text">Loading...</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
    };

    /**
     * Show global loader
     */
    const showLoader = (text = 'Loading...') => {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.querySelector('.loader-text').textContent = text;
            loader.classList.remove('hidden');
        }
        State.setLoading('global', true);
    };

    /**
     * Hide global loader
     */
    const hideLoader = () => {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
        State.setLoading('global', false);
    };

    // ==========================================
    // MODAL MANAGEMENT
    // ==========================================

    /**
     * Open modal
     */
    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    /**
     * Close modal
     */
    const closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    /**
     * Close all modals
     */
    const closeAllModals = () => {
        document.querySelectorAll('.modal-backdrop.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    };

    // ==========================================
    // FORM UTILITIES
    // ==========================================

    /**
     * Get form data as object
     */
    const getFormData = (formElement) => {
        const formData = new FormData(formElement);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            // Handle arrays (checkboxes, multi-select)
            if (key.endsWith('[]')) {
                const actualKey = key.slice(0, -2);
                if (!data[actualKey]) {
                    data[actualKey] = [];
                }
                data[actualKey].push(value);
            } else {
                data[key] = value;
            }
        }
        
        return data;
    };

    /**
     * Set form data from object
     */
    const setFormData = (formElement, data) => {
        Object.keys(data).forEach(key => {
            const input = formElement.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = Boolean(data[key]);
                } else if (input.type === 'radio') {
                    const radio = formElement.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    input.value = data[key];
                }
            }
        });
    };

    /**
     * Reset form
     */
    const resetForm = (formElement) => {
        formElement.reset();
        formElement.querySelectorAll('.form-error').forEach(el => el.remove());
        formElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    };

    /**
     * Validate form
     */
    const validateForm = (formElement, rules) => {
        let isValid = true;
        const errors = {};
        
        // Clear previous errors
        formElement.querySelectorAll('.form-error').forEach(el => el.remove());
        formElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        
        Object.keys(rules).forEach(field => {
            const input = formElement.querySelector(`[name="${field}"]`);
            if (!input) return;
            
            const value = input.value.trim();
            const fieldRules = rules[field];
            
            // Required validation
            if (fieldRules.required && !value) {
                errors[field] = fieldRules.message || 'This field is required';
                isValid = false;
            }
            
            // Pattern validation
            if (value && fieldRules.pattern && !fieldRules.pattern.test(value)) {
                errors[field] = fieldRules.patternMessage || 'Invalid format';
                isValid = false;
            }
            
            // Min length
            if (value && fieldRules.minLength && value.length < fieldRules.minLength) {
                errors[field] = `Minimum ${fieldRules.minLength} characters required`;
                isValid = false;
            }
            
            // Max length
            if (value && fieldRules.maxLength && value.length > fieldRules.maxLength) {
                errors[field] = `Maximum ${fieldRules.maxLength} characters allowed`;
                isValid = false;
            }
            
            // Custom validation
            if (value && fieldRules.custom && !fieldRules.custom(value)) {
                errors[field] = fieldRules.customMessage || 'Invalid value';
                isValid = false;
            }
            
            // Show error
            if (errors[field]) {
                input.classList.add('error');
                const errorEl = document.createElement('span');
                errorEl.className = 'form-error';
                errorEl.textContent = errors[field];
                input.parentNode.appendChild(errorEl);
            }
        });
        
        return { isValid, errors };
    };

    // ==========================================
    // DATE/TIME UTILITIES
    // ==========================================

    /**
     * Format date
     */
    const formatDate = (date, format = 'DD MMM YYYY') => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        const replacements = {
            'YYYY': d.getFullYear(),
            'YY': String(d.getFullYear()).slice(-2),
            'MMMM': fullMonths[d.getMonth()],
            'MMM': months[d.getMonth()],
            'MM': String(d.getMonth() + 1).padStart(2, '0'),
            'DD': String(d.getDate()).padStart(2, '0'),
            'D': d.getDate(),
            'HH': String(d.getHours()).padStart(2, '0'),
            'mm': String(d.getMinutes()).padStart(2, '0'),
            'ss': String(d.getSeconds()).padStart(2, '0')
        };
        
        let result = format;
        Object.keys(replacements).forEach(key => {
            result = result.replace(key, replacements[key]);
        });
        
        return result;
    };

    /**
     * Get relative time
     */
    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];
        
        for (let i = 0; i < intervals.length; i++) {
            const interval = intervals[i];
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
            }
        }
        
        return 'Just now';
    };

    /**
     * Check if date is today
     */
    const isToday = (date) => {
        const today = new Date();
        const d = new Date(date);
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
    };

    // ==========================================
    // STRING UTILITIES
    // ==========================================

    /**
     * Capitalize first letter
     */
    const capitalize = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    /**
     * Title case
     */
    const titleCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => capitalize(word)).join(' ');
    };

    /**
     * Truncate string
     */
    const truncate = (str, length = 50, suffix = '...') => {
        if (!str || str.length <= length) return str;
        return str.slice(0, length) + suffix;
    };

    /**
     * Generate random ID
     */
    const generateId = (prefix = '') => {
        return prefix + Math.random().toString(36).substr(2, 9);
    };

    /**
     * Slugify string
     */
    const slugify = (str) => {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    // ==========================================
    // NUMBER UTILITIES
    // ==========================================

    /**
     * Format number with commas
     */
    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-IN').format(num);
    };

    /**
     * Format currency
     */
    const formatCurrency = (amount, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount);
    };

    /**
     * Calculate percentage
     */
    const percentage = (value, total) => {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    // ==========================================
    // DOM UTILITIES
    // ==========================================

    /**
     * Create element with attributes
     */
    const createElement = (tag, attributes = {}, children = []) => {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else if (key === 'textContent') {
                element.textContent = attributes[key];
            } else if (key.startsWith('on')) {
                element.addEventListener(key.slice(2).toLowerCase(), attributes[key]);
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    };

    /**
     * Debounce function
     */
    const debounce = (func, wait = CONFIG.UI.DEBOUNCE_DELAY) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    /**
     * Throttle function
     */
    const throttle = (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    /**
     * Sleep/delay function
     */
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ==========================================
    // FILE UTILITIES
    // ==========================================

    /**
     * Parse CV filename
     */
    const parseCVFilename = (filename) => {
        const match = filename.match(CONFIG.CV_FILE_FORMAT.pattern);
        if (match) {
            return {
                name: match[1].replace(/\s+/g, ' ').trim(),
                mobile: match[2],
                source: match[3]
            };
        }
        return null;
    };

    /**
     * Convert file to base64
     */
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    /**
     * Format file size
     */
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // ==========================================
    // STATUS/BADGE UTILITIES
    // ==========================================

    /**
     * Get status badge HTML
     */
    const getStatusBadge = (status) => {
        const statusMap = {
            // Requirement statuses
            'DRAFT': { class: 'status-hold', label: 'Draft' },
            'PENDING_HR_REVIEW': { class: 'status-pending', label: 'Pending HR Review' },
            'NEED_CLARIFICATION': { class: 'status-pending', label: 'Need Clarification' },
            'APPROVED': { class: 'status-approved', label: 'Approved' },
            'CLOSED': { class: 'status-rejected', label: 'Closed' },
            
            // Candidate statuses
            'NEW': { class: 'status-processing', label: 'New' },
            'SHORTLISTED': { class: 'status-approved', label: 'Shortlisted' },
            'REJECTED_SHORTLISTING': { class: 'status-rejected', label: 'Rejected' },
            'ON_CALL': { class: 'status-pending', label: 'On Call' },
            'CALL_DONE': { class: 'status-approved', label: 'Call Done' },
            'OWNER_REVIEW': { class: 'status-pending', label: 'Owner Review' },
            'INTERVIEW_SCHEDULED': { class: 'status-processing', label: 'Interview Scheduled' },
            'PRE_INTERVIEW_PASS': { class: 'status-approved', label: 'Pre-Interview Pass' },
            'PRE_INTERVIEW_FAIL': { class: 'status-rejected', label: 'Pre-Interview Fail' },
            'TEST_PENDING': { class: 'status-pending', label: 'Test Pending' },
            'TEST_PASS': { class: 'status-approved', label: 'Test Pass' },
            'TEST_FAIL': { class: 'status-rejected', label: 'Test Fail' },
            'SELECTED': { class: 'status-approved', label: 'Selected' },
            'ON_HOLD': { class: 'status-hold', label: 'On Hold' },
            'REJECTED': { class: 'status-rejected', label: 'Rejected' },
            'JOINED': { class: 'status-approved', label: 'Joined' },
            'PROBATION': { class: 'status-processing', label: 'Probation' }
        };
        
        const statusInfo = statusMap[status] || { class: 'status-hold', label: status };
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>`;
    };

    /**
     * Get score color class
     */
    const getScoreClass = (score, maxScore = 10) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return 'score-excellent';
        if (percentage >= 60) return 'score-good';
        if (percentage >= 40) return 'score-average';
        return 'score-poor';
    };

    // ==========================================
    // CLIPBOARD UTILITIES
    // ==========================================

    /**
     * Copy text to clipboard
     */
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast('Copied to clipboard!', 'success');
            return true;
        } catch (error) {
            console.error('Copy failed:', error);
            toast('Failed to copy', 'error');
            return false;
        }
    };

    // ==========================================
    // EXPORT/DOWNLOAD UTILITIES
    // ==========================================

    /**
     * Download as CSV
     */
    const downloadCSV = (data, filename) => {
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');
        
        downloadFile(csv, `${filename}.csv`, 'text/csv');
    };

    /**
     * Download file
     */
    const downloadFile = (content, filename, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Public interface
    return {
        init,
        toast,
        showLoader,
        hideLoader,
        openModal,
        closeModal,
        closeAllModals,
        getFormData,
        setFormData,
        resetForm,
        validateForm,
        formatDate,
        timeAgo,
        isToday,
        capitalize,
        titleCase,
        truncate,
        generateId,
        slugify,
        formatNumber,
        formatCurrency,
        percentage,
        createElement,
        debounce,
        throttle,
        sleep,
        parseCVFilename,
        fileToBase64,
        formatFileSize,
        getStatusBadge,
        getScoreClass,
        copyToClipboard,
        downloadCSV,
        downloadFile
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', Utils.init);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
