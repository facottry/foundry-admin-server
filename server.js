const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cors());

// DB Config
const db = process.env.MONGO_URI || 'mongodb://localhost:27017/foundry';
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
app.use('/api/products', require('./routes/products'));

// Global Error Handler
app.use(require('./middleware/errorHandler'));

app.use('/api/admin/newsletters', require('./routes/newsletter'));
app.use('/api/admin/uploads', require('./routes/uploads'));

// Serve Uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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
