const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { version } = require('./package.json');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cors());

// Add API_VERSION header to all responses
app.use((req, res, next) => {
    res.setHeader('X-API-VERSION', version);
    next();
});

app.use(require('./middleware/serverHealthMonitor'));

// DB Config
const db = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/foundryfoundry';
mongoose.set('strictQuery', false);

// Routes
app.use('/api/auth', require('./routes/auth')); // For Admin Login
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/kpis', require('./routes/kpis')); // KPI endpoints
app.use('/api/admin/messages', require('./routes/messages')); // Contact messages
app.use('/api/admin/products', require('./routes/products')); // Product management
app.use('/api/admin/users', require('./routes/users')); // User management

app.use('/api/admin/config', require('./routes/config')); // System Config
app.use('/api/admin/personalities', require('./routes/personalities')); // Bot Personalities
app.use('/api/admin/checklist', require('./routes/checklist')); // Checklist Manager
app.use('/api/products', require('./routes/products'));

// Global Error Handler
app.use(require('./middleware/errorHandler'));

app.use('/api/admin/newsletters', require('./routes/newsletter'));
app.use('/api/admin/uploads', require('./routes/uploads'));
app.get('/api/wakeup', (req, res) => res.send('Wakeup call received'));
app.get('/', (req, res) => res.send('Foundry Admin API Running')); // Health check handler
app.use('/api/admin/server-health', require('./routes/serverHealth'));



// Serve Uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public'))); // Serve checklist.html and other static files

// Start AI Cron
// const { startAiCron } = require('./cron/aiNewsletter');
// startAiCron();
const { initAiScheduler } = require('./cron/AiScheduler');
initAiScheduler();

// Connect to MongoDB
mongoose.connect(db)
    .then(() => {
        console.log('MongoDB Connected');
        // Start server only after DB connection
        app.listen(PORT, () => console.log(`Admin Server started on port ${PORT}`));
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });
