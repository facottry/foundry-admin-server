const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const WalletTransaction = require('../models/WalletTransaction');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../utils/response');

// @route   GET /api/admin/users
// @desc    Get all users with stats
router.get('/', auth(['ADMIN']), asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const role = req.query.role;

    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'created_at';
    const order = req.query.order === 'asc' ? 1 : -1;

    const matchStage = {};
    if (role) {
        matchStage.role = role;
    }

    if (search) {
        matchStage.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    // Sort mapping
    const sortStage = {};
    // Allow sorting by fields created in project or document fields
    sortStage[sortBy] = order;

    const users = await User.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: 'owner_user_id',
                as: 'products'
            }
        },
        {
            $project: {
                email: 1,
                name: 1,
                role: 1,
                credits_balance: 1,
                created_at: 1,
                products_count: { $size: '$products' }
            }
        },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit }
    ]);

    const total = await User.countDocuments(matchStage);

    sendSuccess(res, {
        users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// @route   GET /api/admin/users/:id
// @desc    Get user detail with full stats
router.get('/:id', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(next, 'NOT_FOUND', 'User not found', 404);

    const products = await Product.find({ owner_user_id: user._id, deleted_at: null });
    const transactions = await WalletTransaction.find({ user_id: user._id }).sort({ created_at: -1 }).limit(20);

    // Calculate total clicks from all products
    const ProductStats = require('../models/ProductStats');
    const productIds = products.map(p => p._id);
    const statsAgg = await ProductStats.aggregate([
        { $match: { product_id: { $in: productIds } } },
        {
            $group: {
                _id: null,
                total_clicks: { $sum: '$clicks_total' }
            }
        }
    ]);

    const totalClicks = statsAgg.length > 0 ? statsAgg[0].total_clicks : 0;
    const totalSpend = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);

    const userDetail = {
        ...user._doc,
        products: products, // Return full list of products
        products_owned: products.length,
        total_clicks_generated: totalClicks,
        total_spend: totalSpend,
        recent_transactions: transactions
    };

    sendSuccess(res, userDetail);
}));

module.exports = router;
