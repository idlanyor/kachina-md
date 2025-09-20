import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { logger } from '../helper/logger.js';
import { findJsFiles } from '../main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PluginLoader {
    constructor() {
        this.plugins = {};
        this.pluginCache = new Map();
    }

    async loadPlugins() {
        const pluginsDir = path.join(__dirname, '../plugins');
        const plugins = {};

        const pluginFiles = findJsFiles(pluginsDir);
        for (const file of pluginFiles) {
            try {
                // Check cache first
                const stats = await import('fs').then(fs => fs.promises.stat(file));
                const cacheKey = `${file}-${stats.mtime.getTime()}`;
                
                let plugin;
                if (this.pluginCache.has(cacheKey)) {
                    plugin = this.pluginCache.get(cacheKey);
                } else {
                    plugin = await import(pathToFileURL(file).href + '?t=' + Date.now());
                    this.pluginCache.set(cacheKey, plugin);
                }

                if (!plugin.handler) continue;

                const handlers = Array.isArray(plugin.handler.command) ?
                    plugin.handler.command :
                    [plugin.handler.command];

                handlers.forEach(h => {
                    if (typeof h === 'string') {
                        plugins[h.toLowerCase()] = plugin.handler;
                    } else if (h instanceof RegExp) {
                        plugins[h.source.toLowerCase()] = plugin.handler;
                    }
                });

            } catch (err) {
                logger.error(`Error loading plugin ${file}:`, err);
            }
        }

        this.plugins = plugins;
        return plugins;
    }

    getPlugin(command) {
        return this.plugins[command.toLowerCase()];
    }

    async getPluginCategories() {
        const pluginsDir = path.join(__dirname, '../plugins');
        const categories = {};

        const pluginFiles = findJsFiles(pluginsDir);
        for (const file of pluginFiles) {
            try {
                const plugin = await import(pathToFileURL(file).href);
                if (!plugin.handler) continue;

                const category = plugin.handler.category || 'main';
                if (category.toUpperCase() === 'HIDDEN') continue;

                if (!categories[category]) {
                    categories[category] = [];
                }

                const commands = Array.isArray(plugin.handler.command) ?
                    plugin.handler.command :
                    [plugin.handler.command];

                categories[category].push({
                    commands,
                    tags: plugin.handler.tags || []
                });
            } catch (err) {
                logger.error(`Error loading plugin ${file}:`, err);
            }
        }

        return categories;
    }
}

export const pluginLoader = new PluginLoader();