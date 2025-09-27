// Multi-Gmail Account Manager with Rotation and Safety Features
class MultiGmailManager {
    constructor() {
        this.accounts = [];
        this.currentAccountIndex = 0;
        this.accountTypes = {
            personal: {
                name: 'Personal Gmail',
                daily: 400,
                hourly: 80,
                buffer: 50,
                warningThreshold: 0.8,
                criticalThreshold: 0.95,
                features: ['basic_sending', 'simple_analytics'],
                description: 'Standard Gmail account with basic limits'
            },
            workspace: {
                name: 'Google Workspace',
                daily: 1600,
                hourly: 200,
                buffer: 200,
                warningThreshold: 0.75,
                criticalThreshold: 0.9,
                features: ['advanced_sending', 'detailed_analytics', 'custom_domain'],
                description: 'Google Workspace account with enhanced limits'
            },
            enterprise: {
                name: 'Enterprise Account',
                daily: 8000,
                hourly: 800,
                buffer: 800,
                warningThreshold: 0.7,
                criticalThreshold: 0.85,
                features: ['bulk_sending', 'advanced_analytics', 'custom_domain', 'priority_support', 'api_access'],
                description: 'Enterprise-grade account with maximum limits'
            },
            custom: {
                name: 'Custom Configuration',
                daily: 2000,
                hourly: 250,
                buffer: 300,
                warningThreshold: 0.8,
                criticalThreshold: 0.9,
                features: ['configurable_limits', 'custom_analytics'],
                description: 'Customizable account with flexible limits'
            }
        };
        
        this.userRoles = {
            admin: {
                name: 'Administrator',
                permissions: ['manage_accounts', 'manage_users', 'view_analytics', 'system_settings', 'bulk_operations'],
                defaultDailyLimit: 5000,
                canExceedLimits: true
            },
            manager: {
                name: 'Manager',
                permissions: ['manage_users', 'view_analytics', 'bulk_operations'],
                defaultDailyLimit: 2000,
                canExceedLimits: false
            },
            user: {
                name: 'Standard User',
                permissions: ['send_emails', 'view_basic_analytics'],
                defaultDailyLimit: 500,
                canExceedLimits: false
            },
            viewer: {
                name: 'Viewer',
                permissions: ['view_basic_analytics'],
                defaultDailyLimit: 0,
                canExceedLimits: false
            }
        };
        this.users = [];
        this.currentUser = null;
        this.isLocked = false;
        this.lockReason = '';
        
        this.initializeManager();
    }

    // Initialize the manager
    async initializeManager() {
        this.loadStoredData();
        this.setupEventListeners();
        this.updateUI();
    }

    // Load stored data from localStorage
    loadStoredData() {
        try {
            const storedAccounts = localStorage.getItem('gmail_accounts');
            if (storedAccounts) {
                this.accounts = JSON.parse(storedAccounts);
            }

            const storedUsers = localStorage.getItem('system_users');
            if (storedUsers) {
                this.users = JSON.parse(storedUsers);
            }

            const currentUser = localStorage.getItem('current_user');
            if (currentUser) {
                this.currentUser = JSON.parse(currentUser);
            }

            // Initialize default admin user if none exists
            if (this.users.length === 0) {
                this.createDefaultAdmin();
            }
        } catch (error) {
            console.error('Error loading stored data:', error);
        }
    }

    // Create default admin user
    createDefaultAdmin() {
        const adminUser = {
            id: 'admin_' + Date.now(),
            username: 'admin',
            email: 'admin@system.local',
            role: 'admin',
            dailyLimit: 2000,
            accountType: 'workspace',
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        this.users.push(adminUser);
        this.currentUser = adminUser;
        this.saveData();
    }

    // Add Gmail account
    async addGmailAccount(accountData) {
        const account = {
            id: 'account_' + Date.now(),
            name: accountData.name || `Account ${this.accounts.length + 1}`,
            clientId: accountData.clientId,
            apiKey: accountData.apiKey,
            email: accountData.email,
            accountType: accountData.accountType || 'personal',
            isActive: true,
            dailyUsage: 0,
            hourlyUsage: 0,
            lastResetDate: new Date().toDateString(),
            lastResetHour: new Date().getHours(),
            gmailAPI: null,
            status: 'disconnected'
        };

        // Initialize Gmail API for this account
        account.gmailAPI = new GmailAPI();
        await account.gmailAPI.setupCredentials(account.clientId, account.apiKey);
        
        this.accounts.push(account);
        this.saveData();
        this.updateUI();
        
        return account;
    }

    // Remove Gmail account
    removeGmailAccount(accountId) {
        this.accounts = this.accounts.filter(account => account.id !== accountId);
        this.saveData();
        this.updateUI();
    }

    // Get next available account for sending
    getNextAvailableAccount() {
        if (this.accounts.length === 0) {
            return null;
        }

        // Reset counters if needed
        this.resetCountersIfNeeded();

        // Find account with available capacity
        for (let i = 0; i < this.accounts.length; i++) {
            const account = this.accounts[this.currentAccountIndex];
            const accountConfig = this.accountTypes[account.accountType] || this.accountTypes.personal;
            
            // Calculate dynamic thresholds based on account type
            const dailyThreshold = accountConfig.daily - accountConfig.buffer;
            const hourlyThreshold = accountConfig.hourly - Math.floor(accountConfig.buffer / 24);
            
            // Check if account is available and within limits
            if (account.isActive && 
                account.status === 'connected' &&
                account.dailyUsage < dailyThreshold &&
                account.hourlyUsage < hourlyThreshold) {
                
                // Additional check for user permissions
                if (this.currentUser && !this.hasPermission('send_emails')) {
                    continue;
                }
                
                return account;
            }
            
            this.currentAccountIndex = (this.currentAccountIndex + 1) % this.accounts.length;
        }

        return null;
    }

    // Check if current user has specific permission
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const userRole = this.userRoles[this.currentUser.role] || this.userRoles.user;
        return userRole.permissions.includes(permission);
    }

    // Get account limits with dynamic calculation
    getAccountLimits(accountType) {
        const config = this.accountTypes[accountType] || this.accountTypes.personal;
        return {
            daily: config.daily,
            hourly: config.hourly,
            buffer: config.buffer,
            warningThreshold: Math.floor(config.daily * config.warningThreshold),
            criticalThreshold: Math.floor(config.daily * config.criticalThreshold),
            features: config.features,
            description: config.description
        };
    }

    // Get user limits based on role and individual settings
    getUserLimits(user = null) {
        const targetUser = user || this.currentUser;
        if (!targetUser) return { daily: 0, canExceedLimits: false };

        const roleConfig = this.userRoles[targetUser.role] || this.userRoles.user;
        return {
            daily: targetUser.dailyLimit || roleConfig.defaultDailyLimit,
            canExceedLimits: roleConfig.canExceedLimits,
            permissions: roleConfig.permissions
        };
    }

    // Check if sending is allowed based on all limits
    canSendEmail() {
        // Check system lock
        if (this.isLocked) {
            return { allowed: false, reason: this.lockReason };
        }

        // Check user permissions
        if (!this.hasPermission('send_emails')) {
            return { allowed: false, reason: 'Insufficient permissions to send emails' };
        }

        // Check user daily limit
        const userLimits = this.getUserLimits();
        const userUsage = this.getCurrentUserUsage();
        
        if (userUsage.used >= userLimits.daily && !userLimits.canExceedLimits) {
            return { allowed: false, reason: 'User daily limit exceeded' };
        }

        // Check account availability
        const availableAccount = this.getNextAvailableAccount();
        if (!availableAccount) {
            return { allowed: false, reason: 'No available accounts within limits' };
        }

        return { allowed: true, account: availableAccount };
    }

    // Reset counters if new day/hour
    resetCountersIfNeeded() {
        const currentDate = new Date().toDateString();
        const currentHour = new Date().getHours();

        this.accounts.forEach(account => {
            // Reset daily counter
            if (account.lastResetDate !== currentDate) {
                account.dailyUsage = 0;
                account.lastResetDate = currentDate;
            }

            // Reset hourly counter
            if (account.lastResetHour !== currentHour) {
                account.hourlyUsage = 0;
                account.lastResetHour = currentHour;
            }
        });

        this.saveData();
    }

    // Send email with rotation
    async sendEmailWithRotation(emailData, progressCallback) {
        if (this.isLocked) {
            throw new Error(`System is locked: ${this.lockReason}`);
        }

        if (!this.canUserSend()) {
            throw new Error('User has reached their daily sending limit');
        }

        try {
            const account = this.getNextAvailableAccount();
            
            // Update usage counters
            account.dailyUsage++;
            account.hourlyUsage++;
            
            // Update user usage
            this.updateUserUsage();
            
            // Send email
            const result = await account.gmailAPI.sendEmail(emailData);
            
            // Update UI and save data
            this.saveData();
            this.updateUI();
            
            if (progressCallback) {
                progressCallback({
                    account: account.name,
                    dailyUsage: account.dailyUsage,
                    dailyLimit: this.dailyLimits[account.accountType].daily,
                    userUsage: this.getCurrentUserUsage()
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    // Send bulk emails with rotation
    async sendBulkEmailsWithRotation(emailList, progressCallback) {
        if (this.isLocked) {
            throw new Error(`System is locked: ${this.lockReason}`);
        }

        const results = [];
        const errors = [];
        
        for (let i = 0; i < emailList.length; i++) {
            try {
                if (!this.canUserSend()) {
                    this.lockSystem('User has reached their daily sending limit');
                    break;
                }

                const result = await this.sendEmailWithRotation(emailList[i], progressCallback);
                results.push(result);
                
                // Add delay between sends
                if (i < emailList.length - 1) {
                    await this.delay(30000); // 30 second delay
                }
                
            } catch (error) {
                errors.push({ email: emailList[i], error: error.message });
                
                // If all accounts are exhausted, stop
                if (error.message.includes('reached their sending limits')) {
                    break;
                }
            }
        }
        
        return { results, errors };
    }

    // User Management Functions
    addUser(userData) {
        const user = {
            id: 'user_' + Date.now(),
            username: userData.username,
            email: userData.email,
            role: userData.role || 'user',
            dailyLimit: userData.dailyLimit || 100,
            accountType: userData.accountType || 'personal',
            isActive: true,
            dailyUsage: 0,
            lastResetDate: new Date().toDateString(),
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        this.users.push(user);
        this.saveData();
        this.updateUI();
        
        return user;
    }

    removeUser(userId) {
        if (this.currentUser && this.currentUser.id === userId) {
            throw new Error('Cannot remove currently logged in user');
        }
        
        this.users = this.users.filter(user => user.id !== userId);
        this.saveData();
        this.updateUI();
    }

    updateUser(userId, updates) {
        const userIndex = this.users.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            this.users[userIndex] = { ...this.users[userIndex], ...updates };
            this.saveData();
            this.updateUI();
        }
    }

    loginUser(username, password = null) {
        // Simple username-based login for demo (in production, use proper authentication)
        const user = this.users.find(u => u.username === username && u.isActive);
        if (user) {
            user.lastLogin = new Date().toISOString();
            this.currentUser = user;
            this.saveData();
            this.updateUI();
            return user;
        }
        throw new Error('User not found or inactive');
    }

    logoutUser() {
        this.currentUser = null;
        localStorage.removeItem('current_user');
        this.updateUI();
    }

    // Check if current user can send more emails
    canUserSend() {
        if (!this.currentUser) return false;
        
        // Reset user daily counter if needed
        const currentDate = new Date().toDateString();
        if (this.currentUser.lastResetDate !== currentDate) {
            this.currentUser.dailyUsage = 0;
            this.currentUser.lastResetDate = currentDate;
        }
        
        return this.currentUser.dailyUsage < this.currentUser.dailyLimit;
    }

    // Update user usage
    updateUserUsage() {
        if (this.currentUser) {
            this.currentUser.dailyUsage++;
        }
    }

    // Get current user usage
    getCurrentUserUsage() {
        return this.currentUser ? {
            used: this.currentUser.dailyUsage,
            limit: this.currentUser.dailyLimit,
            remaining: this.currentUser.dailyLimit - this.currentUser.dailyUsage
        } : null;
    }

    // Lock/Unlock system
    lockSystem(reason) {
        this.isLocked = true;
        this.lockReason = reason;
        this.updateUI();
        this.showNotification(`System locked: ${reason}`, 'warning');
    }

    unlockSystem() {
        this.isLocked = false;
        this.lockReason = '';
        this.updateUI();
        this.showNotification('System unlocked', 'success');
    }

    // Get system status
    getSystemStatus() {
        const totalAccounts = this.accounts.length;
        const activeAccounts = this.accounts.filter(a => a.isActive).length;
        const totalDailyCapacity = this.accounts.reduce((sum, account) => {
            return sum + this.dailyLimits[account.accountType].daily;
        }, 0);
        const totalDailyUsage = this.accounts.reduce((sum, account) => {
            return sum + account.dailyUsage;
        }, 0);

        return {
            isLocked: this.isLocked,
            lockReason: this.lockReason,
            totalAccounts,
            activeAccounts,
            totalDailyCapacity,
            totalDailyUsage,
            remainingCapacity: totalDailyCapacity - totalDailyUsage,
            currentUser: this.currentUser,
            userUsage: this.getCurrentUserUsage()
        };
    }

    // Save data to localStorage
    saveData() {
        try {
            localStorage.setItem('gmail_accounts', JSON.stringify(this.accounts));
            localStorage.setItem('system_users', JSON.stringify(this.users));
            if (this.currentUser) {
                localStorage.setItem('current_user', JSON.stringify(this.currentUser));
            }
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Auto-unlock system at midnight
        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                if (this.isLocked && this.lockReason.includes('daily limits')) {
                    this.unlockSystem();
                }
            }
        }, 60000); // Check every minute
    }

    // Update UI elements
    updateUI() {
        this.updateAccountsDisplay();
        this.updateUsersDisplay();
        this.updateStatusDisplay();
        this.updateUserInfo();
    }

    updateAccountsDisplay() {
        const container = document.getElementById('accounts-list');
        if (!container) return;

        container.innerHTML = this.accounts.map(account => {
            const limits = this.dailyLimits[account.accountType];
            const usagePercent = (account.dailyUsage / limits.daily) * 100;
            
            return `
                <div class="account-card ${account.isActive ? 'active' : 'inactive'}">
                    <div class="account-header">
                        <h4>${account.name}</h4>
                        <span class="account-type">${account.accountType}</span>
                    </div>
                    <div class="account-email">${account.email}</div>
                    <div class="usage-bar">
                        <div class="usage-fill" style="width: ${usagePercent}%"></div>
                    </div>
                    <div class="usage-text">${account.dailyUsage}/${limits.daily} emails today</div>
                    <div class="account-actions">
                        <button onclick="multiGmailManager.toggleAccount('${account.id}')" 
                                class="btn ${account.isActive ? 'btn-warning' : 'btn-success'}">
                            ${account.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onclick="multiGmailManager.removeGmailAccount('${account.id}')" 
                                class="btn btn-danger">Remove</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateUsersDisplay() {
        const container = document.getElementById('users-list');
        if (!container) return;

        container.innerHTML = this.users.map(user => {
            const usagePercent = (user.dailyUsage / user.dailyLimit) * 100;
            
            return `
                <div class="user-card ${user.isActive ? 'active' : 'inactive'}">
                    <div class="user-header">
                        <h4>${user.username}</h4>
                        <span class="user-role">${user.role}</span>
                    </div>
                    <div class="user-email">${user.email}</div>
                    <div class="usage-bar">
                        <div class="usage-fill" style="width: ${usagePercent}%"></div>
                    </div>
                    <div class="usage-text">${user.dailyUsage}/${user.dailyLimit} emails today</div>
                    <div class="user-actions">
                        <button onclick="editUser('${user.id}')" class="btn btn-primary">Edit</button>
                        ${user.id !== this.currentUser?.id ? 
                            `<button onclick="multiGmailManager.removeUser('${user.id}')" class="btn btn-danger">Remove</button>` : 
                            '<span class="current-user-badge">Current User</span>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStatusDisplay() {
        const status = this.getSystemStatus();
        const container = document.getElementById('system-status');
        if (!container) return;

        container.innerHTML = `
            <div class="status-grid">
                <div class="status-item">
                    <div class="status-label">System Status</div>
                    <div class="status-value ${status.isLocked ? 'locked' : 'active'}">
                        ${status.isLocked ? '🔒 Locked' : '✅ Active'}
                    </div>
                    ${status.isLocked ? `<div class="status-reason">${status.lockReason}</div>` : ''}
                </div>
                <div class="status-item">
                    <div class="status-label">Accounts</div>
                    <div class="status-value">${status.activeAccounts}/${status.totalAccounts} Active</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Daily Capacity</div>
                    <div class="status-value">${status.totalDailyUsage}/${status.totalDailyCapacity}</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Remaining</div>
                    <div class="status-value">${status.remainingCapacity} emails</div>
                </div>
            </div>
        `;
    }

    updateUserInfo() {
        const container = document.getElementById('current-user-info');
        if (!container) return;

        if (this.currentUser) {
            const usage = this.getCurrentUserUsage();
            container.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${this.currentUser.username.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <div class="user-name">${this.currentUser.username}</div>
                        <div class="user-usage">${usage.used}/${usage.limit} emails today</div>
                    </div>
                    <button onclick="multiGmailManager.logoutUser()" class="btn btn-outline">Logout</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="login-prompt">
                    <button onclick="showLoginModal()" class="btn btn-primary">Login</button>
                </div>
            `;
        }
    }

    // Toggle account active status
    toggleAccount(accountId) {
        const account = this.accounts.find(a => a.id === accountId);
        if (account) {
            account.isActive = !account.isActive;
            this.saveData();
            this.updateUI();
        }
    }

    // Utility functions
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showNotification(message, type = 'info') {
        // Implementation depends on your notification system
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    // Enhanced Analytics Methods
    getAnalyticsData() {
        const today = new Date().toDateString();
        const thisWeek = this.getWeekStart(new Date());
        const thisMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');

        return {
            overview: this.getOverviewStats(),
            accounts: this.getAccountAnalytics(),
            users: this.getUserAnalytics(),
            performance: this.getPerformanceMetrics(),
            trends: this.getTrendAnalytics(),
            safety: this.getSafetyMetrics(),
            timeframes: {
                today: this.getTimeframeStats(today, 'day'),
                week: this.getTimeframeStats(thisWeek, 'week'),
                month: this.getTimeframeStats(thisMonth, 'month')
            }
        };
    }

    getOverviewStats() {
        const totalAccounts = this.accounts.length;
        const activeAccounts = this.accounts.filter(acc => acc.isActive && acc.status === 'connected').length;
        const totalDailyUsage = this.accounts.reduce((sum, acc) => sum + (acc.dailyUsage || 0), 0);
        const totalDailyLimit = this.accounts.reduce((sum, acc) => {
            const config = this.accountTypes[acc.accountType] || this.accountTypes.personal;
            return sum + config.daily;
        }, 0);

        return {
            totalAccounts,
            activeAccounts,
            inactiveAccounts: totalAccounts - activeAccounts,
            totalDailyUsage,
            totalDailyLimit,
            usagePercentage: totalDailyLimit > 0 ? (totalDailyUsage / totalDailyLimit) * 100 : 0,
            remainingCapacity: totalDailyLimit - totalDailyUsage,
            averageUsagePerAccount: activeAccounts > 0 ? totalDailyUsage / activeAccounts : 0
        };
    }

    getAccountAnalytics() {
        return this.accounts.map(account => {
            const config = this.accountTypes[account.accountType] || this.accountTypes.personal;
            const usagePercentage = (account.dailyUsage / config.daily) * 100;
            const status = this.getAccountStatus(account, config);

            return {
                id: account.id,
                name: account.name,
                email: account.email,
                type: account.accountType,
                typeName: config.name,
                dailyUsage: account.dailyUsage || 0,
                dailyLimit: config.daily,
                hourlyUsage: account.hourlyUsage || 0,
                hourlyLimit: config.hourly,
                usagePercentage: Math.round(usagePercentage * 10) / 10,
                remainingToday: config.daily - (account.dailyUsage || 0),
                status: status,
                isActive: account.isActive,
                features: config.features,
                warningThreshold: config.warningThreshold,
                criticalThreshold: config.criticalThreshold
            };
        });
    }

    getUserAnalytics() {
        return this.users.map(user => {
            const usage = this.getUserUsageStats(user.id);
            const limits = this.getUserLimits(user);
            const roleConfig = this.userRoles[user.role] || this.userRoles.user;

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                roleName: roleConfig.name,
                dailyUsage: usage.daily,
                dailyLimit: limits.daily,
                usagePercentage: limits.daily > 0 ? (usage.daily / limits.daily) * 100 : 0,
                permissions: roleConfig.permissions,
                canExceedLimits: limits.canExceedLimits,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                totalEmailsSent: usage.total
            };
        });
    }

    getTimeframeStats(timeframe, type) {
        const emailLog = this.getEmailLog();
        const now = new Date();
        let startTime;

        // Calculate start time based on timeframe type
        switch (type) {
            case 'day':
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startTime = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startTime = timeframe;
        }

        // Filter emails within the timeframe
        const timeframeEmails = emailLog.filter(entry => {
            const entryTime = new Date(entry.timestamp);
            return entryTime >= startTime && entryTime <= now;
        });

        // Calculate statistics
        const totalEmails = timeframeEmails.length;
        const sentEmails = timeframeEmails.filter(entry => entry.status === 'sent').length;
        const failedEmails = timeframeEmails.filter(entry => entry.status === 'failed').length;
        const successRate = totalEmails > 0 ? (sentEmails / totalEmails) * 100 : 0;

        // Calculate unique accounts used
        const uniqueAccounts = new Set(timeframeEmails.map(entry => entry.accountId)).size;

        // Calculate average emails per day
        const daysDiff = Math.max(1, Math.ceil((now - startTime) / (24 * 60 * 60 * 1000)));
        const avgEmailsPerDay = totalEmails / daysDiff;

        return {
            totalEmails,
            sentEmails,
            failedEmails,
            successRate: Math.round(successRate * 100) / 100,
            uniqueAccounts,
            avgEmailsPerDay: Math.round(avgEmailsPerDay * 100) / 100,
            timeframe: type,
            startTime: startTime.toISOString(),
            endTime: now.toISOString()
        };
    }

    getAccounts() {
        try {
            const accounts = localStorage.getItem('gmail_accounts');
            return accounts ? JSON.parse(accounts) : [];
        } catch (error) {
            console.error('Error getting accounts:', error);
            return [];
        }
    }

    async getAccountsStatus() {
        const accounts = this.getAccounts();
        const emailLog = this.getEmailLog();
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        return accounts.map(account => {
            // Count emails sent today for this account
            const todayEmails = emailLog.filter(entry => {
                const entryDate = new Date(entry.timestamp);
                return entryDate >= todayStart && 
                       entry.accountId === account.id && 
                       entry.status === 'sent';
            });

            return {
                id: account.id,
                email: account.email,
                status: account.isActive ? 'active' : 'inactive',
                dailySent: todayEmails.length,
                dailyLimit: account.dailyLimit || 500, // Default limit
                lastUsed: account.lastUsed || null,
                isAuthenticated: account.isAuthenticated || false
            };
        });
    }

    getPerformanceMetrics() {
        const emailLog = this.getEmailLog();
        const last24Hours = emailLog.filter(entry => 
            new Date() - new Date(entry.timestamp) < 24 * 60 * 60 * 1000
        );

        const successfulEmails = last24Hours.filter(entry => entry.status === 'sent').length;
        const failedEmails = last24Hours.filter(entry => entry.status === 'failed').length;
        const totalEmails = last24Hours.length;

        return {
            deliveryRate: totalEmails > 0 ? (successfulEmails / totalEmails) * 100 : 100,
            successfulEmails,
            failedEmails,
            totalEmails,
            averageResponseTime: this.calculateAverageResponseTime(last24Hours),
            peakHour: this.getPeakUsageHour(last24Hours),
            accountDistribution: this.getAccountUsageDistribution(last24Hours)
        };
    }

    getTrendAnalytics() {
        const emailLog = this.getEmailLog();
        const last7Days = this.getLast7DaysData(emailLog);
        const last30Days = this.getLast30DaysData(emailLog);

        return {
            daily: last7Days,
            monthly: last30Days,
            growth: this.calculateGrowthMetrics(emailLog),
            patterns: this.identifyUsagePatterns(emailLog)
        };
    }

    getSafetyMetrics() {
        const accounts = this.getAccountAnalytics();
        const safetyScores = accounts.map(acc => {
            if (acc.usagePercentage >= acc.criticalThreshold) return 20;
            if (acc.usagePercentage >= acc.warningThreshold) return 60;
            if (acc.usagePercentage >= 50) return 80;
            return 100;
        });

        const averageSafetyScore = safetyScores.length > 0 ? 
            safetyScores.reduce((sum, score) => sum + score, 0) / safetyScores.length : 100;

        return {
            averageSafetyScore: Math.round(averageSafetyScore),
            accountsAtRisk: accounts.filter(acc => acc.usagePercentage >= acc.warningThreshold).length,
            accountsInCritical: accounts.filter(acc => acc.usagePercentage >= acc.criticalThreshold).length,
            systemLocked: this.isLocked,
            lockReason: this.lockReason,
            bufferUtilization: this.calculateBufferUtilization()
        };
    }

    // Helper methods for analytics
    getAccountStatus(account, config) {
        if (!account.isActive) return 'inactive';
        if (account.status !== 'connected') return 'disconnected';
        
        const usagePercentage = (account.dailyUsage / config.daily) * 100;
        if (usagePercentage >= config.criticalThreshold) return 'critical';
        if (usagePercentage >= config.warningThreshold) return 'warning';
        return 'healthy';
    }

    getUserUsageStats(userId) {
        const emailLog = this.getEmailLog();
        const today = new Date().toDateString();
        
        const userEmails = emailLog.filter(entry => entry.userId === userId);
        const todayEmails = userEmails.filter(entry => 
            new Date(entry.timestamp).toDateString() === today
        );

        return {
            daily: todayEmails.length,
            total: userEmails.length,
            successful: userEmails.filter(entry => entry.status === 'sent').length,
            failed: userEmails.filter(entry => entry.status === 'failed').length
        };
    }

    getEmailLog() {
        try {
            return JSON.parse(localStorage.getItem('aurareach_email_log') || '[]');
        } catch (error) {
            console.error('Error loading email log:', error);
            return [];
        }
    }

    calculateAverageResponseTime(emails) {
        const responseTimes = emails
            .filter(entry => entry.responseTime)
            .map(entry => entry.responseTime);
        
        return responseTimes.length > 0 ? 
            responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
    }

    getPeakUsageHour(emails) {
        const hourCounts = {};
        emails.forEach(entry => {
            const hour = new Date(entry.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        let peakHour = 0;
        let maxCount = 0;
        Object.entries(hourCounts).forEach(([hour, count]) => {
            if (count > maxCount) {
                maxCount = count;
                peakHour = parseInt(hour);
            }
        });

        return peakHour;
    }

    getAccountUsageDistribution(emails) {
        const distribution = {};
        emails.forEach(entry => {
            const accountId = entry.accountId || 'unknown';
            distribution[accountId] = (distribution[accountId] || 0) + 1;
        });
        return distribution;
    }

    getLast7DaysData(emailLog) {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            
            const dayEmails = emailLog.filter(entry => 
                new Date(entry.timestamp).toDateString() === dateString
            );
            
            data.push({
                date: dateString,
                count: dayEmails.length,
                successful: dayEmails.filter(entry => entry.status === 'sent').length,
                failed: dayEmails.filter(entry => entry.status === 'failed').length
            });
        }
        return data;
    }

    getLast30DaysData(emailLog) {
        const data = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            
            const dayEmails = emailLog.filter(entry => 
                new Date(entry.timestamp).toDateString() === dateString
            );
            
            data.push({
                date: dateString,
                count: dayEmails.length
            });
        }
        return data;
    }

    calculateGrowthMetrics(emailLog) {
        const thisWeek = this.getWeekStart(new Date());
        const lastWeek = new Date(thisWeek);
        lastWeek.setDate(lastWeek.getDate() - 7);

        const thisWeekEmails = emailLog.filter(entry => 
            new Date(entry.timestamp) >= thisWeek
        ).length;
        
        const lastWeekEmails = emailLog.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= lastWeek && entryDate < thisWeek;
        }).length;

        const weeklyGrowth = lastWeekEmails > 0 ? 
            ((thisWeekEmails - lastWeekEmails) / lastWeekEmails) * 100 : 0;

        return {
            weeklyGrowth: Math.round(weeklyGrowth * 10) / 10,
            thisWeekTotal: thisWeekEmails,
            lastWeekTotal: lastWeekEmails
        };
    }

    getPeakDays(emailLog) {
        const dayCounts = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        emailLog.forEach(entry => {
            const day = new Date(entry.timestamp).getDay();
            const dayName = dayNames[day];
            dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
        });

        // Sort days by count and return top 3
        const sortedDays = Object.entries(dayCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([day, count]) => ({ day, count }));

        return sortedDays;
    }

    getPeakHours(emailLog) {
        const hourCounts = {};
        
        emailLog.forEach(entry => {
            const hour = new Date(entry.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        // Sort hours by count and return top 3
        const sortedHours = Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }));

        return sortedHours;
    }

    getAccountRotationPattern(emailLog) {
        const accountUsage = {};
        const accountSequence = [];
        
        emailLog.forEach(entry => {
            const accountId = entry.accountId || entry.account;
            if (accountId) {
                accountUsage[accountId] = (accountUsage[accountId] || 0) + 1;
                accountSequence.push(accountId);
            }
        });

        // Calculate rotation efficiency
        const uniqueAccounts = Object.keys(accountUsage).length;
        const totalEmails = emailLog.length;
        const averagePerAccount = totalEmails / Math.max(uniqueAccounts, 1);
        
        // Check for even distribution
        const usageCounts = Object.values(accountUsage);
        const maxUsage = Math.max(...usageCounts);
        const minUsage = Math.min(...usageCounts);
        const rotationEfficiency = minUsage / Math.max(maxUsage, 1);

        return {
            accountsUsed: uniqueAccounts,
            totalEmails,
            averagePerAccount: Math.round(averagePerAccount),
            rotationEfficiency: Math.round(rotationEfficiency * 100),
            mostUsedAccount: Object.entries(accountUsage)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || null
        };
    }

    identifyUsagePatterns(emailLog) {
        // Identify common usage patterns
        const patterns = {
            peakDays: this.getPeakDays(emailLog),
            peakHours: this.getPeakHours(emailLog),
            accountRotation: this.getAccountRotationPattern(emailLog)
        };
        return patterns;
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    calculateBufferUtilization() {
        const accounts = this.accounts;
        if (accounts.length === 0) return 0;

        const utilizationRates = accounts.map(account => {
            const config = this.accountTypes[account.accountType] || this.accountTypes.personal;
            const availableWithBuffer = config.daily - config.buffer;
            return availableWithBuffer > 0 ? (account.dailyUsage / availableWithBuffer) * 100 : 0;
        });

        return utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length;
    }
}

// Initialize the multi-Gmail manager
const multiGmailManager = new MultiGmailManager();
window.multiGmailManager = multiGmailManager;