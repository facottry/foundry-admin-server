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

// Routes
app.use('/api/auth', require('./routes/auth')); // For Admin Login
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/kpis', require('./routes/kpis')); // KPI endpoints
app.use('/api/admin/messages', require('./routes/messages')); // Contact messages
app.use('/api/admin/products', require('./routes/products')); // Product management
app.use('/api/admin/users', require('./routes/users')); // User management
app.use('/api/products', require('./routes/products'));

// Global Error Handler
app.use(require('./middleware/errorHandler'));

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
