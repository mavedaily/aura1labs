// Admin Panel JavaScript Functionality
class AdminPanel {
    constructor() {
        this.currentTab = 'dashboard';
        this.tutorialStep = 1;
        this.maxTutorialSteps = 5;
        this.charts = {};
        
        this.initializePanel();
    }

    // Initialize the admin panel
    initializePanel() {
        this.setupEventListeners();
        this.initializeCharts();
        this.updateAllDisplays();
        this.startAutoRefresh();
        
        // Show tutorial for first-time users
        if (!localStorage.getItem('tutorial_completed')) {
            this.showTutorial();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Modal close events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Form submissions
        document.getElementById('add-account-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addAccount();
        });

        document.getElementById('add-user-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });

        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('accounts');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('users');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchTab('analytics');
                        break;
                    case '5':
                        e.preventDefault();
                        this.switchTab('settings');
                        break;
                }
            }
        });
    }

    // Tab switching
    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Update specific tab content
        if (tabName === 'analytics') {
            this.updateAnalytics();
        }
    }

    // Modal management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // Reset form if exists
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }

    // Account management
    async addAccount() {
        try {
            const accountData = {
                name: document.getElementById('account-name').value,
                email: document.getElementById('account-email').value,
                clientId: document.getElementById('account-client-id').value,
                apiKey: document.getElementById('account-api-key').value,
                accountType: document.getElementById('account-type').value
            };

            // Validate required fields
            if (!accountData.name || !accountData.email || !accountData.clientId || !accountData.apiKey) {
                this.showNotification('Please fill in all required fields', 'error');
                return;
            }

            // Add account through multi-Gmail manager
            const account = await multiGmailManager.addGmailAccount(accountData);
            
            this.showNotification(`Account "${account.name}" added successfully!`, 'success');
            this.closeModal('add-account-modal');
            this.updateAllDisplays();
            
        } catch (error) {
            console.error('Error adding account:', error);
            this.showNotification('Failed to add account: ' + error.message, 'error');
        }
    }

    // User management
    addUser() {
        try {
            const userData = {
                username: document.getElementById('user-username').value,
                email: document.getElementById('user-email').value,
                role: document.getElementById('user-role').value,
                dailyLimit: parseInt(document.getElementById('user-daily-limit').value),
                accountType: document.getElementById('user-account-type').value
            };

            // Validate required fields
            if (!userData.username || !userData.email || !userData.dailyLimit) {
                this.showNotification('Please fill in all required fields', 'error');
                return;
            }

            // Check if username already exists
            const existingUser = multiGmailManager.users.find(u => u.username === userData.username);
            if (existingUser) {
                this.showNotification('Username already exists', 'error');
                return;
            }

            // Add user through multi-Gmail manager
            const user = multiGmailManager.addUser(userData);
            
            this.showNotification(`User "${user.username}" added successfully!`, 'success');
            this.closeModal('add-user-modal');
            this.updateAllDisplays();
            
        } catch (error) {
            console.error('Error adding user:', error);
            this.showNotification('Failed to add user: ' + error.message, 'error');
        }
    }

    // Edit user
    editUser(userId) {
        const user = multiGmailManager.users.find(u => u.id === userId);
        if (!user) return;

        // Pre-fill form with user data
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-daily-limit').value = user.dailyLimit;
        document.getElementById('user-account-type').value = user.accountType;

        // Change form submission to update instead of add
        const form = document.getElementById('add-user-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            this.updateUser(userId);
        };

        // Update modal title
        document.querySelector('#add-user-modal .modal-header h3').textContent = 'Edit User';
        
        this.showModal('add-user-modal');
    }

    // Update user
    updateUser(userId) {
        try {
            const updates = {
                username: document.getElementById('user-username').value,
                email: document.getElementById('user-email').value,
                role: document.getElementById('user-role').value,
                dailyLimit: parseInt(document.getElementById('user-daily-limit').value),
                accountType: document.getElementById('user-account-type').value
            };

            multiGmailManager.updateUser(userId, updates);
            
            this.showNotification('User updated successfully!', 'success');
            this.closeModal('add-user-modal');
            this.updateAllDisplays();
            
            // Reset form submission
            document.getElementById('add-user-form').onsubmit = (e) => {
                e.preventDefault();
                this.addUser();
            };
            
            // Reset modal title
            document.querySelector('#add-user-modal .modal-header h3').textContent = 'Add User';
            
        } catch (error) {
            console.error('Error updating user:', error);
            this.showNotification('Failed to update user: ' + error.message, 'error');
        }
    }

    // Login functionality
    login() {
        try {
            const username = document.getElementById('login-username').value;
            
            if (!username) {
                this.showNotification('Please enter a username', 'error');
                return;
            }

            const user = multiGmailManager.loginUser(username);
            
            this.showNotification(`Welcome back, ${user.username}!`, 'success');
            this.closeModal('login-modal');
            this.updateAllDisplays();
            
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed: ' + error.message, 'error');
        }
    }

    // Show login modal
    showLoginModal() {
        this.showModal('login-modal');
    }

    // Show add account modal
    showAddAccountModal() {
        this.showModal('add-account-modal');
    }

    // Show add user modal
    showAddUserModal() {
        this.showModal('add-user-modal');
    }

    // Tutorial system
    showTutorial() {
        document.getElementById('tutorial-overlay').classList.remove('hidden');
        this.tutorialStep = 1;
        this.updateTutorialStep();
    }

    nextTutorialStep() {
        if (this.tutorialStep < this.maxTutorialSteps) {
            document.getElementById(`tutorial-step-${this.tutorialStep}`).classList.add('hidden');
            this.tutorialStep++;
            document.getElementById(`tutorial-step-${this.tutorialStep}`).classList.remove('hidden');
        }
    }

    closeTutorial() {
        document.getElementById('tutorial-overlay').classList.add('hidden');
        localStorage.setItem('tutorial_completed', 'true');
    }

    updateTutorialStep() {
        // Hide all steps
        for (let i = 1; i <= this.maxTutorialSteps; i++) {
            document.getElementById(`tutorial-step-${i}`).classList.add('hidden');
        }
        
        // Show current step
        document.getElementById(`tutorial-step-${this.tutorialStep}`).classList.remove('hidden');
    }

    // Analytics and charts
    initializeCharts() {
        // Daily Volume Chart
        const dailyVolumeCtx = document.getElementById('daily-volume-chart');
        if (dailyVolumeCtx) {
            this.charts.dailyVolume = new Chart(dailyVolumeCtx, {
                type: 'line',
                data: {
                    labels: this.getLast7Days(),
                    datasets: [{
                        label: 'Emails Sent',
                        data: this.generateDummyData(7),
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Account Usage Chart
        const accountUsageCtx = document.getElementById('account-usage-chart');
        if (accountUsageCtx) {
            this.charts.accountUsage = new Chart(accountUsageCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Account 1', 'Account 2', 'Account 3'],
                    datasets: [{
                        data: [300, 150, 100],
                        backgroundColor: ['#667eea', '#764ba2', '#f093fb']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // User Activity Chart
        const userActivityCtx = document.getElementById('user-activity-chart');
        if (userActivityCtx) {
            this.charts.userActivity = new Chart(userActivityCtx, {
                type: 'bar',
                data: {
                    labels: ['Admin', 'User 1', 'User 2', 'User 3'],
                    datasets: [{
                        label: 'Emails Sent',
                        data: [120, 80, 60, 40],
                        backgroundColor: 'rgba(102, 126, 234, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Success Rate Chart
        const successRateCtx = document.getElementById('success-rate-chart');
        if (successRateCtx) {
            this.charts.successRate = new Chart(successRateCtx, {
                type: 'line',
                data: {
                    labels: this.getLast7Days(),
                    datasets: [{
                        label: 'Success Rate (%)',
                        data: [98, 97, 99, 96, 98, 99, 97],
                        borderColor: '#38a169',
                        backgroundColor: 'rgba(56, 161, 105, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 90,
                            max: 100
                        }
                    }
                }
            });
        }
    }

    updateAnalytics() {
        // Update charts with real data
        if (this.charts.dailyVolume) {
            this.charts.dailyVolume.data.datasets[0].data = this.generateDummyData(7);
            this.charts.dailyVolume.update();
        }

        if (this.charts.accountUsage) {
            const accountData = multiGmailManager.accounts.map(account => account.dailyUsage);
            const accountLabels = multiGmailManager.accounts.map(account => account.name);
            
            this.charts.accountUsage.data.labels = accountLabels;
            this.charts.accountUsage.data.datasets[0].data = accountData;
            this.charts.accountUsage.update();
        }
    }

    // Utility functions
    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return days;
    }

    generateDummyData(count) {
        return Array.from({ length: count }, () => Math.floor(Math.random() * 200) + 50);
    }

    // Update all displays
    updateAllDisplays() {
        if (multiGmailManager) {
            multiGmailManager.updateUI();
        }
        this.updateActivityFeed();
    }

    // Update activity feed
    updateActivityFeed() {
        const container = document.getElementById('activity-feed');
        if (!container) return;

        const activities = this.getRecentActivities();
        
        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    getRecentActivities() {
        // Generate sample activities (in production, this would come from a real activity log)
        return [
            {
                icon: 'fas fa-envelope',
                title: 'Bulk email campaign sent to 150 recipients',
                time: '2 minutes ago'
            },
            {
                icon: 'fas fa-user-plus',
                title: 'New user "john_doe" added to system',
                time: '15 minutes ago'
            },
            {
                icon: 'fas fa-cog',
                title: 'Gmail account "marketing@company.com" configured',
                time: '1 hour ago'
            },
            {
                icon: 'fas fa-chart-line',
                title: 'Daily sending limit reached for Account 2',
                time: '2 hours ago'
            },
            {
                icon: 'fas fa-shield-alt',
                title: 'System auto-locked due to rate limits',
                time: '3 hours ago'
            }
        ];
    }

    // Auto-refresh functionality
    startAutoRefresh() {
        setInterval(() => {
            this.updateAllDisplays();
        }, 30000); // Refresh every 30 seconds
    }

    // Notification system
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingToast = document.querySelector('.notification-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new notification
        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        // Show notification
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Hide notification after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }

    // Export functionality
    exportSystemData() {
        const data = {
            accounts: multiGmailManager.accounts,
            users: multiGmailManager.users,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `aurareach-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('System data exported successfully!', 'success');
    }

    // Reset functionality
    resetAllCounters() {
        if (confirm('Are you sure you want to reset all usage counters? This action cannot be undone.')) {
            multiGmailManager.accounts.forEach(account => {
                account.dailyUsage = 0;
                account.hourlyUsage = 0;
            });

            multiGmailManager.users.forEach(user => {
                user.dailyUsage = 0;
            });

            multiGmailManager.saveData();
            this.updateAllDisplays();
            this.showNotification('All counters reset successfully!', 'success');
        }
    }

    confirmDataReset() {
        if (confirm('⚠️ WARNING: This will delete ALL data including accounts, users, and settings. This action cannot be undone. Are you absolutely sure?')) {
            if (confirm('This is your final warning. All data will be permanently deleted. Continue?')) {
                localStorage.clear();
                location.reload();
            }
        }
    }

    // Open email sender
    openEmailSender() {
        window.open('gmail-sender.html', '_blank');
    }

    // Generate report
    generateReport() {
        this.showNotification('Report generation feature coming soon!', 'info');
    }
}

// Global functions for HTML onclick events
function showAddAccountModal() {
    if (window.adminPanel) window.adminPanel.showAddAccountModal();
}

function showAddUserModal() {
    if (window.adminPanel) window.adminPanel.showAddUserModal();
}

function showLoginModal() {
    if (window.adminPanel) window.adminPanel.showLoginModal();
}

function addAccount() {
    if (window.adminPanel) window.adminPanel.addAccount();
}

function addUser() {
    if (window.adminPanel) window.adminPanel.addUser();
}

function editUser(userId) {
    if (window.adminPanel) window.adminPanel.editUser(userId);
}

function login() {
    if (window.adminPanel) window.adminPanel.login();
}

function closeModal(modalId) {
    if (window.adminPanel) window.adminPanel.closeModal(modalId);
}

function nextTutorialStep() {
    if (window.adminPanel) window.adminPanel.nextTutorialStep();
}

function closeTutorial() {
    if (window.adminPanel) window.adminPanel.closeTutorial();
}

function startTutorial() {
    if (window.adminPanel) window.adminPanel.showTutorial();
}

function updateAnalytics() {
    if (window.adminPanel) window.adminPanel.updateAnalytics();
}

function exportSystemData() {
    if (window.adminPanel) window.adminPanel.exportSystemData();
}

function resetAllCounters() {
    if (window.adminPanel) window.adminPanel.resetAllCounters();
}

function confirmDataReset() {
    if (window.adminPanel) window.adminPanel.confirmDataReset();
}

function openEmailSender() {
    if (window.adminPanel) window.adminPanel.openEmailSender();
}

function generateReport() {
    if (window.adminPanel) window.adminPanel.generateReport();
}

function exportAnalytics() {
    if (window.adminPanel) window.adminPanel.exportSystemData();
}

function showImportModal() {
    if (window.adminPanel) window.adminPanel.showNotification('Import functionality coming soon!', 'info');
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});