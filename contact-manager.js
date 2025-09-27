// Enhanced Contact Management System
class ContactManager {
    constructor() {
        this.contacts = [];
        this.contactGroups = [];
        this.selectedContacts = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.loadContacts();
        this.loadContactGroups();
        this.setupEventListeners();
        this.updateContactsDisplay();
        this.updateGroupsDisplay();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('contactSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.updateContactsDisplay();
            });
        }

        // Filter functionality
        const filterSelect = document.getElementById('contactFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.updateContactsDisplay();
            });
        }

        // Bulk operations
        const selectAllBtn = document.getElementById('selectAllContacts');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllContacts());
        }

        const deleteSelectedBtn = document.getElementById('deleteSelectedContacts');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedContacts());
        }

        // CSV import
        const csvInput = document.getElementById('csvFileInput');
        if (csvInput) {
            csvInput.addEventListener('change', (e) => this.handleCSVImport(e));
        }
    }

    // Contact CRUD Operations
    addContact(contactData) {
        // Validate email
        if (!this.validateEmail(contactData.email)) {
            showNotification('error', 'Invalid email address');
            return false;
        }

        // Check for duplicates
        if (this.contacts.find(c => c.email.toLowerCase() === contactData.email.toLowerCase())) {
            showNotification('error', 'Contact with this email already exists');
            return false;
        }

        const contact = {
            id: Date.now() + Math.random(),
            name: contactData.name || '',
            email: contactData.email,
            phone: contactData.phone || '',
            company: contactData.company || '',
            position: contactData.position || '',
            notes: contactData.notes || '',
            tags: contactData.tags || [],
            groups: contactData.groups || [],
            dateAdded: new Date().toISOString(),
            lastContacted: null,
            emailsSent: 0,
            status: 'active'
        };

        this.contacts.push(contact);
        this.saveContacts();
        this.updateContactsDisplay();
        this.updateStats();
        
        showNotification('success', 'Contact added successfully');
        return true;
    }

    updateContact(id, contactData) {
        const index = this.contacts.findIndex(c => c.id === id);
        if (index === -1) {
            showNotification('error', 'Contact not found');
            return false;
        }

        // Validate email if changed
        if (contactData.email && !this.validateEmail(contactData.email)) {
            showNotification('error', 'Invalid email address');
            return false;
        }

        // Check for duplicates if email changed
        if (contactData.email && contactData.email !== this.contacts[index].email) {
            if (this.contacts.find(c => c.email.toLowerCase() === contactData.email.toLowerCase())) {
                showNotification('error', 'Contact with this email already exists');
                return false;
            }
        }

        this.contacts[index] = { ...this.contacts[index], ...contactData };
        this.saveContacts();
        this.updateContactsDisplay();
        
        showNotification('success', 'Contact updated successfully');
        return true;
    }

    deleteContact(id) {
        const index = this.contacts.findIndex(c => c.id === id);
        if (index === -1) {
            showNotification('error', 'Contact not found');
            return false;
        }

        this.contacts.splice(index, 1);
        this.saveContacts();
        this.updateContactsDisplay();
        this.updateStats();
        
        showNotification('success', 'Contact deleted successfully');
        return true;
    }

    // Contact Groups Management
    createGroup(groupData) {
        const group = {
            id: Date.now() + Math.random(),
            name: groupData.name,
            description: groupData.description || '',
            color: groupData.color || '#3b82f6',
            contactIds: [],
            dateCreated: new Date().toISOString()
        };

        this.contactGroups.push(group);
        this.saveContactGroups();
        this.updateGroupsDisplay();
        
        showNotification('success', 'Contact group created successfully');
        return group.id;
    }

    addContactToGroup(contactId, groupId) {
        const group = this.contactGroups.find(g => g.id === groupId);
        const contact = this.contacts.find(c => c.id === contactId);
        
        if (!group || !contact) {
            showNotification('error', 'Group or contact not found');
            return false;
        }

        if (!group.contactIds.includes(contactId)) {
            group.contactIds.push(contactId);
        }

        if (!contact.groups.includes(groupId)) {
            contact.groups.push(groupId);
        }

        this.saveContacts();
        this.saveContactGroups();
        this.updateContactsDisplay();
        this.updateGroupsDisplay();
        
        return true;
    }

    removeContactFromGroup(contactId, groupId) {
        const group = this.contactGroups.find(g => g.id === groupId);
        const contact = this.contacts.find(c => c.id === contactId);
        
        if (!group || !contact) return false;

        group.contactIds = group.contactIds.filter(id => id !== contactId);
        contact.groups = contact.groups.filter(id => id !== groupId);

        this.saveContacts();
        this.saveContactGroups();
        this.updateContactsDisplay();
        this.updateGroupsDisplay();
        
        return true;
    }

    // CSV Import/Export
    handleCSVImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const contacts = this.parseCSV(csv);
                this.importContacts(contacts);
            } catch (error) {
                showNotification('error', 'Error reading CSV file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    parseCSV(csv) {
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const contacts = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const contact = {};

            headers.forEach((header, index) => {
                const value = values[index] || '';
                switch (header) {
                    case 'name':
                    case 'full name':
                    case 'fullname':
                        contact.name = value;
                        break;
                    case 'email':
                    case 'email address':
                        contact.email = value;
                        break;
                    case 'phone':
                    case 'phone number':
                        contact.phone = value;
                        break;
                    case 'company':
                    case 'organization':
                        contact.company = value;
                        break;
                    case 'position':
                    case 'title':
                    case 'job title':
                        contact.position = value;
                        break;
                    case 'notes':
                    case 'note':
                        contact.notes = value;
                        break;
                }
            });

            if (contact.email) {
                contacts.push(contact);
            }
        }

        return contacts;
    }

    importContacts(contactsData) {
        let imported = 0;
        let skipped = 0;

        contactsData.forEach(contactData => {
            if (this.addContact(contactData)) {
                imported++;
            } else {
                skipped++;
            }
        });

        showNotification('success', `Imported ${imported} contacts. Skipped ${skipped} duplicates.`);
    }

    exportContactsCSV() {
        const headers = ['Name', 'Email', 'Phone', 'Company', 'Position', 'Notes', 'Date Added'];
        const csvContent = [
            headers.join(','),
            ...this.contacts.map(contact => [
                `"${contact.name}"`,
                `"${contact.email}"`,
                `"${contact.phone}"`,
                `"${contact.company}"`,
                `"${contact.position}"`,
                `"${contact.notes}"`,
                `"${new Date(contact.dateAdded).toLocaleDateString()}"`
            ].join(','))
        ].join('\n');

        this.downloadCSV(csvContent, 'contacts.csv');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Contact Selection and Bulk Operations
    selectContact(contactId) {
        if (!this.selectedContacts.includes(contactId)) {
            this.selectedContacts.push(contactId);
        }
        this.updateSelectionUI();
    }

    deselectContact(contactId) {
        this.selectedContacts = this.selectedContacts.filter(id => id !== contactId);
        this.updateSelectionUI();
    }

    selectAllContacts() {
        const filteredContacts = this.getFilteredContacts();
        this.selectedContacts = filteredContacts.map(c => c.id);
        this.updateContactsDisplay();
        this.updateSelectionUI();
    }

    clearSelection() {
        this.selectedContacts = [];
        this.updateContactsDisplay();
        this.updateSelectionUI();
    }

    deleteSelectedContacts() {
        if (this.selectedContacts.length === 0) {
            showNotification('warning', 'No contacts selected');
            return;
        }

        if (confirm(`Are you sure you want to delete ${this.selectedContacts.length} selected contacts?`)) {
            this.selectedContacts.forEach(id => {
                const index = this.contacts.findIndex(c => c.id === id);
                if (index !== -1) {
                    this.contacts.splice(index, 1);
                }
            });

            this.selectedContacts = [];
            this.saveContacts();
            this.updateContactsDisplay();
            this.updateStats();
            
            showNotification('success', 'Selected contacts deleted successfully');
        }
    }

    // Display and UI Updates
    updateContactsDisplay() {
        const container = document.getElementById('contactsContainer');
        if (!container) return;

        const filteredContacts = this.getFilteredContacts();

        if (filteredContacts.length === 0) {
            container.innerHTML = '<p class="no-contacts">No contacts found.</p>';
            return;
        }

        let html = '';
        filteredContacts.forEach(contact => {
            const isSelected = this.selectedContacts.includes(contact.id);
            const groups = contact.groups.map(groupId => {
                const group = this.contactGroups.find(g => g.id === groupId);
                return group ? group.name : '';
            }).filter(name => name).join(', ');

            html += `
                <div class="contact-item ${isSelected ? 'selected' : ''}" data-id="${contact.id}">
                    <div class="contact-checkbox">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="contactManager.toggleContactSelection('${contact.id}', this.checked)">
                    </div>
                    <div class="contact-info">
                        <div class="contact-name">${contact.name}</div>
                        <div class="contact-email">${contact.email}</div>
                        ${contact.company ? `<div class="contact-company">${contact.company}</div>` : ''}
                        ${groups ? `<div class="contact-groups">Groups: ${groups}</div>` : ''}
                        <div class="contact-meta">
                            Added: ${new Date(contact.dateAdded).toLocaleDateString()} | 
                            Emails sent: ${contact.emailsSent}
                        </div>
                    </div>
                    <div class="contact-actions">
                        <button class="btn btn-secondary btn-sm" onclick="contactManager.editContact('${contact.id}')">
                            <svg class="icon icon-sm"><use href="#icon-edit"></use></svg>
                            Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="contactManager.deleteContact('${contact.id}')">
                            <svg class="icon icon-sm"><use href="#icon-trash"></use></svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.updateSelectionUI();
    }

    updateGroupsDisplay() {
        const container = document.getElementById('groupsContainer');
        if (!container) return;

        if (this.contactGroups.length === 0) {
            container.innerHTML = '<p>No contact groups created yet.</p>';
            return;
        }

        let html = '';
        this.contactGroups.forEach(group => {
            const contactCount = group.contactIds.length;
            html += `
                <div class="group-item">
                    <div class="group-info">
                        <div class="group-name" style="color: ${group.color};">${group.name}</div>
                        <div class="group-description">${group.description}</div>
                        <div class="group-meta">${contactCount} contacts</div>
                    </div>
                    <div class="group-actions">
                        <button class="btn btn-secondary btn-sm" onclick="contactManager.editGroup('${group.id}')">
                            <svg class="icon icon-sm"><use href="#icon-edit"></use></svg>
                            Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="contactManager.deleteGroup('${group.id}')">
                            <svg class="icon icon-sm"><use href="#icon-trash"></use></svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateSelectionUI() {
        const selectedCount = this.selectedContacts.length;
        const selectionInfo = document.getElementById('selectionInfo');
        const bulkActions = document.getElementById('bulkActions');

        if (selectionInfo) {
            selectionInfo.textContent = selectedCount > 0 ? `${selectedCount} contacts selected` : '';
        }

        if (bulkActions) {
            bulkActions.style.display = selectedCount > 0 ? 'flex' : 'none';
        }
    }

    getFilteredContacts() {
        let filtered = this.contacts;

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(contact => 
                contact.name.toLowerCase().includes(this.searchQuery) ||
                contact.email.toLowerCase().includes(this.searchQuery) ||
                contact.company.toLowerCase().includes(this.searchQuery)
            );
        }

        // Apply group filter
        if (this.currentFilter !== 'all') {
            if (this.currentFilter === 'ungrouped') {
                filtered = filtered.filter(contact => contact.groups.length === 0);
            } else {
                filtered = filtered.filter(contact => contact.groups.includes(this.currentFilter));
            }
        }

        return filtered;
    }

    // Utility Functions
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    toggleContactSelection(contactId, isSelected) {
        if (isSelected) {
            this.selectContact(contactId);
        } else {
            this.deselectContact(contactId);
        }
    }

    editContact(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) return;

        // Create edit modal
        this.showContactModal(contact);
    }

    editGroup(groupId) {
        const group = this.contactGroups.find(g => g.id === groupId);
        if (!group) return;

        // Create edit modal
        this.showGroupModal(group);
    }

    deleteGroup(groupId) {
        if (confirm('Are you sure you want to delete this group?')) {
            // Remove group from all contacts
            this.contacts.forEach(contact => {
                contact.groups = contact.groups.filter(id => id !== groupId);
            });

            // Remove group
            this.contactGroups = this.contactGroups.filter(g => g.id !== groupId);
            
            this.saveContacts();
            this.saveContactGroups();
            this.updateContactsDisplay();
            this.updateGroupsDisplay();
            
            showNotification('success', 'Group deleted successfully');
        }
    }

    showContactModal(contact = null) {
        const isEdit = contact !== null;
        const modal = document.createElement('div');
        modal.className = 'contact-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit Contact' : 'Add Contact'}</h3>
                    <button type="button" class="modal-close" onclick="this.closest('.contact-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="contactForm">
                        <div class="form-group">
                            <label for="modalContactName">Name</label>
                            <input type="text" id="modalContactName" class="form-control" value="${contact?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="modalContactEmail">Email</label>
                            <input type="email" id="modalContactEmail" class="form-control" value="${contact?.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="modalContactPhone">Phone</label>
                            <input type="tel" id="modalContactPhone" class="form-control" value="${contact?.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label for="modalContactCompany">Company</label>
                            <input type="text" id="modalContactCompany" class="form-control" value="${contact?.company || ''}">
                        </div>
                        <div class="form-group">
                            <label for="modalContactPosition">Position</label>
                            <input type="text" id="modalContactPosition" class="form-control" value="${contact?.position || ''}">
                        </div>
                        <div class="form-group">
                            <label for="modalContactNotes">Notes</label>
                            <textarea id="modalContactNotes" class="form-control" rows="3">${contact?.notes || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.contact-modal').remove()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="contactManager.saveContactFromModal(${contact?.id || null})">
                        ${isEdit ? 'Update' : 'Add'} Contact
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    saveContactFromModal(contactId = null) {
        const formData = {
            name: document.getElementById('modalContactName').value,
            email: document.getElementById('modalContactEmail').value,
            phone: document.getElementById('modalContactPhone').value,
            company: document.getElementById('modalContactCompany').value,
            position: document.getElementById('modalContactPosition').value,
            notes: document.getElementById('modalContactNotes').value
        };

        if (!formData.name || !formData.email) {
            showNotification('error', 'Name and email are required');
            return;
        }

        let success;
        if (contactId) {
            success = this.updateContact(contactId, formData);
        } else {
            success = this.addContact(formData);
        }

        if (success) {
            document.querySelector('.contact-modal').remove();
        }
    }

    updateStats() {
        if (typeof updateDashboard === 'function') {
            emailStats.totalContacts = this.contacts.length;
            updateDashboard();
        }
    }

    // Data Persistence
    saveContacts() {
        localStorage.setItem('aurareach_contacts', JSON.stringify(this.contacts));
    }

    loadContacts() {
        const saved = localStorage.getItem('aurareach_contacts');
        if (saved) {
            this.contacts = JSON.parse(saved);
        }
    }

    saveContactGroups() {
        localStorage.setItem('aurareach_contact_groups', JSON.stringify(this.contactGroups));
    }

    loadContactGroups() {
        const saved = localStorage.getItem('aurareach_contact_groups');
        if (saved) {
            this.contactGroups = JSON.parse(saved);
        }
    }
}

// Initialize contact manager
let contactManager;
document.addEventListener('DOMContentLoaded', function() {
    contactManager = new ContactManager();
});

// Enhanced contact management functions for backward compatibility
function addContact() {
    contactManager.showContactModal();
}

function importContacts() {
    const input = document.getElementById('csvFileInput');
    if (input) {
        input.click();
    } else {
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => contactManager.handleCSVImport(e));
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }
}

function exportContacts() {
    contactManager.exportContactsCSV();
}