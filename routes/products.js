const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const ProductStats = require('../models/ProductStats');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../utils/response');

// @route   GET /api/admin/products
// @desc    Get all products with stats
router.get('/', auth(['ADMIN']), asyncHandler(async (req, res) => {
    const products = await Product.aggregate([
        { $match: { deleted_at: null } },
        {
            $lookup: {
                from: 'users',
                localField: 'owner_user_id',
                foreignField: '_id',
                as: 'owner'
            }
        },
        { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'productstats',
                localField: '_id',
                foreignField: 'product_id',
                as: 'stats'
            }
        },
        { $unwind: { path: '$stats', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: 1,
                tagline: 1,
                status: 1,
                traffic_enabled: 1,
                avg_rating: 1,
                ratings_count: 1,
                created_at: 1,
                'owner.email': 1,
                clicks_today: { $ifNull: ['$stats.clicks_24h', 0] },
                clicks_lifetime: { $ifNull: ['$stats.clicks_total', 0] }
            }
        },
        { $sort: { created_at: -1 } }
    ]);

    sendSuccess(res, products);
}));

// @route   GET /api/admin/products/:id
// @desc    Get product detail with full metrics
router.get('/:id', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id).populate('owner_user_id', 'email');
    if (!product) return sendError(next, 'NOT_FOUND', 'Product not found', 404);

    const stats = await ProductStats.findOne({ product_id: product._id });

    // Get campaign data
    const Campaign = require('../models/Campaign');
    const campaigns = await Campaign.find({ product_id: product._id });

    const productDetail = {
        ...product._doc,
        stats: {
            clicks_today: stats?.clicks_24h || 0,
            clicks_7d: stats?.clicks_total || 0, // Simplified
            clicks_lifetime: stats?.clicks_total || 0,
            views_today: stats?.views_24h || 0,
            views_lifetime: stats?.views_total || 0
        },
        campaigns: campaigns.map(c => ({
            status: c.status,
            daily_budget: c.daily_budget,
            max_cpc: c.max_cpc,
            spent_today: c.spent_today || 0
        }))
    };

    sendSuccess(res, productDetail);
}));

// @route   POST /api/admin/products/:id/approve
// @desc    Approve a pending product
router.post('/:id/approve', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(next, 'NOT_FOUND', 'Product not found', 404);

    if (product.status === 'approved') {
        return sendError(next, 'BAD_REQUEST', 'Product is already approved', 400);
    }

    product.status = 'approved';
    product.traffic_enabled = true; // Auto-enable traffic on approval
    await product.save();

    sendSuccess(res, { message: 'Product approved successfully', product });
}));

module.exports = router;
