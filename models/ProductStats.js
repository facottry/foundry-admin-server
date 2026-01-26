const mongoose = require('mongoose');

const ProductStatsSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    views_total: { type: Number, default: 0 },
    views_24h: { type: Number, default: 0 },
    clicks_total: { type: Number, default: 0 },
    clicks_24h: { type: Number, default: 0 },
    last_viewed_at: { type: Date },
    last_clicked_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProductStats', ProductStatsSchema);
