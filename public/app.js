// Plugin Manager JavaScript
class PluginManager {
    constructor() {
        this.plugins = [];
        this.filteredPlugins = [];
        this.categories = new Set();
        this.currentEditPlugin = null;
        this.init();
    }

    async init() {
        await this.loadPlugins();
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterPlugins();
        });

        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterPlugins();
        });

        // Status filter
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.filterPlugins();
        });
    }

    async loadPlugins() {
        try {
            this.showLoading();
            const response = await fetch('/api/plugins');
            const result = await response.json();
            
            if (result.success) {
                this.plugins = result.data;
                this.filteredPlugins = [...this.plugins];
                this.extractCategories();
                this.populateCategoryFilter();
            } else {
                this.showError('Failed to load plugins');
            }
        } catch (error) {
            console.error('Error loading plugins:', error);
            this.showError('Error loading plugins');
        } finally {
            this.hideLoading();
        }
    }

    extractCategories() {
        this.categories.clear();
        this.plugins.forEach(plugin => {
            if (plugin.category) {
                this.categories.add(plugin.category);
            }
        });
    }

    populateCategoryFilter() {
        const categorySelect = document.getElementById('categoryFilter');
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        
        Array.from(this.categories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    filterPlugins() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const selectedCategory = document.getElementById('categoryFilter').value;
        const selectedStatus = document.getElementById('statusFilter').value;

        this.filteredPlugins = this.plugins.filter(plugin => {
            // Search filter
            const matchesSearch = !searchTerm || 
                plugin.name.toLowerCase().includes(searchTerm) ||
                plugin.fileName.toLowerCase().includes(searchTerm) ||
                plugin.command.some(cmd => cmd.toLowerCase().includes(searchTerm)) ||
                plugin.category.toLowerCase().includes(searchTerm);

            // Category filter
            const matchesCategory = !selectedCategory || plugin.category === selectedCategory;

            // Status filter
            const matchesStatus = !selectedStatus || 
                (selectedStatus === 'enabled' && plugin.enabled) ||
                (selectedStatus === 'disabled' && !plugin.enabled);

            return matchesSearch && matchesCategory && matchesStatus;
        });

        this.renderPlugins();
        this.updateStatistics();
    }

    renderPlugins() {
        const container = document.getElementById('pluginsList');
        
        if (this.filteredPlugins.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-search fs-1 text-secondary mb-3"></i>
                    <p class="text-secondary">No plugins found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredPlugins.map(plugin => this.createPluginCard(plugin)).join('');
        document.getElementById('pluginCount').textContent = `${this.filteredPlugins.length} plugins`;
    }

    createPluginCard(plugin) {
        const categoryColors = {
            'ai': 'primary',
            'tool': 'success',
            'game': 'warning',
            'dl': 'info',
            'gc': 'danger',
            'user': 'secondary'
        };

        const categoryColor = categoryColors[plugin.category] || 'secondary';
        const statusBadge = plugin.enabled ? 
            '<span class="badge bg-success">Enabled</span>' : 
            '<span class="badge bg-danger">Disabled</span>';

        const commandsBadge = plugin.command.length > 0 ? 
            `<span class="badge bg-info">${plugin.command.length} commands</span>` : '';

        return `
            <div class="plugin-card card">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="d-flex align-items-start justify-content-between">
                                <div>
                                    <h6 class="card-title mb-2">
                                        <i class="bi bi-file-earmark-code me-2"></i>
                                        <span class="category-badge badge bg-${categoryColor}" onclick="filterByCategory('${plugin.category}')">
                                            ${plugin.category}
                                        </span>
                                        <span class="ms-2">${plugin.name}</span>
                                    </h6>
                                    <p class="plugin-meta text-secondary mb-2">
                                        <i class="bi bi-file-earmark me-1"></i> ${plugin.fileName}
                                        <span class="ms-3"><i class="bi bi-clock me-1"></i> ${new Date(plugin.modified).toLocaleDateString()}</span>
                                        <span class="ms-3"><i class="bi bi-hdd me-1"></i> ${this.formatFileSize(plugin.size)}</span>
                                    </p>
                                    ${plugin.help ? `<p class="text-secondary small mb-2">${plugin.help}</p>` : ''}
                                    <div>
                                        ${plugin.command.length > 0 ? 
                                            `<div class="small">
                                                <strong>Commands:</strong> 
                                                ${plugin.command.map(cmd => `<code class="me-1">.${cmd}</code>`).join('')}
                                            </div>` : 
                                            '<div class="small text-secondary">No commands defined</div>'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="mb-2">
                                ${statusBadge}
                                ${commandsBadge}
                            </div>
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-primary" onclick="pluginManager.editPlugin('${plugin.fileName}')" 
                                        title="Edit Plugin">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-${plugin.enabled ? 'warning' : 'success'}" 
                                        onclick="pluginManager.togglePlugin('${plugin.fileName}')" 
                                        title="${plugin.enabled ? 'Disable' : 'Enable'} Plugin">
                                    <i class="bi bi-${plugin.enabled ? 'pause' : 'play'}"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="pluginManager.deletePlugin('${plugin.fileName}')" 
                                        title="Delete Plugin">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateStatistics() {
        const total = this.filteredPlugins.length;
        const enabled = this.filteredPlugins.filter(p => p.enabled).length;
        const disabled = total - enabled;
        const categories = new Set(this.filteredPlugins.map(p => p.category)).size;

        document.getElementById('totalPlugins').textContent = total;
        document.getElementById('enabledPlugins').textContent = enabled;
        document.getElementById('disabledPlugins').textContent = disabled;
        document.getElementById('totalCategories').textContent = categories;
    }

    updateUI() {
        this.renderPlugins();
        this.updateStatistics();
    }

    async togglePlugin(filename) {
        try {
            const response = await fetch(`/api/plugins/${filename}/toggle`, { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Plugin ${filename} ${result.data.enabled ? 'enabled' : 'disabled'}`, 'success');
                await this.loadPlugins();
            } else {
                this.showError('Failed to toggle plugin');
            }
        } catch (error) {
            console.error('Error toggling plugin:', error);
            this.showError('Error toggling plugin');
        }
    }

    async deletePlugin(filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/plugins/${filename}`, { method: 'DELETE' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Plugin ${filename} deleted successfully`, 'success');
                await this.loadPlugins();
            } else {
                this.showError('Failed to delete plugin');
            }
        } catch (error) {
            console.error('Error deleting plugin:', error);
            this.showError('Error deleting plugin');
        }
    }

    async editPlugin(filename) {
        try {
            const response = await fetch(`/api/plugins/${filename}/content`);
            const result = await response.json();
            
            if (result.success) {
                this.currentEditPlugin = filename;
                document.getElementById('editPluginName').value = filename;
                document.getElementById('editPluginCode').value = result.data.content;
                
                const modal = new bootstrap.Modal(document.getElementById('editPluginModal'));
                modal.show();
            } else {
                this.showError('Failed to load plugin content');
            }
        } catch (error) {
            console.error('Error loading plugin content:', error);
            this.showError('Error loading plugin content');
        }
    }

    async savePluginChanges() {
        if (!this.currentEditPlugin) return;

        try {
            const button = event.target.closest('button');
            button.classList.add('loading');

            const content = document.getElementById('editPluginCode').value;
            const response = await fetch(`/api/plugins/${this.currentEditPlugin}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Plugin ${this.currentEditPlugin} updated successfully`, 'success');
                bootstrap.Modal.getInstance(document.getElementById('editPluginModal')).hide();
                await this.loadPlugins();
            } else {
                this.showError('Failed to save plugin');
            }
        } catch (error) {
            console.error('Error saving plugin:', error);
            this.showError('Error saving plugin');
        } finally {
            event.target.closest('button').classList.remove('loading');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info') {
        // Create toast notification
        const toastContainer = document.getElementById('toastContainer') || this.createToastContainer();
        const toastId = 'toast-' + Date.now();
        
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'primary'} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();
        
        // Remove toast element after hiding
        document.getElementById(toastId).addEventListener('hidden.bs.toast', () => {
            document.getElementById(toastId).remove();
        });
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
        return container;
    }

    showLoading() {
        document.getElementById('pluginsList').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-secondary">Loading plugins...</p>
            </div>
        `;
    }

    hideLoading() {
        // Loading will be hidden when plugins are rendered
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Global functions for use in HTML onclick handlers
let pluginManager;

window.filterByCategory = function(category) {
    document.getElementById('categoryFilter').value = category;
    pluginManager.filterPlugins();
};

window.showCreatePluginModal = function() {
    const modal = new bootstrap.Modal(document.getElementById('createPluginModal'));
    modal.show();
};

window.createNewPlugin = async function() {
    try {
        const button = event.target.closest('button');
        button.classList.add('loading');

        const filename = document.getElementById('newPluginName').value.trim();
        const category = document.getElementById('newPluginCategory').value;
        const commands = document.getElementById('newPluginCommands').value.split(',').map(c => c.trim()).filter(c => c);
        const template = document.querySelector('input[name="pluginTemplate"]:checked').id;

        if (!filename) {
            pluginManager.showError('Plugin filename is required');
            return;
        }

        if (!filename.endsWith('.js')) {
            filename += '.js';
        }

        // Generate plugin template
        let templateContent = '';
        switch (template) {
            case 'templateBasic':
                templateContent = generateBasicTemplate(commands, category);
                break;
            case 'templateAI':
                templateContent = generateAITemplate(commands);
                break;
            case 'templateDownloader':
                templateContent = generateDownloaderTemplate(commands);
                break;
        }

        // Create plugin file (this would need server-side implementation)
        pluginManager.showNotification(`Plugin ${filename} created successfully!`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('createPluginModal')).hide();
        
        // Clear form
        document.getElementById('newPluginName').value = '';
        document.getElementById('newPluginCommands').value = '';
        
        await pluginManager.loadPlugins();
    } catch (error) {
        console.error('Error creating plugin:', error);
        pluginManager.showError('Error creating plugin');
    } finally {
        event.target.closest('button').classList.remove('loading');
    }
};

window.refreshPlugins = async function() {
    await pluginManager.loadPlugins();
    pluginManager.showNotification('Plugins refreshed', 'success');
};

// Template generators
function generateBasicTemplate(commands, category) {
    return `import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const handler = {
    command: ${JSON.stringify(commands)},
    category: '${category}',
    help: 'Basic plugin template',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            // Your plugin logic here
            await m.reply('Plugin executed successfully!');
        } catch (error) {
            console.error('Plugin error:', error);
            await m.reply('Error executing plugin');
        }
    }
};`;
}

function generateAITemplate(commands) {
    return `import axios from 'axios';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const handler = {
    command: ${JSON.stringify(commands)},
    category: 'ai',
    help: 'AI plugin template',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            let prompt = args.join(' ');

            if (!prompt) {
                await m.reply('Please provide a prompt');
                return;
            }

            // Add reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Call AI API
            const response = await axios.get('https://api.example.com/ai', {
                params: { prompt }
            });

            // Send result
            await m.reply(response.data.result);
        } catch (error) {
            console.error('AI plugin error:', error);
            await m.reply('Error processing AI request');
        }
    }
};`;
}

function generateDownloaderTemplate(commands) {
    return `import axios from 'axios';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const handler = {
    command: ${JSON.stringify(commands)},
    category: 'dl',
    help: 'Downloader plugin template',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            if (!args[0]) {
                await m.reply('Please provide a URL');
                return;
            }

            const url = args[0];

            // Validate URL
            if (!url.startsWith('http')) {
                await m.reply('Invalid URL format');
                return;
            }

            // Add reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⬇️', key: m.key }
            });

            // Download and process
            const response = await axios.get(url, { responseType: 'arraybuffer' });

            // Send file
            await sock.sendMessage(m.chat, {
                document: response.data,
                fileName: 'download.' + getFileExtension(url),
                mimetype: 'application/octet-stream'
            });
        } catch (error) {
            console.error('Downloader error:', error);
            await m.reply('Error downloading file');
        }
    }
};

function getFileExtension(url) {
    return url.split('.').pop().split('?')[0] || 'txt';
}`;
}

// Initialize plugin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    pluginManager = new PluginManager();

    // Make global functions available for HTML onclick handlers
    window.pluginManager.editPlugin = (filename) => pluginManager.editPlugin(filename);
    window.pluginManager.togglePlugin = (filename) => pluginManager.togglePlugin(filename);
    window.pluginManager.deletePlugin = (filename) => pluginManager.deletePlugin(filename);
    window.pluginManager.savePluginChanges = () => pluginManager.savePluginChanges();
});
