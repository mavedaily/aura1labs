// Bulk Email Sender with Progress Tracking
class BulkEmailSender {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.currentBatch = null;
        this.settings = {
            batchSize: 10,
            delayBetweenEmails: 1000, // 1 second
            delayBetweenBatches: 5000, // 5 seconds
            maxRetries: 3,
            retryDelay: 2000, // 2 seconds
            rateLimitPerHour: 100,
            rateLimitPerDay: 1000
        };
        this.stats = {
            totalQueued: 0,
            totalSent: 0,
            totalFailed: 0,
            totalSkipped: 0,
            currentProgress: 0,
            startTime: null,
            endTime: null,
            estimatedTimeRemaining: 0
        };
        this.rateLimiter = {
            hourlyCount: 0,
            dailyCount: 0,
            lastHourReset: new Date().getHours(),
            lastDayReset: new Date().getDate()
        };
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadQueue();
        this.setupEventListeners();
        this.updateUI();
        
        // Auto-save every 10 seconds
        setInterval(() => {
            this.saveQueue();
            this.saveSettings();
        }, 10000);
        
        // Reset rate limiter hourly/daily
        setInterval(() => {
            this.checkRateLimitReset();
        }, 60000); // Check every minute
    }

    // Queue Management
    addToQueue(emails) {
        const timestamp = new Date().toISOString();
        const batchId = this.generateId();
        
        const emailBatch = {
            id: batchId,
            emails: emails.map(email => ({
                id: this.generateId(),
                ...email,
                status: 'queued',
                attempts: 0,
                queuedAt: timestamp,
                sentAt: null,
                failedAt: null,
                error: null,
                trackingId: null
            })),
            createdAt: timestamp,
            status: 'queued',
            priority: email.priority || 'normal',
            template: email.template || null,
            campaign: email.campaign || null
        };

        this.queue.push(emailBatch);
        this.stats.totalQueued += emails.length;
        this.updateUI();
        this.saveQueue();
        
        this.showNotification(`Added ${emails.length} emails to queue`, 'success');
        return batchId;
    }

    removeFromQueue(batchId) {
        const batchIndex = this.queue.findIndex(batch => batch.id === batchId);
        if (batchIndex !== -1) {
            const batch = this.queue[batchIndex];
            const queuedEmails = batch.emails.filter(email => email.status === 'queued').length;
            
            this.queue.splice(batchIndex, 1);
            this.stats.totalQueued -= queuedEmails;
            this.updateUI();
            this.saveQueue();
            
            this.showNotification(`Removed batch from queue`, 'info');
            return true;
        }
        return false;
    }

    clearQueue() {
        if (this.isProcessing) {
            this.showNotification('Cannot clear queue while processing', 'error');
            return false;
        }
        
        this.queue = [];
        this.stats = {
            totalQueued: 0,
            totalSent: 0,
            totalFailed: 0,
            totalSkipped: 0,
            currentProgress: 0,
            startTime: null,
            endTime: null,
            estimatedTimeRemaining: 0
        };
        
        this.updateUI();
        this.saveQueue();
        this.showNotification('Queue cleared', 'info');
        return true;
    }

    // Processing Control
    async startProcessing() {
        if (this.isProcessing) {
            this.showNotification('Already processing emails', 'warning');
            return;
        }

        if (this.queue.length === 0) {
            this.showNotification('No emails in queue', 'warning');
            return;
        }

        this.isProcessing = true;
        this.stats.startTime = new Date().toISOString();
        this.stats.endTime = null;
        this.updateUI();
        
        this.showNotification('Started bulk email processing', 'success');
        
        try {
            await this.processQueue();
        } catch (error) {
            console.error('Error processing queue:', error);
            this.showNotification('Error occurred during processing', 'error');
        } finally {
            this.isProcessing = false;
            this.stats.endTime = new Date().toISOString();
            this.updateUI();
            this.showNotification('Bulk email processing completed', 'info');
        }
    }

    stopProcessing() {
        if (!this.isProcessing) {
            this.showNotification('Not currently processing', 'warning');
            return;
        }

        this.isProcessing = false;
        this.stats.endTime = new Date().toISOString();
        this.updateUI();
        this.showNotification('Stopped bulk email processing', 'info');
    }

    pauseProcessing() {
        if (!this.isProcessing) {
            this.showNotification('Not currently processing', 'warning');
            return;
        }

        this.isProcessing = false;
        this.updateUI();
        this.showNotification('Paused bulk email processing', 'info');
    }

    // Queue Processing
    async processQueue() {
        while (this.isProcessing && this.queue.length > 0) {
            // Check rate limits
            if (!this.checkRateLimit()) {
                this.showNotification('Rate limit reached. Pausing processing.', 'warning');
                await this.delay(60000); // Wait 1 minute
                continue;
            }

            // Get next batch
            const batch = this.getNextBatch();
            if (!batch) {
                break;
            }

            this.currentBatch = batch;
            batch.status = 'processing';
            
            await this.processBatch(batch);
            
            this.currentBatch = null;
            
            // Delay between batches
            if (this.isProcessing && this.queue.some(b => b.status === 'queued')) {
                await this.delay(this.settings.delayBetweenBatches);
            }
        }
    }

    async processBatch(batch) {
        const queuedEmails = batch.emails.filter(email => email.status === 'queued');
        
        for (let i = 0; i < queuedEmails.length && this.isProcessing; i += this.settings.batchSize) {
            const emailChunk = queuedEmails.slice(i, i + this.settings.batchSize);
            
            // Process emails in parallel within the chunk
            const promises = emailChunk.map(email => this.processEmail(email));
            await Promise.allSettled(promises);
            
            // Update progress
            this.updateProgress();
            
            // Delay between chunks
            if (i + this.settings.batchSize < queuedEmails.length && this.isProcessing) {
                await this.delay(this.settings.delayBetweenEmails);
            }
        }
        
        // Mark batch as completed if all emails are processed
        const remainingEmails = batch.emails.filter(email => email.status === 'queued').length;
        if (remainingEmails === 0) {
            batch.status = 'completed';
            // Remove completed batch from queue
            const batchIndex = this.queue.findIndex(b => b.id === batch.id);
            if (batchIndex !== -1) {
                this.queue.splice(batchIndex, 1);
            }
        }
    }

    async processEmail(email) {
        if (!this.isProcessing) return;

        try {
            email.status = 'sending';
            this.updateUI();

            // Check rate limit before sending
            if (!this.checkRateLimit()) {
                email.status = 'queued';
                return;
            }

            // Prepare email data
            const emailData = {
                to: email.recipient,
                subject: email.subject,
                body: email.body,
                cc: email.cc || [],
                bcc: email.bcc || [],
                replyTo: email.replyTo || null,
                template: email.template || null,
                campaign: email.campaign || null
            };

            // Send email using Gmail API
            const result = await this.sendEmail(emailData);
            
            if (result.success) {
                email.status = 'sent';
                email.sentAt = new Date().toISOString();
                email.trackingId = result.trackingId;
                this.stats.totalSent++;
                this.stats.totalQueued--;
                this.incrementRateLimit();
                
                // Track in analytics
                if (window.EmailAnalytics) {
                    window.EmailAnalytics.trackEmailSent({
                        ...emailData,
                        campaignId: email.campaign,
                        templateId: email.template
                    });
                }
            } else {
                throw new Error(result.error || 'Failed to send email');
            }
            
        } catch (error) {
            console.error('Error sending email:', error);
            email.attempts++;
            email.error = error.message;
            
            if (email.attempts >= this.settings.maxRetries) {
                email.status = 'failed';
                email.failedAt = new Date().toISOString();
                this.stats.totalFailed++;
                this.stats.totalQueued--;
            } else {
                email.status = 'queued'; // Retry later
                await this.delay(this.settings.retryDelay);
            }
        }
        
        this.updateUI();
    }

    async sendEmail(emailData) {
        // Integration with Gmail API
        if (window.GmailAPI && window.GmailAPI.isAuthenticated()) {
            try {
                const result = await window.GmailAPI.sendEmail(emailData);
                return {
                    success: true,
                    trackingId: this.generateId(),
                    messageId: result.id
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        } else {
            // Fallback simulation for testing
            await this.delay(500); // Simulate API call
            
            // Simulate success/failure (90% success rate)
            const success = Math.random() > 0.1;
            
            if (success) {
                return {
                    success: true,
                    trackingId: this.generateId(),
                    messageId: 'sim_' + this.generateId()
                };
            } else {
                return {
                    success: false,
                    error: 'Simulated sending failure'
                };
            }
        }
    }

    // Rate Limiting
    checkRateLimit() {
        this.checkRateLimitReset();
        
        return this.rateLimiter.hourlyCount < this.settings.rateLimitPerHour &&
               this.rateLimiter.dailyCount < this.settings.rateLimitPerDay;
    }

    incrementRateLimit() {
        this.rateLimiter.hourlyCount++;
        this.rateLimiter.dailyCount++;
    }

    checkRateLimitReset() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDate();
        
        if (currentHour !== this.rateLimiter.lastHourReset) {
            this.rateLimiter.hourlyCount = 0;
            this.rateLimiter.lastHourReset = currentHour;
        }
        
        if (currentDay !== this.rateLimiter.lastDayReset) {
            this.rateLimiter.dailyCount = 0;
            this.rateLimiter.lastDayReset = currentDay;
        }
    }

    // Progress Tracking
    updateProgress() {
        const totalEmails = this.getAllEmails().length;
        const processedEmails = this.getAllEmails().filter(email => 
            email.status === 'sent' || email.status === 'failed'
        ).length;
        
        this.stats.currentProgress = totalEmails > 0 ? (processedEmails / totalEmails) * 100 : 0;
        
        // Estimate time remaining
        if (this.stats.startTime && processedEmails > 0) {
            const elapsed = new Date() - new Date(this.stats.startTime);
            const avgTimePerEmail = elapsed / processedEmails;
            const remainingEmails = totalEmails - processedEmails;
            this.stats.estimatedTimeRemaining = avgTimePerEmail * remainingEmails;
        }
    }

    // Utility Functions
    getNextBatch() {
        return this.queue.find(batch => batch.status === 'queued');
    }

    getAllEmails() {
        return this.queue.flatMap(batch => batch.emails);
    }

    getQueueStats() {
        const allEmails = this.getAllEmails();
        return {
            total: allEmails.length,
            queued: allEmails.filter(e => e.status === 'queued').length,
            sending: allEmails.filter(e => e.status === 'sending').length,
            sent: allEmails.filter(e => e.status === 'sent').length,
            failed: allEmails.filter(e => e.status === 'failed').length
        };
    }

    // UI Updates
    updateUI() {
        this.updateQueueDisplay();
        this.updateProgressDisplay();
        this.updateStatsDisplay();
        this.updateControlsDisplay();
        this.updateRateLimitDisplay();
    }

    updateQueueDisplay() {
        const container = document.getElementById('bulkEmailQueue');
        if (!container) return;

        if (this.queue.length === 0) {
            container.innerHTML = '<p class="no-data">No emails in queue</p>';
            return;
        }

        const queueHtml = this.queue.map(batch => this.generateBatchCard(batch)).join('');
        container.innerHTML = queueHtml;
    }

    updateProgressDisplay() {
        const progressBar = document.getElementById('bulkProgressBar');
        const progressText = document.getElementById('bulkProgressText');
        const timeRemaining = document.getElementById('bulkTimeRemaining');
        
        if (progressBar) {
            progressBar.style.width = `${this.stats.currentProgress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${this.stats.currentProgress.toFixed(1)}%`;
        }
        
        if (timeRemaining && this.stats.estimatedTimeRemaining > 0) {
            const minutes = Math.ceil(this.stats.estimatedTimeRemaining / 60000);
            timeRemaining.textContent = `~${minutes} minutes remaining`;
        }
    }

    updateStatsDisplay() {
        const stats = this.getQueueStats();
        const elements = {
            'bulkTotalQueued': stats.queued,
            'bulkTotalSent': stats.sent,
            'bulkTotalFailed': stats.failed,
            'bulkCurrentlySending': stats.sending
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateControlsDisplay() {
        const startBtn = document.getElementById('startBulkSending');
        const stopBtn = document.getElementById('stopBulkSending');
        const pauseBtn = document.getElementById('pauseBulkSending');
        const clearBtn = document.getElementById('clearBulkQueue');
        
        if (startBtn) {
            startBtn.disabled = this.isProcessing || this.queue.length === 0;
        }
        
        if (stopBtn) {
            stopBtn.disabled = !this.isProcessing;
        }
        
        if (pauseBtn) {
            pauseBtn.disabled = !this.isProcessing;
        }
        
        if (clearBtn) {
            clearBtn.disabled = this.isProcessing;
        }
    }

    updateRateLimitDisplay() {
        const hourlyLimit = document.getElementById('bulkHourlyLimit');
        const dailyLimit = document.getElementById('bulkDailyLimit');
        
        if (hourlyLimit) {
            hourlyLimit.textContent = `${this.rateLimiter.hourlyCount}/${this.settings.rateLimitPerHour}`;
        }
        
        if (dailyLimit) {
            dailyLimit.textContent = `${this.rateLimiter.dailyCount}/${this.settings.rateLimitPerDay}`;
        }
    }

    // HTML Generators
    generateBatchCard(batch) {
        const stats = {
            total: batch.emails.length,
            queued: batch.emails.filter(e => e.status === 'queued').length,
            sent: batch.emails.filter(e => e.status === 'sent').length,
            failed: batch.emails.filter(e => e.status === 'failed').length
        };

        return `
            <div class="batch-card ${batch.status}">
                <div class="batch-header">
                    <h4>Batch ${batch.id.substr(0, 8)}</h4>
                    <span class="batch-status ${batch.status}">${batch.status}</span>
                    <button class="remove-batch-btn" onclick="removeBatch('${batch.id}')" 
                            ${this.isProcessing ? 'disabled' : ''}>×</button>
                </div>
                <div class="batch-stats">
                    <div class="batch-stat">
                        <span class="stat-label">Total:</span>
                        <span class="stat-value">${stats.total}</span>
                    </div>
                    <div class="batch-stat">
                        <span class="stat-label">Queued:</span>
                        <span class="stat-value">${stats.queued}</span>
                    </div>
                    <div class="batch-stat">
                        <span class="stat-label">Sent:</span>
                        <span class="stat-value">${stats.sent}</span>
                    </div>
                    <div class="batch-stat">
                        <span class="stat-label">Failed:</span>
                        <span class="stat-value">${stats.failed}</span>
                    </div>
                </div>
                <div class="batch-details">
                    <small>Created: ${new Date(batch.createdAt).toLocaleString()}</small>
                    ${batch.campaign ? `<small>Campaign: ${batch.campaign}</small>` : ''}
                </div>
            </div>
        `;
    }

    // Event Listeners
    setupEventListeners() {
        // Control buttons
        const startBtn = document.getElementById('startBulkSending');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startProcessing());
        }

        const stopBtn = document.getElementById('stopBulkSending');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopProcessing());
        }

        const pauseBtn = document.getElementById('pauseBulkSending');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseProcessing());
        }

        const clearBtn = document.getElementById('clearBulkQueue');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearQueue());
        }

        // Settings
        const settingsForm = document.getElementById('bulkEmailSettings');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateSettings();
            });
        }

        // Import contacts for bulk sending
        const importBtn = document.getElementById('importForBulkSending');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importContactsForBulkSending());
        }
    }

    // Settings Management
    updateSettings() {
        const form = document.getElementById('bulkEmailSettings');
        if (!form) return;

        const formData = new FormData(form);
        
        this.settings = {
            batchSize: parseInt(formData.get('batchSize')) || 10,
            delayBetweenEmails: parseInt(formData.get('delayBetweenEmails')) || 1000,
            delayBetweenBatches: parseInt(formData.get('delayBetweenBatches')) || 5000,
            maxRetries: parseInt(formData.get('maxRetries')) || 3,
            retryDelay: parseInt(formData.get('retryDelay')) || 2000,
            rateLimitPerHour: parseInt(formData.get('rateLimitPerHour')) || 100,
            rateLimitPerDay: parseInt(formData.get('rateLimitPerDay')) || 1000
        };

        this.saveSettings();
        this.showNotification('Settings updated successfully', 'success');
    }

    // Data Persistence
    saveQueue() {
        try {
            localStorage.setItem('aurareach_bulk_queue', JSON.stringify(this.queue));
            localStorage.setItem('aurareach_bulk_stats', JSON.stringify(this.stats));
        } catch (error) {
            console.error('Failed to save queue:', error);
        }
    }

    loadQueue() {
        try {
            const savedQueue = localStorage.getItem('aurareach_bulk_queue');
            const savedStats = localStorage.getItem('aurareach_bulk_stats');
            
            if (savedQueue) {
                this.queue = JSON.parse(savedQueue);
            }
            
            if (savedStats) {
                this.stats = { ...this.stats, ...JSON.parse(savedStats) };
            }
        } catch (error) {
            console.error('Failed to load queue:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('aurareach_bulk_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('aurareach_bulk_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    // Utility Functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(type, message);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Public API
    exportQueue() {
        const data = {
            queue: this.queue,
            stats: this.stats,
            settings: this.settings,
            exportedAt: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `bulk-email-queue-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showNotification('Queue exported successfully!', 'success');
    }

    importQueue(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.queue) {
                    this.queue = [...this.queue, ...data.queue];
                    this.updateUI();
                    this.saveQueue();
                    this.showNotification('Queue imported successfully!', 'success');
                }
            } catch (error) {
                this.showNotification('Failed to import queue', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Global Bulk Email Sender Instance
window.BulkEmailSender = new BulkEmailSender();

// Global Functions for UI Integration
function removeBatch(batchId) {
    window.BulkEmailSender.removeFromQueue(batchId);
}

function addContactsToBulkQueue() {
    // Get selected contacts and template
    const selectedContacts = getSelectedContacts();
    const selectedTemplate = getSelectedTemplate();
    
    if (selectedContacts.length === 0) {
        window.BulkEmailSender.showNotification('Please select contacts first', 'warning');
        return;
    }
    
    if (!selectedTemplate) {
        window.BulkEmailSender.showNotification('Please select a template first', 'warning');
        return;
    }
    
    // Prepare emails
    const emails = selectedContacts.map(contact => ({
        recipient: contact.email,
        subject: selectedTemplate.subject,
        body: selectedTemplate.body,
        template: selectedTemplate.id,
        campaign: selectedTemplate.campaign || null
    }));
    
    window.BulkEmailSender.addToQueue(emails);
}

function getSelectedContacts() {
    // Integration with contact manager
    if (window.ContactManager) {
        return window.ContactManager.getSelectedContacts();
    }
    return [];
}

function getSelectedTemplate() {
    // Integration with template manager
    if (window.TemplateManager) {
        return window.TemplateManager.getSelectedTemplate();
    }
    return null;
}