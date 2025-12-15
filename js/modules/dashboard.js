/**
 * ============================================
 * HRMS/ATS SYSTEM - DASHBOARD MODULE
 * Dashboard statistics and overview
 * ============================================
 */

const DashboardModule = (() => {
    /**
     * Initialize dashboard
     */
    const init = async () => {
        console.log('Initializing Dashboard Module');
        
        // Load all dashboard data
        await Promise.all([
            loadStats(),
            loadRecentActivity(),
            loadPendingActions()
        ]);
        
        // Setup event listeners
        setupEventListeners();
    };

    /**
     * Load dashboard statistics
     */
    const loadStats = async () => {
        const statsContainer = document.getElementById('dashboard-stats');
        if (!statsContainer) return;
        
        try {
            State.setLoading('dashboard', true);
            const result = await API.dashboard.getStats();
            
            if (result.success) {
                renderStats(result.data);
            } else {
                console.error('Failed to load stats:', result.error);
            }
        } catch (error) {
            console.error('Stats loading error:', error);
        } finally {
            State.setLoading('dashboard', false);
        }
    };

    /**
     * Render statistics cards
     */
    const renderStats = (stats) => {
        const statsContainer = document.getElementById('dashboard-stats');
        if (!statsContainer) return;
        
        const role = Auth.getUserRole();
        let statsHTML = '';
        
        // Different stats based on role
        if (role === 'HR' || role === 'ADMIN') {
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Open Requirements</span>
                        <div class="stat-card-icon primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.openRequirements || 0}</div>
                    <div class="stat-card-change ${stats.requirementTrend >= 0 ? 'positive' : 'negative'}">
                        <span>${stats.requirementTrend >= 0 ? '↑' : '↓'} ${Math.abs(stats.requirementTrend || 0)}%</span>
                        <span class="text-muted">vs last week</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Active Candidates</span>
                        <div class="stat-card-icon success">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.activeCandidates || 0}</div>
                    <div class="stat-card-change positive">
                        <span>↑ ${stats.newCandidatesToday || 0} new today</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Today's Interviews</span>
                        <div class="stat-card-icon warning">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.todayInterviews || 0}</div>
                    <div class="stat-card-change">
                        <span>${stats.upcomingInterviews || 0} upcoming this week</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Pending Tests</span>
                        <div class="stat-card-icon danger">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.pendingTests || 0}</div>
                    <div class="stat-card-change">
                        <span>${stats.testsCompletedToday || 0} completed today</span>
                    </div>
                </div>
            `;
        } else if (role === 'EA') {
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">My Requirements</span>
                        <div class="stat-card-icon primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.myRequirements || 0}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Pending Review</span>
                        <div class="stat-card-icon warning">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.pendingHRReview || 0}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Need Clarification</span>
                        <div class="stat-card-icon danger">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.needClarification || 0}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Tests to Grade</span>
                        <div class="stat-card-icon success">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.testsToGrade || 0}</div>
                </div>
            `;
        } else if (role === 'OWNER') {
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Awaiting Decision</span>
                        <div class="stat-card-icon warning">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.awaitingDecision || 0}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">This Month Hires</span>
                        <div class="stat-card-icon success">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="8.5" cy="7" r="4"/>
                                <polyline points="17 11 19 13 23 9"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.monthlyHires || 0}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Pipeline Value</span>
                        <div class="stat-card-icon primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.pipelineCandidates || 0}</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">Conversion Rate</span>
                        <div class="stat-card-icon danger">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="20" x2="12" y2="10"/>
                                <line x1="18" y1="20" x2="18" y2="4"/>
                                <line x1="6" y1="20" x2="6" y2="16"/>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.conversionRate || 0}%</div>
                </div>
            `;
        }
        
        statsContainer.innerHTML = statsHTML;
    };

    /**
     * Load recent activity
     */
    const loadRecentActivity = async () => {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;
        
        try {
            const result = await API.dashboard.getRecentActivity(10);
            
            if (result.success) {
                renderRecentActivity(result.data);
            }
        } catch (error) {
            console.error('Activity loading error:', error);
        }
    };

    /**
     * Render recent activity list
     */
    const renderRecentActivity = (activities) => {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer || !activities?.length) {
            if (activityContainer) {
                activityContainer.innerHTML = '<p class="text-muted p-4">No recent activity</p>';
            }
            return;
        }
        
        const activityHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    ${getActivityIcon(activity.type)}
                </div>
                <div class="activity-content">
                    <p class="activity-text">${activity.message}</p>
                    <span class="activity-time">${Utils.timeAgo(activity.timestamp)}</span>
                </div>
            </div>
        `).join('');
        
        activityContainer.innerHTML = activityHTML;
    };

    /**
     * Get activity icon
     */
    const getActivityIcon = (type) => {
        const icons = {
            'requirement': '📋',
            'candidate': '👤',
            'interview': '📅',
            'test': '📝',
            'decision': '✅',
            'rejection': '❌'
        };
        return icons[type] || '📌';
    };

    /**
     * Load pending actions
     */
    const loadPendingActions = async () => {
        const pendingContainer = document.getElementById('pending-actions');
        if (!pendingContainer) return;
        
        try {
            const result = await API.dashboard.getPendingActions();
            
            if (result.success) {
                renderPendingActions(result.data);
            }
        } catch (error) {
            console.error('Pending actions loading error:', error);
        }
    };

    /**
     * Render pending actions
     */
    const renderPendingActions = (actions) => {
        const pendingContainer = document.getElementById('pending-actions');
        if (!pendingContainer) return;
        
        if (!actions?.length) {
            pendingContainer.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">🎉 No pending actions!</p>
                </div>
            `;
            return;
        }
        
        const actionsHTML = actions.map(action => `
            <div class="pending-item" data-route="${action.route}">
                <div class="pending-info">
                    <span class="pending-badge badge-${action.priority}">${action.priority}</span>
                    <span class="pending-title">${action.title}</span>
                </div>
                <span class="pending-count">${action.count}</span>
            </div>
        `).join('');
        
        pendingContainer.innerHTML = actionsHTML;
    };

    /**
     * Setup event listeners
     */
    const setupEventListeners = () => {
        // Pending action click
        document.querySelectorAll('.pending-item').forEach(item => {
            item.addEventListener('click', () => {
                const route = item.dataset.route;
                if (route) Router.navigate(route);
            });
        });
        
        // Quick action buttons
        document.querySelectorAll('[data-quick-action]').forEach(btn => {
            btn.addEventListener('click', handleQuickAction);
        });
    };

    /**
     * Handle quick action buttons
     */
    const handleQuickAction = (e) => {
        const action = e.currentTarget.dataset.quickAction;
        
        switch (action) {
            case 'new-requirement':
                Router.navigate('requirements/new');
                break;
            case 'add-candidate':
                Router.navigate('candidates/add');
                break;
            case 'view-interviews':
                Router.navigate('interviews/today');
                break;
            case 'view-tests':
                Router.navigate('tests');
                break;
            default:
                console.warn('Unknown quick action:', action);
        }
    };

    // Public interface
    return {
        init,
        loadStats,
        loadRecentActivity,
        loadPendingActions
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardModule;
}
