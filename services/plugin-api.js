import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();
const pluginsDir = path.join(__dirname, '..', 'plugins');

// Helper function to get plugin metadata
function getPluginMetadata(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const metadata = {
            name: '',
            command: [],
            category: '',
            help: '',
            isAdmin: false,
            isBotAdmin: false,
            isOwner: false,
            isGroup: false,
            enabled: true,
            path: filePath,
            fileName: path.basename(filePath),
            size: fs.statSync(filePath).size,
            modified: fs.statSync(filePath).mtime
        };

        // Parse handler metadata from file content
        const handlerMatch = content.match(/export\s+const\s+handler\s*=\s*\{([^}]+)\}/s);
        if (handlerMatch) {
            const handlerContent = handlerMatch[1];
            
            // Extract command
            const commandMatch = handlerContent.match(/command\s*:\s*(\[[^\]]+\])/);
            if (commandMatch) {
                try {
                    metadata.command = eval(commandMatch[1]);
                } catch (e) {
                    metadata.command = [];
                }
            }
            
            // Extract other simple properties
            const categoryMatch = handlerContent.match(/category\s*:\s*['"`]([^'"`]+)['"`]/);
            if (categoryMatch) metadata.category = categoryMatch[1];
            
            const helpMatch = handlerContent.match(/help\s*:\s*['"`]([^'"`]+)['"`]/);
            if (helpMatch) metadata.help = helpMatch[1];
            
            metadata.isAdmin = handlerContent.includes('isAdmin:') && handlerContent.includes('true');
            metadata.isBotAdmin = handlerContent.includes('isBotAdmin:') && handlerContent.includes('true');
            metadata.isOwner = handlerContent.includes('isOwner:') && handlerContent.includes('true');
            metadata.isGroup = handlerContent.includes('isGroup:') && handlerContent.includes('true');
        }
        
        // Extract plugin name from filename or first comment
        const nameMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/) || content.match(/\/\/\s*(.+)/);
        if (nameMatch) {
            metadata.name = nameMatch[1].replace(/^\*\s*/, '').trim();
        } else {
            metadata.name = path.basename(filePath, '.js');
        }
        
        return metadata;
    } catch (error) {
        return {
            name: path.basename(filePath, '.js'),
            command: [],
            category: 'unknown',
            help: '',
            isAdmin: false,
            isBotAdmin: false,
            isOwner: false,
            isGroup: false,
            enabled: false,
            path: filePath,
            fileName: path.basename(filePath),
            error: error.message
        };
    }
}

// GET /api/plugins - Get all plugins
router.get('/', (req, res) => {
    try {
        const plugins = [];
        
        // Scan enabled plugins
        const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const filePath = path.join(pluginsDir, file);
            if (fs.statSync(filePath).isFile()) {
                const plugin = getPluginMetadata(filePath);
                plugin.enabled = true;
                plugins.push(plugin);
            }
        }
        
        // Scan disabled plugins
        const disabledDir = path.join(pluginsDir, 'disabled');
        if (fs.existsSync(disabledDir)) {
            const disabledFiles = fs.readdirSync(disabledDir).filter(f => f.endsWith('.js'));
            for (const file of disabledFiles) {
                const filePath = path.join(disabledDir, file);
                if (fs.statSync(filePath).isFile()) {
                    const plugin = getPluginMetadata(filePath);
                    plugin.enabled = false;
                    plugins.push(plugin);
                }
            }
        }
        
        res.json({
            success: true,
            data: plugins,
            total: plugins.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/plugins/:filename - Get specific plugin
router.get('/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(pluginsDir, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Plugin not found'
            });
        }
        
        const plugin = getPluginMetadata(filePath);
        res.json({
            success: true,
            data: plugin
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/plugins/:filename/content - Get plugin source code
router.get('/:filename/content', (req, res) => {
    try {
        const { filename } = req.params;
        
        // Check in both enabled and disabled folders
        const enabledPath = path.join(pluginsDir, filename);
        const disabledPath = path.join(pluginsDir, 'disabled', filename);
        
        let filePath = null;
        let isEnabled = false;
        
        if (fs.existsSync(enabledPath)) {
            filePath = enabledPath;
            isEnabled = true;
        } else if (fs.existsSync(disabledPath)) {
            filePath = disabledPath;
            isEnabled = false;
        }
        
        if (!filePath) {
            return res.status(404).json({
                success: false,
                error: 'Plugin not found'
            });
        }
        
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({
            success: true,
            data: {
                filename,
                content,
                fileName: path.basename(filePath),
                enabled: isEnabled
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/plugins/:filename/toggle - Toggle plugin enabled/disabled
router.post('/:filename/toggle', (req, res) => {
    try {
        const { filename } = req.params;
        
        // Create disabled directory if not exists
        const disabledDir = path.join(pluginsDir, 'disabled');
        if (!fs.existsSync(disabledDir)) {
            fs.mkdirSync(disabledDir, { recursive: true });
        }
        
        // Check if plugin is in main folder (enabled)
        const enabledPath = path.join(pluginsDir, filename);
        const disabledPath = path.join(disabledDir, filename);
        
        let isCurrentlyEnabled = false;
        let currentPath = '';
        let newPath = '';
        
        if (fs.existsSync(enabledPath)) {
            isCurrentlyEnabled = true;
            currentPath = enabledPath;
            newPath = disabledPath;
        } else if (fs.existsSync(disabledPath)) {
            isCurrentlyEnabled = false;
            currentPath = disabledPath;
            newPath = enabledPath;
        } else {
            return res.status(404).json({
                success: false,
                error: 'Plugin not found'
            });
        }
        
        // Move file to toggle state
        fs.renameSync(currentPath, newPath);
        
        res.json({
            success: true,
            data: {
                filename,
                enabled: !isCurrentlyEnabled,
                path: newPath
            },
            message: `Plugin ${isCurrentlyEnabled ? 'disabled' : 'enabled'} successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE /api/plugins/:filename - Delete plugin
router.delete('/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        
        // Check in both enabled and disabled folders
        const enabledPath = path.join(pluginsDir, filename);
        const disabledPath = path.join(pluginsDir, 'disabled', filename);
        
        let filePath = null;
        if (fs.existsSync(enabledPath)) {
            filePath = enabledPath;
        } else if (fs.existsSync(disabledPath)) {
            filePath = disabledPath;
        }
        
        if (!filePath) {
            return res.status(404).json({
                success: false,
                error: 'Plugin not found'
            });
        }
        
        fs.unlinkSync(filePath);
        
        res.json({
            success: true,
            data: {
                filename,
                deleted: true
            },
            message: 'Plugin deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PUT /api/plugins/:filename - Update plugin content
router.put('/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }
        
        // Check in both enabled and disabled folders
        const enabledPath = path.join(pluginsDir, filename);
        const disabledPath = path.join(pluginsDir, 'disabled', filename);
        
        let filePath = null;
        if (fs.existsSync(enabledPath)) {
            filePath = enabledPath;
        } else if (fs.existsSync(disabledPath)) {
            filePath = disabledPath;
        }
        
        if (!filePath) {
            return res.status(404).json({
                success: false,
                error: 'Plugin not found'
            });
        }
        
        fs.writeFileSync(filePath, content, 'utf-8');
        
        res.json({
            success: true,
            data: {
                filename,
                updated: true
            },
            message: 'Plugin updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
