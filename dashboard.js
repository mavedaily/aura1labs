/**
 * AuraReach Dashboard
 * Main dashboard functionality and data management
 */

class Dashboard {
    constructor() {
        this.data = {
            emailsSent: 0,
            activeAccounts: 0,
            safetyScore: 100,
            deliveryRate: 98.5,
            activities: []
        };
        this.init();
    }

    init() {
        this.loadData();
        this.updateStats();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.setupTutorials();
    }

    setupEventListeners() {
        // User menu toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('.user-avatar')) {
                this.toggleUserMenu();
            } else if (!e.target.closest('.user-dropdown')) {
                this.closeUserMenu();
            }
        });

        // Tutorial triggers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-tutorial]')) {
                const tutorialId = e.target.getAttribute('data-tutorial');
                if (window.tutorialSystem) {
                    window.tutorialSystem.startTutorial(tutorialId);
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'h':
                        e.preventDefault();
                        this.showHelp();
                        break;
                    case 'e':
                        e.preventDefault();
                        window.location.href = 'gmail-sender.html';
                        break;
                    case 'a':
                        e.preventDefault();
                        window.location.href = 'admin-panel.html';
                        break;
                }
            }
        });
    }

    setupTutorials() {
        // Add overview tutorial to tutorial system
        if (window.tutorialSystem && window.tutorialSystem.tutorials) {
            window.tutorialSystem.tutorials.overview = {
                id: 'overview',
                title: 'AuraReach Overview',
                steps: [
                    {
                        target: '.welcome-section',
                        title: 'Welcome to AuraReach',
                        content: 'This is your main dashboard where you can access all features and monitor your email sending activities.',
                        position: 'bottom'
                    },
                    {
                        target: '.stats-section',
                        title: 'Quick Statistics',
                        content: 'Monitor your daily email usage, active accounts, safety score, and delivery rates at a glance.',
                        position: 'bottom'
                    },
                    {
                        target: '.actions-section',
                        title: 'Quick Actions',
                        content: 'Access the main features: send emails, manage settings, view analytics, and read documentation.',
                        position: 'bottom'
                    },
                    {
                        target: '.activity-section',
                        title: 'Recent Activity',
                        content: 'Stay updated with recent system activities, alerts, and important notifications.',
                        position: 'top'
                    },
                    {
                        target: '.features-section',
                        title: 'Platform Features',
                        content: 'Learn about all the powerful features that make AuraReach a professional email management platform.',
                        position: 'top'
                    }
                ]
            };
        }
    }

    loadData() {
        // Load data from localStorage or API
        const savedData = localStorage.getItem('aurareach_dashboard_data');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                this.data = { ...this.data, ...parsed };
            } catch (e) {
                console.warn('Failed to parse saved dashboard data');
            }
        }

        // Load from MultiGmailManager if available
        if (window.multiGmailManager) {
            const analyticsData = window.multiGmailManager.getAnalyticsData();
            
            this.data.activeAccounts = analyticsData.overview.activeAccounts;
            this.data.emailsSent = analyticsData.overview.totalDailyUsage;
            this.data.safetyScore = analyticsData.safety.averageSafetyScore;
            this.data.deliveryRate = analyticsData.performance.deliveryRate;
            
            // Store enhanced analytics for detailed views
            this.analyticsData = analyticsData;
        }
    }

    saveData() {
        localStorage.setItem('aurareach_dashboard_data', JSON.stringify(this.data));
    }

    updateStats() {
        // Update stat displays
        const elements = {
            totalEmailsSent: document.getElementById('totalEmailsSent'),
            activeAccounts: document.getElementById('activeAccounts'),
            safetyScore: document.getElementById('safetyScore'),
            deliveryRate: document.getElementById('deliveryRate')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                const value = this.data[key.replace('total', '').toLowerCase()] || this.data[key];
                this.animateNumber(element, value);
            }
        });

        this.updateActivityFeed();
    }

    animateNumber(element, targetValue) {
        const currentValue = parseFloat(element.textContent) || 0;
        const increment = (targetValue - currentValue) / 20;
        let current = currentValue;

        const animate = () => {
            current += increment;
            if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
                current = targetValue;
            }

            if (element.id === 'safetyScore' || element.id === 'deliveryRate') {
                element.textContent = current.toFixed(1) + '%';
            } else {
                element.textContent = Math.round(current).toLocaleString();
            }

            if (current !== targetValue) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    getTodayEmailCount() {
        const today = new Date().toDateString();
        const emailLog = JSON.parse(localStorage.getItem('aurareach_email_log') || '[]');
        return emailLog.filter(entry => new Date(entry.date).toDateString() === today).length;
    }

    calculateSafetyScore() {
        if (!window.multiGmailManager) return 100;

        let totalScore = 0;
        let accountCount = 0;

        window.multiGmailManager.accounts.forEach(account => {
            const usage = account.dailyUsage || 0;
            const limit = account.dailyLimit || 500;
            const usagePercent = (usage / limit) * 100;

            let score = 100;
            if (usagePercent > 95) score = 20;
            else if (usagePercent > 80) score = 60;
            else if (usagePercent > 60) score = 80;

            totalScore += score;
            accountCount++;
        });

        return accountCount > 0 ? Math.round(totalScore / accountCount) : 100;
    }

    updateActivityFeed() {
        const feed = document.getElementById('activityFeed');
        if (!feed) return;

        // Get recent activities
        const activities = this.getRecentActivities();
        
        feed.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${this.formatTimeAgo(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    getRecentActivities() {
        const activities = JSON.parse(localStorage.getItem('aurareach_activities') || '[]');
        return activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
    }

    addActivity(type, icon, text) {
        const activities = JSON.parse(localStorage.getItem('aurareach_activities') || '[]');
        activities.push({
            type,
            icon,
            text,
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 activities
        if (activities.length > 50) {
            activities.splice(0, activities.length - 50);
        }

        localStorage.setItem('aurareach_activities', JSON.stringify(activities));
        this.updateActivityFeed();
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    closeUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    showHelp() {
        if (window.tutorialSystem) {
            window.tutorialSystem.showHelpMenu();
        } else {
            this.showNotification('Help system is loading...', 'info');
        }
    }

    showAnalytics() {
        const analytics = this.analyticsData || {};
        const overview = analytics.overview || {};
        const performance = analytics.performance || {};
        const safety = analytics.safety || {};
        const accounts = analytics.accounts || [];
        const users = analytics.users || [];

        // Create analytics modal
        const modal = document.createElement('div');
        modal.className = 'modal analytics-modal';
        modal.innerHTML = `
            <div class="modal-content analytics-content">
                <div class="modal-header">
                    <h2>Advanced Analytics Dashboard</h2>
                    <div class="analytics-tabs">
                        <button class="tab-btn active" data-tab="overview">Overview</button>
                        <button class="tab-btn" data-tab="accounts">Accounts</button>
                        <button class="tab-btn" data-tab="users">Users</button>
                        <button class="tab-btn" data-tab="performance">Performance</button>
                    </div>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Overview Tab -->
                    <div class="tab-content active" id="overview-tab">
                        <div class="analytics-grid">
                            <div class="analytics-card">
                                <h3>System Overview</h3>
                                <div class="metrics-grid">
                                    <div class="metric-item">
                                        <span class="metric-label">Total Accounts</span>
                                        <span class="metric-value">${overview.totalAccounts || 0}</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Active Accounts</span>
                                        <span class="metric-value">${overview.activeAccounts || 0}</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Daily Usage</span>
                                        <span class="metric-value">${overview.totalDailyUsage || 0}</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Daily Limit</span>
                                        <span class="metric-value">${overview.totalDailyLimit || 0}</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Usage %</span>
                                        <span class="metric-value">${Math.round(overview.usagePercentage || 0)}%</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Remaining</span>
                                        <span class="metric-value">${overview.remainingCapacity || 0}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="analytics-card">
                                <h3>Safety Metrics</h3>
                                <div class="safety-overview">
                                    <div class="safety-score ${this.getSafetyClass(safety.averageSafetyScore)}">
                                        <span class="score-value">${safety.averageSafetyScore || 100}</span>
                                        <span class="score-label">Safety Score</span>
                                    </div>
                                    <div class="safety-details">
                                        <div class="safety-item">
                                            <span>Accounts at Risk</span>
                                            <span class="warning">${safety.accountsAtRisk || 0}</span>
                                        </div>
                                        <div class="safety-item">
                                            <span>Critical Accounts</span>
                                            <span class="critical">${safety.accountsInCritical || 0}</span>
                                        </div>
                                        <div class="safety-item">
                                            <span>System Status</span>
                                            <span class="${safety.systemLocked ? 'critical' : 'healthy'}">${safety.systemLocked ? 'Locked' : 'Operational'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="analytics-card">
                                <h3>Performance Summary</h3>
                                <div class="performance-metrics">
                                    <div class="metric-item">
                                        <span class="metric-label">Delivery Rate</span>
                                        <span class="metric-value">${Math.round(performance.deliveryRate || 100)}%</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Successful Emails</span>
                                        <span class="metric-value">${performance.successfulEmails || 0}</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Failed Emails</span>
                                        <span class="metric-value">${performance.failedEmails || 0}</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Peak Hour</span>
                                        <span class="metric-value">${performance.peakHour || 0}:00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Accounts Tab -->
                    <div class="tab-content" id="accounts-tab">
                        <div class="accounts-analytics">
                            <h3>Account Performance</h3>
                            <div class="accounts-list">
                                ${accounts.map(account => `
                                    <div class="account-analytics-item">
                                        <div class="account-header">
                                            <span class="account-name">${account.name}</span>
                                            <span class="account-type">${account.typeName}</span>
                                            <span class="account-status ${account.status}">${account.status}</span>
                                        </div>
                                        <div class="account-metrics">
                                            <div class="usage-bar">
                                                <div class="usage-fill" style="width: ${account.usagePercentage}%"></div>
                                                <span class="usage-text">${account.dailyUsage}/${account.dailyLimit} (${Math.round(account.usagePercentage)}%)</span>
                                            </div>
                                            <div class="account-details">
                                                <span>Remaining: ${account.remainingToday}</span>
                                                <span>Hourly: ${account.hourlyUsage}/${account.hourlyLimit}</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Users Tab -->
                    <div class="tab-content" id="users-tab">
                        <div class="users-analytics">
                            <h3>User Activity</h3>
                            <div class="users-list">
                                ${users.map(user => `
                                    <div class="user-analytics-item">
                                        <div class="user-header">
                                            <span class="user-name">${user.username}</span>
                                            <span class="user-role">${user.roleName}</span>
                                            <span class="user-status ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span>
                                        </div>
                                        <div class="user-metrics">
                                            <div class="usage-bar">
                                                <div class="usage-fill" style="width: ${user.usagePercentage}%"></div>
                                                <span class="usage-text">${user.dailyUsage}/${user.dailyLimit} (${Math.round(user.usagePercentage)}%)</span>
                                            </div>
                                            <div class="user-details">
                                                <span>Total Sent: ${user.totalEmailsSent}</span>
                                                <span>Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Performance Tab -->
                    <div class="tab-content" id="performance-tab">
                        <div class="performance-analytics">
                            <h3>Detailed Performance</h3>
                            <div class="performance-grid">
                                <div class="performance-card">
                                    <h4>24-Hour Summary</h4>
                                    <div class="performance-stats">
                                        <div class="stat-item">
                                            <span>Total Emails</span>
                                            <span>${performance.totalEmails || 0}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span>Success Rate</span>
                                            <span>${Math.round(performance.deliveryRate || 100)}%</span>
                                        </div>
                                        <div class="stat-item">
                                            <span>Average Response Time</span>
                                            <span>${Math.round(performance.averageResponseTime || 0)}ms</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="performance-card">
                                    <h4>Account Distribution</h4>
                                    <div class="distribution-chart">
                                        ${Object.entries(performance.accountDistribution || {}).map(([accountId, count]) => `
                                            <div class="distribution-item">
                                                <span>Account ${accountId.slice(-4)}</span>
                                                <span>${count} emails</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.dashboard.exportAnalytics()">Export Data</button>
                    <button class="btn btn-primary" onclick="window.dashboard.refreshData()">Refresh</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Tab switching
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                
                // Update active tab button
                modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active tab content
                modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                modal.querySelector(`#${tabId}-tab`).classList.add('active');
            });
        });

        // Close modal handlers
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    getSafetyClass(score) {
        if (score >= 80) return 'healthy';
        if (score >= 60) return 'warning';
        return 'critical';
    }

    exportAnalytics() {
        const data = {
            analytics: this.analyticsData,
            timestamp: new Date().toISOString(),
            summary: {
                totalAccounts: this.data.activeAccounts,
                emailsSent: this.data.emailsSent,
                safetyScore: this.data.safetyScore,
                deliveryRate: this.data.deliveryRate
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aurareach-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Analytics data exported successfully', 'success');
    }

    initializeAnalyticsCharts() {
        // Placeholder for chart initialization
        // In a real implementation, you would use Chart.js or similar library
        console.log('Analytics charts would be initialized here');
    }

    showDocumentation() {
        const modal = document.createElement('div');
        modal.className = 'modal documentation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Documentation</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="documentation-content">
                        <div class="doc-section">
                            <h3>Getting Started</h3>
                            <ul>
                                <li><a href="#" onclick="window.tutorialSystem?.startTutorial('overview')">Platform Overview</a></li>
                                <li><a href="#" onclick="window.tutorialSystem?.startTutorial('emailSender')">Sending Your First Email</a></li>
                                <li><a href="#" onclick="window.tutorialSystem?.startTutorial('safety')">Understanding Safety Features</a></li>
                            </ul>
                        </div>
                        <div class="doc-section">
                            <h3>Features</h3>
                            <ul>
                                <li><a href="#multi-account">Multi-Account Rotation</a></li>
                                <li><a href="#safety-buffer">Safety Buffer System</a></li>
                                <li><a href="#user-management">User Management</a></li>
                                <li><a href="#analytics">Analytics & Reporting</a></li>
                            </ul>
                        </div>
                        <div class="doc-section">
                            <h3>Best Practices</h3>
                            <ul>
                                <li><a href="#email-limits">Understanding Email Limits</a></li>
                                <li><a href="#account-safety">Maintaining Account Safety</a></li>
                                <li><a href="#deliverability">Improving Deliverability</a></li>
                            </ul>
                        </div>
                        <div class="doc-section">
                            <h3>Troubleshooting</h3>
                            <ul>
                                <li><a href="#common-issues">Common Issues</a></li>
                                <li><a href="#error-codes">Error Codes</a></li>
                                <li><a href="#support">Contact Support</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Close modal handlers
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showNotification(message, type = 'info') {
        if (window.tutorialSystem) {
            window.tutorialSystem.showNotification({
                type: type,
                message: message
            });
        } else {
            // Fallback notification
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    startAutoRefresh() {
        // Refresh data every 30 seconds
        setInterval(() => {
            this.loadData();
            this.updateStats();
        }, 30000);
    }

    // Public API methods
    refreshData() {
        this.loadData();
        this.updateStats();
        this.showNotification('Dashboard data refreshed', 'success');
    }

    exportData() {
        const data = {
            stats: this.data,
            activities: this.getRecentActivities(),
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aurareach-dashboard-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Dashboard data exported', 'success');
    }

    resetData() {
        if (confirm('Are you sure you want to reset all dashboard data? This action cannot be undone.')) {
            localStorage.removeItem('aurareach_dashboard_data');
            localStorage.removeItem('aurareach_activities');
            localStorage.removeItem('aurareach_email_log');
            
            this.data = {
                emailsSent: 0,
                activeAccounts: 0,
                safetyScore: 100,
                deliveryRate: 98.5,
                activities: []
            };
            
            this.updateStats();
            this.showNotification('Dashboard data reset successfully', 'success');
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
    
    // Add some sample activities if none exist
    const activities = JSON.parse(localStorage.getItem('aurareach_activities') || '[]');
    if (activities.length === 0) {
        window.dashboard.addActivity('success', 'fa-check', 'Welcome to AuraReach! Dashboard initialized successfully');
        window.dashboard.addActivity('info', 'fa-info-circle', 'System ready for email sending');
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}