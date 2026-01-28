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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'created_at';
    const order = req.query.order === 'asc' ? 1 : -1;

    // Build Match Stage
    const matchStage = { deleted_at: null };
    if (search) {
        matchStage.$or = [
            { name: { $regex: search, $options: 'i' } },
            { tagline: { $regex: search, $options: 'i' } }
        ];
    }

    // Build Sort Stage
    const sortStage = {};
    // Map frontend sort keys to DB fields if necessary, or use direct
    // For computed fields like clicks, we might need to sort AFTER projection
    // But for basic fields:
    if (sortBy === 'clicks_lifetime') {
        sortStage['clicks_lifetime'] = order; // This field is created in project
    } else if (sortBy === 'clicks_today') {
        sortStage['clicks_today'] = order;
    } else {
        sortStage[sortBy] = order;
    }

    const products = await Product.aggregate([
        { $match: matchStage },
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
                owner_user_id: 1, // Keep original reference
                'owner._id': 1,   // Keep looked-up ID
                'owner.email': 1,
                'owner.name': 1,
                clicks_today: { $ifNull: ['$stats.clicks_24h', 0] },
                clicks_lifetime: { $ifNull: ['$stats.clicks_total', 0] }
            }
        },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit }
    ]);

    const total = await Product.countDocuments(matchStage);

    sendSuccess(res, {
        products,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// @route   GET /api/admin/products/:id
// @desc    Get product detail with full metrics
router.get('/:id', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id).populate('owner_user_id', 'email name');
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

// @route   GET /api/admin/products/:id/analytics
// @desc    Get detailed analytics for a product
router.get('/:id/analytics', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const ProductView = require('../models/ProductView');
    const OutboundClick = require('../models/OutboundClick');

    // Check product exists
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(next, 'NOT_FOUND', 'Product not found', 404);

    // Date range (default 30 days)
    const days = 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Aggregate Views by Day
    const viewsByDay = await ProductView.aggregate([
        { $match: { product_id: product._id, created_at: { $gte: since } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Aggregate Clicks by Day
    const clicksByDay = await OutboundClick.aggregate([
        { $match: { product_id: product._id, created_at: { $gte: since } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Top Countries
    const topCountries = await ProductView.aggregate([
        { $match: { product_id: product._id, created_at: { $gte: since } } },
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    sendSuccess(res, {
        views_history: viewsByDay,
        clicks_history: clicksByDay,
        top_countries: topCountries
    });
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
