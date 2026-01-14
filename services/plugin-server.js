import express from 'express';
import pluginRoutes from './plugin-api.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import Donation from '../database/models/Donation.js';

const app = express();
const PORT = process.env.PLUGIN_MANAGER_PORT || 3000;

// SSE Clients
let donationClients = [];

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Donation Routes
app.get('/api/donations', async (req, res) => {
    try {
        const donations = await Donation.getAll();
        res.json({ success: true, data: donations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/donations/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    donationClients.push(newClient);

    req.on('close', () => {
        donationClients = donationClients.filter(client => client.id !== clientId);
    });
});

app.post('/saweria-w', async (req, res) => {
    try {
        const donationData = req.body;
        console.log('Received Saweria webhook:', donationData);
        
        // Basic validation
        if (!donationData.id || !donationData.amount_raw) {
             return res.status(400).json({ success: false, error: 'Invalid payload' });
        }

        const donation = await Donation.create(donationData);

        // Notify SSE clients
        donationClients.forEach(client => {
            client.res.write(`data: ${JSON.stringify(donation)}\n\n`);
        });

        res.status(200).json({ success: true, message: 'Donation recorded' });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// API Routes
app.use('/api/plugins', pluginRoutes);

// Serve static files for web view
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Plugin Manager API'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Plugin Manager API running on port ${PORT}`);
    console.log(`📱 Web interface: http://localhost:${PORT}`);
    console.log(`🔌 API endpoints: http://localhost:${PORT}/api/plugins`);
});

export default app;
