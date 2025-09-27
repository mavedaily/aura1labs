// Email Scheduling System
class EmailScheduler {
    constructor() {
        this.scheduledEmails = [];
        this.recurringPatterns = [];
        this.timezones = [
            { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
            { value: 'America/New_York', label: 'Eastern Time (ET)' },
            { value: 'America/Chicago', label: 'Central Time (CT)' },
            { value: 'America/Denver', label: 'Mountain Time (MT)' },
            { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
            { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
            { value: 'Europe/Paris', label: 'Central European Time (CET)' },
            { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
            { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
            { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
            { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
        ];
        this.init();
    }

    init() {
        this.loadScheduledEmails();
        this.setupEventListeners();
        this.updateScheduleDisplay();
        this.startScheduleChecker();
        this.populateTimezoneSelectors();
    }

    setupEventListeners() {
        // Schedule form submission
        const scheduleForm = document.getElementById('scheduleForm');
        if (scheduleForm) {
            scheduleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.scheduleEmail();
            });
        }

        // Recurring pattern changes
        const recurringSelect = document.getElementById('recurringPattern');
        if (recurringSelect) {
            recurringSelect.addEventListener('change', (e) => {
                this.toggleRecurringOptions(e.target.value);
            });
        }

        // Quick schedule buttons
        const quickScheduleButtons = document.querySelectorAll('.quick-schedule-btn');
        quickScheduleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.minutes);
                this.quickSchedule(minutes);
            });
        });

        // Date/time inputs
        const scheduleDate = document.getElementById('scheduleDate');
        const scheduleTime = document.getElementById('scheduleTime');
        
        if (scheduleDate && scheduleTime) {
            scheduleDate.addEventListener('change', () => this.validateScheduleDateTime());
            scheduleTime.addEventListener('change', () => this.validateScheduleDateTime());
        }
    }

    // Email Scheduling
    scheduleEmail() {
        const formData = this.getScheduleFormData();
        
        if (!this.validateScheduleData(formData)) {
            return false;
        }

        const scheduledEmail = {
            id: Date.now() + Math.random(),
            subject: formData.subject,
            content: formData.content,
            recipients: formData.recipients,
            scheduledTime: formData.scheduledTime,
            timezone: formData.timezone,
            recurring: formData.recurring,
            recurringPattern: formData.recurringPattern,
            recurringEnd: formData.recurringEnd,
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            attempts: 0,
            lastAttempt: null,
            nextRun: formData.scheduledTime
        };

        // Handle recurring emails
        if (formData.recurring) {
            this.createRecurringSchedule(scheduledEmail);
        } else {
            this.scheduledEmails.push(scheduledEmail);
        }

        this.saveScheduledEmails();
        this.updateScheduleDisplay();
        this.clearScheduleForm();
        
        showNotification('success', 'Email scheduled successfully');
        return true;
    }

    createRecurringSchedule(emailData) {
        const pattern = emailData.recurringPattern;
        const endDate = emailData.recurringEnd ? new Date(emailData.recurringEnd) : null;
        const startDate = new Date(emailData.scheduledTime);
        
        let currentDate = new Date(startDate);
        let instanceCount = 0;
        const maxInstances = 100; // Prevent infinite schedules

        while (instanceCount < maxInstances) {
            if (endDate && currentDate > endDate) {
                break;
            }

            const instance = {
                ...emailData,
                id: Date.now() + Math.random() + instanceCount,
                scheduledTime: currentDate.toISOString(),
                nextRun: currentDate.toISOString(),
                recurringInstance: true,
                parentId: emailData.id
            };

            this.scheduledEmails.push(instance);

            // Calculate next occurrence
            currentDate = this.getNextOccurrence(currentDate, pattern);
            instanceCount++;

            // For daily/weekly patterns, limit to reasonable timeframe
            if (pattern === 'daily' && instanceCount >= 365) break;
            if (pattern === 'weekly' && instanceCount >= 52) break;
            if (pattern === 'monthly' && instanceCount >= 12) break;
        }
    }

    getNextOccurrence(date, pattern) {
        const nextDate = new Date(date);
        
        switch (pattern) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            case 'weekdays':
                do {
                    nextDate.setDate(nextDate.getDate() + 1);
                } while (nextDate.getDay() === 0 || nextDate.getDay() === 6); // Skip weekends
                break;
            case 'custom':
                // Handle custom patterns (could be extended)
                nextDate.setDate(nextDate.getDate() + 1);
                break;
        }
        
        return nextDate;
    }

    quickSchedule(minutes) {
        const now = new Date();
        const scheduledTime = new Date(now.getTime() + (minutes * 60000));
        
        const scheduleDate = document.getElementById('scheduleDate');
        const scheduleTime = document.getElementById('scheduleTime');
        
        if (scheduleDate && scheduleTime) {
            scheduleDate.value = scheduledTime.toISOString().split('T')[0];
            scheduleTime.value = scheduledTime.toTimeString().slice(0, 5);
        }
        
        this.validateScheduleDateTime();
    }

    // Schedule Management
    cancelScheduledEmail(emailId) {
        const index = this.scheduledEmails.findIndex(email => email.id === emailId);
        if (index === -1) {
            showNotification('error', 'Scheduled email not found');
            return false;
        }

        const email = this.scheduledEmails[index];
        
        if (email.status === 'sent') {
            showNotification('error', 'Cannot cancel email that has already been sent');
            return false;
        }

        // If it's a recurring email, ask if user wants to cancel all instances
        if (email.recurringInstance || email.recurring) {
            const cancelAll = confirm('This is a recurring email. Cancel all future instances?');
            if (cancelAll) {
                this.cancelRecurringEmail(email.parentId || email.id);
            } else {
                this.scheduledEmails.splice(index, 1);
            }
        } else {
            this.scheduledEmails.splice(index, 1);
        }

        this.saveScheduledEmails();
        this.updateScheduleDisplay();
        
        showNotification('success', 'Scheduled email cancelled');
        return true;
    }

    cancelRecurringEmail(parentId) {
        this.scheduledEmails = this.scheduledEmails.filter(email => 
            email.id !== parentId && email.parentId !== parentId
        );
    }

    rescheduleEmail(emailId) {
        const email = this.scheduledEmails.find(e => e.id === emailId);
        if (!email) {
            showNotification('error', 'Scheduled email not found');
            return;
        }

        if (email.status === 'sent') {
            showNotification('error', 'Cannot reschedule email that has already been sent');
            return;
        }

        // Populate form with existing data
        this.populateScheduleForm(email);
        
        // Remove the old schedule
        this.cancelScheduledEmail(emailId);
        
        // Show schedule modal/form
        this.showScheduleModal();
    }

    // Schedule Checker (runs periodically)
    startScheduleChecker() {
        // Check every minute for emails to send
        setInterval(() => {
            this.checkScheduledEmails();
        }, 60000); // 1 minute

        // Initial check
        this.checkScheduledEmails();
    }

    checkScheduledEmails() {
        const now = new Date();
        const emailsToSend = this.scheduledEmails.filter(email => 
            email.status === 'scheduled' && 
            new Date(email.nextRun) <= now
        );

        emailsToSend.forEach(email => {
            this.sendScheduledEmail(email);
        });
    }

    async sendScheduledEmail(email) {
        try {
            email.status = 'sending';
            email.attempts++;
            email.lastAttempt = new Date().toISOString();
            
            this.updateScheduleDisplay();

            // Here you would integrate with your email sending service
            // For now, we'll simulate the sending process
            const success = await this.simulateEmailSending(email);

            if (success) {
                email.status = 'sent';
                email.sentAt = new Date().toISOString();
                
                // Update email statistics
                if (typeof updateEmailStats === 'function') {
                    updateEmailStats('sent');
                }
                
                showNotification('success', `Scheduled email "${email.subject}" sent successfully`);
            } else {
                email.status = 'failed';
                showNotification('error', `Failed to send scheduled email "${email.subject}"`);
            }

        } catch (error) {
            email.status = 'failed';
            email.error = error.message;
            showNotification('error', `Error sending scheduled email: ${error.message}`);
        }

        this.saveScheduledEmails();
        this.updateScheduleDisplay();
    }

    async simulateEmailSending(email) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate 95% success rate
        return Math.random() > 0.05;
    }

    // Form Handling
    getScheduleFormData() {
        return {
            subject: document.getElementById('emailSubject')?.value || '',
            content: document.getElementById('emailContent')?.value || '',
            recipients: this.getSelectedRecipients(),
            scheduledTime: this.getScheduledDateTime(),
            timezone: document.getElementById('scheduleTimezone')?.value || 'UTC',
            recurring: document.getElementById('recurringEnabled')?.checked || false,
            recurringPattern: document.getElementById('recurringPattern')?.value || 'daily',
            recurringEnd: document.getElementById('recurringEnd')?.value || null
        };
    }

    getSelectedRecipients() {
        // Get recipients from contact manager or form
        if (typeof contactManager !== 'undefined' && contactManager.selectedContacts.length > 0) {
            return contactManager.selectedContacts.map(id => {
                const contact = contactManager.contacts.find(c => c.id === id);
                return contact ? contact.email : null;
            }).filter(email => email);
        }
        
        // Fallback to manual recipient input
        const recipientInput = document.getElementById('scheduleRecipients');
        if (recipientInput) {
            return recipientInput.value.split(',').map(email => email.trim()).filter(email => email);
        }
        
        return [];
    }

    getScheduledDateTime() {
        const date = document.getElementById('scheduleDate')?.value;
        const time = document.getElementById('scheduleTime')?.value;
        
        if (!date || !time) {
            throw new Error('Date and time are required');
        }
        
        return new Date(`${date}T${time}`).toISOString();
    }

    validateScheduleData(data) {
        if (!data.subject.trim()) {
            showNotification('error', 'Email subject is required');
            return false;
        }

        if (!data.content.trim()) {
            showNotification('error', 'Email content is required');
            return false;
        }

        if (data.recipients.length === 0) {
            showNotification('error', 'At least one recipient is required');
            return false;
        }

        const scheduledTime = new Date(data.scheduledTime);
        const now = new Date();
        
        if (scheduledTime <= now) {
            showNotification('error', 'Scheduled time must be in the future');
            return false;
        }

        if (data.recurring && data.recurringEnd) {
            const endDate = new Date(data.recurringEnd);
            if (endDate <= scheduledTime) {
                showNotification('error', 'Recurring end date must be after the scheduled start time');
                return false;
            }
        }

        return true;
    }

    validateScheduleDateTime() {
        const date = document.getElementById('scheduleDate')?.value;
        const time = document.getElementById('scheduleTime')?.value;
        const warningElement = document.getElementById('scheduleWarning');
        
        if (!date || !time || !warningElement) return;

        const scheduledDateTime = new Date(`${date}T${time}`);
        const now = new Date();
        
        if (scheduledDateTime <= now) {
            warningElement.textContent = 'Warning: Scheduled time is in the past';
            warningElement.style.display = 'block';
            warningElement.className = 'schedule-warning error';
        } else {
            const timeDiff = scheduledDateTime - now;
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            warningElement.textContent = `Email will be sent in ${hours}h ${minutes}m`;
            warningElement.style.display = 'block';
            warningElement.className = 'schedule-warning info';
        }
    }

    toggleRecurringOptions(pattern) {
        const recurringOptions = document.getElementById('recurringOptions');
        const customOptions = document.getElementById('customRecurringOptions');
        
        if (recurringOptions) {
            recurringOptions.style.display = pattern !== 'none' ? 'block' : 'none';
        }
        
        if (customOptions) {
            customOptions.style.display = pattern === 'custom' ? 'block' : 'none';
        }
    }

    populateTimezoneSelectors() {
        const selectors = document.querySelectorAll('.timezone-select');
        selectors.forEach(select => {
            select.innerHTML = this.timezones.map(tz => 
                `<option value="${tz.value}">${tz.label}</option>`
            ).join('');
            
            // Set default to user's timezone
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (this.timezones.find(tz => tz.value === userTimezone)) {
                select.value = userTimezone;
            }
        });
    }

    // Display Updates
    updateScheduleDisplay() {
        this.updateScheduledEmailsList();
        this.updateScheduleStats();
    }

    updateScheduledEmailsList() {
        const container = document.getElementById('scheduledEmailsContainer');
        if (!container) return;

        const sortedEmails = [...this.scheduledEmails].sort((a, b) => 
            new Date(a.nextRun) - new Date(b.nextRun)
        );

        if (sortedEmails.length === 0) {
            container.innerHTML = '<p class="no-scheduled-emails">No scheduled emails.</p>';
            return;
        }

        let html = '';
        sortedEmails.forEach(email => {
            const scheduledTime = new Date(email.nextRun);
            const isOverdue = scheduledTime < new Date() && email.status === 'scheduled';
            const statusClass = this.getStatusClass(email.status);
            
            html += `
                <div class="scheduled-email-item ${statusClass} ${isOverdue ? 'overdue' : ''}">
                    <div class="email-info">
                        <div class="email-subject">${email.subject}</div>
                        <div class="email-recipients">${email.recipients.length} recipient(s)</div>
                        <div class="email-schedule">
                            <svg class="icon icon-sm"><use href="#icon-clock"></use></svg>
                            ${this.formatScheduleTime(scheduledTime, email.timezone)}
                            ${email.recurring ? `<span class="recurring-badge">Recurring</span>` : ''}
                        </div>
                        <div class="email-status">Status: ${this.getStatusLabel(email.status)}</div>
                    </div>
                    <div class="email-actions">
                        ${email.status === 'scheduled' ? `
                            <button class="btn btn-secondary btn-sm" onclick="emailScheduler.rescheduleEmail('${email.id}')">
                                <svg class="icon icon-sm"><use href="#icon-edit"></use></svg>
                                Reschedule
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="emailScheduler.cancelScheduledEmail('${email.id}')">
                                <svg class="icon icon-sm"><use href="#icon-trash"></use></svg>
                                Cancel
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm" onclick="emailScheduler.viewScheduledEmail('${email.id}')">
                            <svg class="icon icon-sm"><use href="#icon-eye"></use></svg>
                            View
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateScheduleStats() {
        const stats = this.calculateScheduleStats();
        
        const elements = {
            totalScheduled: document.getElementById('totalScheduledCount'),
            pendingScheduled: document.getElementById('pendingScheduledCount'),
            sentScheduled: document.getElementById('sentScheduledCount'),
            failedScheduled: document.getElementById('failedScheduledCount')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                elements[key].textContent = stats[key] || 0;
            }
        });
    }

    calculateScheduleStats() {
        return {
            totalScheduled: this.scheduledEmails.length,
            pendingScheduled: this.scheduledEmails.filter(e => e.status === 'scheduled').length,
            sentScheduled: this.scheduledEmails.filter(e => e.status === 'sent').length,
            failedScheduled: this.scheduledEmails.filter(e => e.status === 'failed').length
        };
    }

    // Utility Functions
    getStatusClass(status) {
        const classes = {
            'scheduled': 'status-scheduled',
            'sending': 'status-sending',
            'sent': 'status-sent',
            'failed': 'status-failed'
        };
        return classes[status] || '';
    }

    getStatusLabel(status) {
        const labels = {
            'scheduled': 'Scheduled',
            'sending': 'Sending...',
            'sent': 'Sent',
            'failed': 'Failed'
        };
        return labels[status] || status;
    }

    formatScheduleTime(date, timezone) {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone
        };
        
        return date.toLocaleDateString('en-US', options);
    }

    clearScheduleForm() {
        const form = document.getElementById('scheduleForm');
        if (form) {
            form.reset();
        }
        
        const warningElement = document.getElementById('scheduleWarning');
        if (warningElement) {
            warningElement.style.display = 'none';
        }
    }

    populateScheduleForm(email) {
        const elements = {
            emailSubject: email.subject,
            emailContent: email.content,
            scheduleDate: email.scheduledTime.split('T')[0],
            scheduleTime: email.scheduledTime.split('T')[1].slice(0, 5),
            scheduleTimezone: email.timezone,
            recurringEnabled: email.recurring,
            recurringPattern: email.recurringPattern,
            recurringEnd: email.recurringEnd
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = elements[id];
                } else {
                    element.value = elements[id] || '';
                }
            }
        });
    }

    viewScheduledEmail(emailId) {
        const email = this.scheduledEmails.find(e => e.id === emailId);
        if (!email) return;

        // Create view modal
        const modal = document.createElement('div');
        modal.className = 'schedule-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Scheduled Email Details</h3>
                    <button type="button" class="modal-close" onclick="this.closest('.schedule-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="email-details">
                        <div class="detail-group">
                            <label>Subject:</label>
                            <div class="detail-value">${email.subject}</div>
                        </div>
                        <div class="detail-group">
                            <label>Recipients:</label>
                            <div class="detail-value">${email.recipients.join(', ')}</div>
                        </div>
                        <div class="detail-group">
                            <label>Scheduled Time:</label>
                            <div class="detail-value">${this.formatScheduleTime(new Date(email.nextRun), email.timezone)}</div>
                        </div>
                        <div class="detail-group">
                            <label>Status:</label>
                            <div class="detail-value ${this.getStatusClass(email.status)}">${this.getStatusLabel(email.status)}</div>
                        </div>
                        ${email.recurring ? `
                            <div class="detail-group">
                                <label>Recurring:</label>
                                <div class="detail-value">${email.recurringPattern}</div>
                            </div>
                        ` : ''}
                        <div class="detail-group">
                            <label>Content:</label>
                            <div class="detail-value email-content-preview">${email.content}</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.schedule-modal').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showScheduleModal() {
        const modal = document.getElementById('scheduleModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideScheduleModal() {
        const modal = document.getElementById('scheduleModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Data Persistence
    saveScheduledEmails() {
        localStorage.setItem('aurareach_scheduled_emails', JSON.stringify(this.scheduledEmails));
    }

    loadScheduledEmails() {
        const saved = localStorage.getItem('aurareach_scheduled_emails');
        if (saved) {
            this.scheduledEmails = JSON.parse(saved);
        }
    }
}

// Initialize email scheduler
let emailScheduler;
document.addEventListener('DOMContentLoaded', function() {
    emailScheduler = new EmailScheduler();
});

// Global functions for backward compatibility
function scheduleEmail() {
    emailScheduler.scheduleEmail();
}

function cancelScheduledEmail(id) {
    emailScheduler.cancelScheduledEmail(id);
}

function rescheduleEmail(id) {
    emailScheduler.rescheduleEmail(id);
}