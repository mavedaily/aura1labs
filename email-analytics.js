// Email Analytics and Tracking System
class EmailAnalytics {
    constructor() {
        this.analytics = {
            campaigns: [],
            emails: [],
            stats: {
                totalSent: 0,
                totalDelivered: 0,
                totalOpened: 0,
                totalClicked: 0,
                totalBounced: 0,
                totalUnsubscribed: 0
            },
            dailyStats: {},
            monthlyStats: {},
            templateStats: {},
            recipientStats: {}
        };
        
        this.trackingPixelUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        this.init();
    }

    init() {
        this.loadAnalytics();
        this.setupEventListeners();
        this.updateDashboard();
        
        // Auto-save analytics every 30 seconds
        setInterval(() => {
            this.saveAnalytics();
        }, 30000);
    }

    // Campaign Management
    createCampaign(campaignData) {
        const campaign = {
            id: this.generateId(),
            name: campaignData.name,
            description: campaignData.description,
            template: campaignData.template,
            recipients: campaignData.recipients,
            status: 'draft',
            createdAt: new Date().toISOString(),
            scheduledAt: campaignData.scheduledAt || null,
            sentAt: null,
            stats: {
                sent: 0,
                delivered: 0,
                opened: 0,
                clicked: 0,
                bounced: 0,
                unsubscribed: 0
            },
            emails: []
        };

        this.analytics.campaigns.push(campaign);
        this.saveAnalytics();
        this.updateCampaignsList();
        return campaign;
    }

    // Email Tracking
    trackEmailSent(emailData) {
        const trackingId = this.generateId();
        const email = {
            id: trackingId,
            campaignId: emailData.campaignId || null,
            templateId: emailData.templateId || null,
            recipient: emailData.recipient,
            subject: emailData.subject,
            sentAt: new Date().toISOString(),
            status: 'sent',
            opens: [],
            clicks: [],
            bounced: false,
            unsubscribed: false,
            userAgent: null,
            ipAddress: null
        };

        this.analytics.emails.push(email);
        this.updateStats('sent');
        this.updateDailyStats('sent');
        this.updateTemplateStats(emailData.templateId, 'sent');
        this.updateRecipientStats(emailData.recipient, 'sent');
        
        if (emailData.campaignId) {
            this.updateCampaignStats(emailData.campaignId, 'sent');
        }

        this.saveAnalytics();
        return trackingId;
    }

    trackEmailDelivered(trackingId) {
        const email = this.analytics.emails.find(e => e.id === trackingId);
        if (email && email.status === 'sent') {
            email.status = 'delivered';
            email.deliveredAt = new Date().toISOString();
            
            this.updateStats('delivered');
            this.updateDailyStats('delivered');
            this.updateTemplateStats(email.templateId, 'delivered');
            this.updateRecipientStats(email.recipient, 'delivered');
            
            if (email.campaignId) {
                this.updateCampaignStats(email.campaignId, 'delivered');
            }
            
            this.saveAnalytics();
        }
    }

    trackEmailOpened(trackingId, userAgent = null, ipAddress = null) {
        const email = this.analytics.emails.find(e => e.id === trackingId);
        if (email) {
            const openEvent = {
                timestamp: new Date().toISOString(),
                userAgent: userAgent,
                ipAddress: ipAddress
            };
            
            email.opens.push(openEvent);
            if (email.opens.length === 1) {
                // First open
                this.updateStats('opened');
                this.updateDailyStats('opened');
                this.updateTemplateStats(email.templateId, 'opened');
                this.updateRecipientStats(email.recipient, 'opened');
                
                if (email.campaignId) {
                    this.updateCampaignStats(email.campaignId, 'opened');
                }
            }
            
            this.saveAnalytics();
        }
    }

    trackEmailClicked(trackingId, url, userAgent = null, ipAddress = null) {
        const email = this.analytics.emails.find(e => e.id === trackingId);
        if (email) {
            const clickEvent = {
                timestamp: new Date().toISOString(),
                url: url,
                userAgent: userAgent,
                ipAddress: ipAddress
            };
            
            email.clicks.push(clickEvent);
            if (email.clicks.length === 1) {
                // First click
                this.updateStats('clicked');
                this.updateDailyStats('clicked');
                this.updateTemplateStats(email.templateId, 'clicked');
                this.updateRecipientStats(email.recipient, 'clicked');
                
                if (email.campaignId) {
                    this.updateCampaignStats(email.campaignId, 'clicked');
                }
            }
            
            this.saveAnalytics();
        }
    }

    trackEmailBounced(trackingId, bounceReason = null) {
        const email = this.analytics.emails.find(e => e.id === trackingId);
        if (email) {
            email.bounced = true;
            email.bounceReason = bounceReason;
            email.bouncedAt = new Date().toISOString();
            
            this.updateStats('bounced');
            this.updateDailyStats('bounced');
            this.updateTemplateStats(email.templateId, 'bounced');
            this.updateRecipientStats(email.recipient, 'bounced');
            
            if (email.campaignId) {
                this.updateCampaignStats(email.campaignId, 'bounced');
            }
            
            this.saveAnalytics();
        }
    }

    trackEmailUnsubscribed(trackingId) {
        const email = this.analytics.emails.find(e => e.id === trackingId);
        if (email) {
            email.unsubscribed = true;
            email.unsubscribedAt = new Date().toISOString();
            
            this.updateStats('unsubscribed');
            this.updateDailyStats('unsubscribed');
            this.updateTemplateStats(email.templateId, 'unsubscribed');
            this.updateRecipientStats(email.recipient, 'unsubscribed');
            
            if (email.campaignId) {
                this.updateCampaignStats(email.campaignId, 'unsubscribed');
            }
            
            this.saveAnalytics();
        }
    }

    // Statistics Updates
    updateStats(type) {
        switch(type) {
            case 'sent':
                this.analytics.stats.totalSent++;
                break;
            case 'delivered':
                this.analytics.stats.totalDelivered++;
                break;
            case 'opened':
                this.analytics.stats.totalOpened++;
                break;
            case 'clicked':
                this.analytics.stats.totalClicked++;
                break;
            case 'bounced':
                this.analytics.stats.totalBounced++;
                break;
            case 'unsubscribed':
                this.analytics.stats.totalUnsubscribed++;
                break;
        }
    }

    updateDailyStats(type) {
        const today = new Date().toISOString().split('T')[0];
        if (!this.analytics.dailyStats[today]) {
            this.analytics.dailyStats[today] = {
                sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0
            };
        }
        this.analytics.dailyStats[today][type]++;
    }

    updateTemplateStats(templateId, type) {
        if (!templateId) return;
        
        if (!this.analytics.templateStats[templateId]) {
            this.analytics.templateStats[templateId] = {
                sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0
            };
        }
        this.analytics.templateStats[templateId][type]++;
    }

    updateRecipientStats(recipient, type) {
        if (!this.analytics.recipientStats[recipient]) {
            this.analytics.recipientStats[recipient] = {
                sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0
            };
        }
        this.analytics.recipientStats[recipient][type]++;
    }

    updateCampaignStats(campaignId, type) {
        const campaign = this.analytics.campaigns.find(c => c.id === campaignId);
        if (campaign) {
            campaign.stats[type]++;
        }
    }

    // Analytics Calculations
    getDeliveryRate() {
        if (this.analytics.stats.totalSent === 0) return 0;
        return ((this.analytics.stats.totalDelivered / this.analytics.stats.totalSent) * 100).toFixed(2);
    }

    getOpenRate() {
        if (this.analytics.stats.totalDelivered === 0) return 0;
        return ((this.analytics.stats.totalOpened / this.analytics.stats.totalDelivered) * 100).toFixed(2);
    }

    getClickRate() {
        if (this.analytics.stats.totalDelivered === 0) return 0;
        return ((this.analytics.stats.totalClicked / this.analytics.stats.totalDelivered) * 100).toFixed(2);
    }

    getBounceRate() {
        if (this.analytics.stats.totalSent === 0) return 0;
        return ((this.analytics.stats.totalBounced / this.analytics.stats.totalSent) * 100).toFixed(2);
    }

    getUnsubscribeRate() {
        if (this.analytics.stats.totalDelivered === 0) return 0;
        return ((this.analytics.stats.totalUnsubscribed / this.analytics.stats.totalDelivered) * 100).toFixed(2);
    }

    // Dashboard Updates
    updateDashboard() {
        this.updateOverviewStats();
        this.updateCharts();
        this.updateCampaignsList();
        this.updateRecentActivity();
        this.updateTopPerformers();
    }

    updateOverviewStats() {
        const elements = {
            'totalEmailsSent': this.analytics.stats.totalSent,
            'deliveryRate': this.getDeliveryRate() + '%',
            'openRate': this.getOpenRate() + '%',
            'clickRate': this.getClickRate() + '%',
            'bounceRate': this.getBounceRate() + '%',
            'unsubscribeRate': this.getUnsubscribeRate() + '%'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateCharts() {
        this.updateDailyChart();
        this.updatePerformanceChart();
    }

    updateDailyChart() {
        const chartContainer = document.getElementById('dailyChart');
        if (!chartContainer) return;

        const last7Days = this.getLast7DaysData();
        const chartHtml = this.generateDailyChart(last7Days);
        chartContainer.innerHTML = chartHtml;
    }

    updatePerformanceChart() {
        const chartContainer = document.getElementById('performanceChart');
        if (!chartContainer) return;

        const performanceData = {
            delivered: this.analytics.stats.totalDelivered,
            opened: this.analytics.stats.totalOpened,
            clicked: this.analytics.stats.totalClicked,
            bounced: this.analytics.stats.totalBounced
        };

        const chartHtml = this.generatePerformanceChart(performanceData);
        chartContainer.innerHTML = chartHtml;
    }

    updateCampaignsList() {
        const container = document.getElementById('campaignsAnalyticsList');
        if (!container) return;

        if (this.analytics.campaigns.length === 0) {
            container.innerHTML = '<p class="no-data">No campaigns created yet.</p>';
            return;
        }

        const campaignsHtml = this.analytics.campaigns
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
            .map(campaign => this.generateCampaignCard(campaign))
            .join('');

        container.innerHTML = campaignsHtml;
    }

    updateRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        const recentEmails = this.analytics.emails
            .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
            .slice(0, 10);

        if (recentEmails.length === 0) {
            container.innerHTML = '<p class="no-data">No recent email activity.</p>';
            return;
        }

        const activityHtml = recentEmails
            .map(email => this.generateActivityItem(email))
            .join('');

        container.innerHTML = activityHtml;
    }

    updateTopPerformers() {
        const container = document.getElementById('topPerformers');
        if (!container) return;

        const templatePerformance = Object.entries(this.analytics.templateStats)
            .map(([templateId, stats]) => ({
                templateId,
                ...stats,
                openRate: stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(1) : 0,
                clickRate: stats.delivered > 0 ? ((stats.clicked / stats.delivered) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => parseFloat(b.openRate) - parseFloat(a.openRate))
            .slice(0, 5);

        if (templatePerformance.length === 0) {
            container.innerHTML = '<p class="no-data">No template performance data available.</p>';
            return;
        }

        const performersHtml = templatePerformance
            .map(template => this.generatePerformerCard(template))
            .join('');

        container.innerHTML = performersHtml;
    }

    // HTML Generators
    generateCampaignCard(campaign) {
        const openRate = campaign.stats.delivered > 0 ? 
            ((campaign.stats.opened / campaign.stats.delivered) * 100).toFixed(1) : 0;
        const clickRate = campaign.stats.delivered > 0 ? 
            ((campaign.stats.clicked / campaign.stats.delivered) * 100).toFixed(1) : 0;

        return `
            <div class="campaign-card" onclick="viewCampaignDetails('${campaign.id}')">
                <div class="campaign-header">
                    <h4>${campaign.name}</h4>
                    <span class="campaign-status ${campaign.status}">${campaign.status}</span>
                </div>
                <div class="campaign-stats">
                    <div class="stat-item">
                        <span class="stat-label">Sent:</span>
                        <span class="stat-value">${campaign.stats.sent}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Open Rate:</span>
                        <span class="stat-value">${openRate}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Click Rate:</span>
                        <span class="stat-value">${clickRate}%</span>
                    </div>
                </div>
                <div class="campaign-date">
                    Created: ${new Date(campaign.createdAt).toLocaleDateString()}
                </div>
            </div>
        `;
    }

    generateActivityItem(email) {
        const timeAgo = this.getTimeAgo(email.sentAt);
        const status = email.opens.length > 0 ? 'opened' : 
                      email.bounced ? 'bounced' : 
                      email.status;

        return `
            <div class="activity-item">
                <div class="activity-icon ${status}">
                    ${this.getStatusIcon(status)}
                </div>
                <div class="activity-content">
                    <div class="activity-title">${email.subject}</div>
                    <div class="activity-details">
                        To: ${email.recipient} • ${timeAgo}
                    </div>
                </div>
                <div class="activity-stats">
                    <span class="opens">${email.opens.length} opens</span>
                    <span class="clicks">${email.clicks.length} clicks</span>
                </div>
            </div>
        `;
    }

    generatePerformerCard(template) {
        return `
            <div class="performer-card">
                <div class="performer-name">Template ${template.templateId}</div>
                <div class="performer-stats">
                    <div class="performer-metric">
                        <span class="metric-value">${template.openRate}%</span>
                        <span class="metric-label">Open Rate</span>
                    </div>
                    <div class="performer-metric">
                        <span class="metric-value">${template.clickRate}%</span>
                        <span class="metric-label">Click Rate</span>
                    </div>
                    <div class="performer-metric">
                        <span class="metric-value">${template.sent}</span>
                        <span class="metric-label">Sent</span>
                    </div>
                </div>
            </div>
        `;
    }

    generateDailyChart(data) {
        const maxValue = Math.max(...data.map(d => d.sent));
        const chartHeight = 200;

        return `
            <div class="chart-container">
                <div class="chart-bars">
                    ${data.map(day => {
                        const height = maxValue > 0 ? (day.sent / maxValue) * chartHeight : 0;
                        return `
                            <div class="chart-bar-container">
                                <div class="chart-bar" style="height: ${height}px" title="${day.sent} emails sent"></div>
                                <div class="chart-label">${day.label}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    generatePerformanceChart(data) {
        const total = data.delivered;
        if (total === 0) return '<p class="no-data">No performance data available.</p>';

        const segments = [
            { label: 'Opened', value: data.opened, color: '#4CAF50' },
            { label: 'Clicked', value: data.clicked, color: '#2196F3' },
            { label: 'Bounced', value: data.bounced, color: '#F44336' },
            { label: 'Delivered (No Action)', value: total - data.opened - data.bounced, color: '#9E9E9E' }
        ];

        return `
            <div class="performance-chart">
                <div class="chart-legend">
                    ${segments.map(segment => `
                        <div class="legend-item">
                            <div class="legend-color" style="background-color: ${segment.color}"></div>
                            <span class="legend-label">${segment.label}: ${segment.value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Utility Functions
    getLast7DaysData() {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayStats = this.analytics.dailyStats[dateStr] || { sent: 0, delivered: 0, opened: 0, clicked: 0 };
            
            data.push({
                date: dateStr,
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                ...dayStats
            });
        }
        return data;
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    getStatusIcon(status) {
        const icons = {
            sent: '📧',
            delivered: '✅',
            opened: '👁️',
            clicked: '🖱️',
            bounced: '❌',
            unsubscribed: '🚫'
        };
        return icons[status] || '📧';
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Event Listeners
    setupEventListeners() {
        // Export analytics data
        const exportBtn = document.getElementById('exportAnalytics');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAnalytics());
        }

        // Refresh dashboard
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.updateDashboard());
        }

        // Date range filter
        const dateRangeSelect = document.getElementById('analyticsDateRange');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => this.filterByDateRange(e.target.value));
        }
    }

    // Data Management
    saveAnalytics() {
        try {
            localStorage.setItem('aurareach_analytics', JSON.stringify(this.analytics));
        } catch (error) {
            console.error('Failed to save analytics:', error);
        }
    }

    loadAnalytics() {
        try {
            const saved = localStorage.getItem('aurareach_analytics');
            if (saved) {
                this.analytics = { ...this.analytics, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    exportAnalytics() {
        const dataStr = JSON.stringify(this.analytics, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `email-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showNotification('Analytics exported successfully!', 'success');
    }

    filterByDateRange(range) {
        // Implementation for filtering analytics by date range
        console.log('Filtering by date range:', range);
        this.updateDashboard();
    }

    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(type, message);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Public API Methods
    getCampaignAnalytics(campaignId) {
        return this.analytics.campaigns.find(c => c.id === campaignId);
    }

    getTemplateAnalytics(templateId) {
        return this.analytics.templateStats[templateId] || null;
    }

    getRecipientAnalytics(recipient) {
        return this.analytics.recipientStats[recipient] || null;
    }

    getOverallStats() {
        return {
            ...this.analytics.stats,
            deliveryRate: this.getDeliveryRate(),
            openRate: this.getOpenRate(),
            clickRate: this.getClickRate(),
            bounceRate: this.getBounceRate(),
            unsubscribeRate: this.getUnsubscribeRate()
        };
    }
}

// Global Analytics Instance
window.EmailAnalytics = new EmailAnalytics();

// Global Functions for UI Integration
function viewCampaignDetails(campaignId) {
    const campaign = window.EmailAnalytics.getCampaignAnalytics(campaignId);
    if (campaign) {
        // Show campaign details modal or navigate to details page
        console.log('Campaign details:', campaign);
        window.EmailAnalytics.showNotification(`Viewing details for campaign: ${campaign.name}`, 'info');
    }
}

function createNewCampaign() {
    // Show create campaign modal
    const modal = document.getElementById('createCampaignModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function refreshAnalyticsDashboard() {
    window.EmailAnalytics.updateDashboard();
    window.EmailAnalytics.showNotification('Dashboard refreshed!', 'success');
}

// Integration with existing email sending functions
function trackEmailSending(emailData) {
    return window.EmailAnalytics.trackEmailSent(emailData);
}

function trackEmailDelivery(trackingId) {
    window.EmailAnalytics.trackEmailDelivered(trackingId);
}

function trackEmailOpen(trackingId, userAgent, ipAddress) {
    window.EmailAnalytics.trackEmailOpened(trackingId, userAgent, ipAddress);
}

function trackEmailClick(trackingId, url, userAgent, ipAddress) {
    window.EmailAnalytics.trackEmailClicked(trackingId, url, userAgent, ipAddress);
}

function trackEmailBounce(trackingId, reason) {
    window.EmailAnalytics.trackEmailBounced(trackingId, reason);
}

function trackEmailUnsubscribe(trackingId) {
    window.EmailAnalytics.trackEmailUnsubscribed(trackingId);
}