const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const ProductStats = require('../models/ProductStats');
const OutboundClick = require('../models/OutboundClick');
const WalletTransaction = require('../models/WalletTransaction');
const Campaign = require('../models/Campaign');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess } = require('../utils/response');

// @route   GET /api/admin/kpis/dashboard
// @desc    Main dashboard with 14 KPIs
router.get('/dashboard', auth(['ADMIN']), asyncHandler(async (req, res) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [productStats, userStats, clickStats, creditStats, campaignStats, alertStats] = await Promise.all([
        Product.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
                }
            }
        ]),
        User.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    founders: { $sum: { $cond: [{ $eq: ['$role', 'FOUNDER'] }, 1, 0] } },
                    customers: { $sum: { $cond: [{ $eq: ['$role', 'CUSTOMER'] }, 1, 0] } }
                }
            }
        ]),
        Promise.all([
            OutboundClick.countDocuments({ created_at: { $gte: todayStart } }),
            OutboundClick.countDocuments()
        ]),
        WalletTransaction.aggregate([
            { $match: { created_at: { $gte: todayStart }, amount: { $lt: 0 } } },
            { $group: { _id: null, consumed: { $sum: { $abs: '$amount' } } } }
        ]),
        Campaign.countDocuments({ status: 'active' }),
        Promise.all([
            User.countDocuments({ role: 'FOUNDER', credits_balance: { $lt: 100 } }),
            ProductStats.countDocuments({ clicks_24h: 0 }),
            ProductStats.aggregate([
                { $match: { clicks_24h: { $gt: 50 } } },
                { $count: 'count' }
            ])
        ])
    ]);

    const products = productStats[0] || { total: 0, approved: 0, pending: 0, rejected: 0 };
    const users = userStats[0] || { total: 0, founders: 0, customers: 0 };
    const [clicksToday, clicksLifetime] = clickStats;
    const creditsConsumedToday = creditStats[0]?.consumed || 0;
    const activeCampaigns = campaignStats;
    const [walletsNearZero, productsZeroClicks, productsSpike] = alertStats;

    const data = {
        // Top row KPIs
        total_products: products.total,
        approved_products: products.approved,
        pending_products: products.pending,
        rejected_products: products.rejected,
        total_users: users.total,
        founders: users.founders,
        customers: users.customers,
        clicks_today: clicksToday,
        clicks_lifetime: clicksLifetime,
        credits_consumed_today: creditsConsumedToday,

        // Alert row KPIs
        active_campaigns: activeCampaigns,
        wallets_near_zero: walletsNearZero,
        products_zero_clicks_24h: productsZeroClicks,
        products_spike_24h: productsSpike[0]?.count || 0
    };

    sendSuccess(res, data);
}));

// @route   GET /api/admin/kpis/overview
// @desc    Platform scale metrics
router.get('/overview', auth(['ADMIN']), asyncHandler(async (req, res) => {
    const [userStats, productStats, topRated, recent] = await Promise.all([
        User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    totalFounders: {
                        $sum: { $cond: [{ $eq: ['$role', 'FOUNDER'] }, 1, 0] }
                    },
                    totalCustomers: {
                        $sum: { $cond: [{ $eq: ['$role', 'CUSTOMER'] }, 1, 0] }
                    },
                    totalAdmins: {
                        $sum: { $cond: [{ $eq: ['$role', 'ADMIN'] }, 1, 0] }
                    }
                }
            }
        ]),
        Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    pendingProducts: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    approvedProducts: {
                        $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                    },
                    rejectedProducts: {
                        $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                    }
                }
            }
        ]),
        Product.find({ status: 'approved' })
            .sort({ avg_rating: -1, ratings_count: -1 })
            .limit(10)
            .select('name avg_rating ratings_count'),
        Product.find({ status: 'approved' })
            .sort({ created_at: -1 })
            .limit(10)
            .select('name created_at categories')
    ]);

    const data = {
        users: userStats[0] || { totalUsers: 0, totalFounders: 0, totalCustomers: 0, totalAdmins: 0 },
        products: productStats[0] || { totalProducts: 0, pendingProducts: 0, approvedProducts: 0, rejectedProducts: 0 },
        topProductsByRating: topRated,
        recentlyLaunched: recent
    };

    sendSuccess(res, data);
}));



// @route   GET /api/admin/kpis/traffic
// @desc    Click analytics and traffic data
router.get('/traffic', auth(['ADMIN']), asyncHandler(async (req, res) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalClicks, clicksToday, clicksLast7Days, topProducts, topProductsByViews] = await Promise.all([
        OutboundClick.countDocuments(),
        OutboundClick.countDocuments({ created_at: { $gte: todayStart } }),
        OutboundClick.countDocuments({ created_at: { $gte: sevenDaysAgo } }),
        OutboundClick.aggregate([
            {
                $group: {
                    _id: '$product_id',
                    clickCount: { $sum: 1 }
                }
            },
            { $sort: { clickCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    productId: '$_id',
                    productName: '$product.name',
                    clicks: '$clickCount'
                }
            }
        ])
    ]);

    const data = {
        totalClicks,
        clicksToday,
        clicksLast7Days,
        topProducts,
        topProductsByViews
    };

    sendSuccess(res, data);
}));

// @route   GET /api/admin/kpis/economics
// @desc    Credits, revenue, wallet metrics
router.get('/economics', auth(['ADMIN']), asyncHandler(async (req, res) => {
    const [creditStats, topSpenders, walletsNearZero] = await Promise.all([
        WalletTransaction.aggregate([
            {
                $group: {
                    _id: null,
                    totalCreditsIssued: {
                        $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] }
                    },
                    totalCreditsConsumed: {
                        $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] }
                    },
                    starterCredits: {
                        $sum: { $cond: [{ $eq: ['$reason', 'starter'] }, '$amount', 0] }
                    },
                    paidTopups: {
                        $sum: { $cond: [{ $eq: ['$reason', 'topup'] }, '$amount', 0] }
                    },
                    transactionCount: { $sum: 1 }
                }
            }
        ]),
        User.aggregate([
            { $match: { role: 'FOUNDER' } },
            { $sort: { credits_balance: 1 } },
            { $limit: 10 },
            {
                $project: {
                    name: 1,
                    email: 1,
                    creditsBalance: '$credits_balance'
                }
            }
        ]),
        User.countDocuments({ role: 'FOUNDER', credits_balance: { $lt: 100 } })
    ]);

    const credits = creditStats[0] || {
        totalCreditsIssued: 0,
        totalCreditsConsumed: 0,
        starterCredits: 0,
        paidTopups: 0,
        transactionCount: 0
    };

    const data = {
        totalCreditsIssued: credits.totalCreditsIssued,
        totalCreditsConsumed: credits.totalCreditsConsumed,
        starterCreditsOutstanding: credits.starterCredits,
        paidTopups: credits.paidTopups,
        revenueEstimate: credits.totalCreditsConsumed, // 1 credit = 1 click consumed
        transactionCount: credits.transactionCount,
        walletsNearZero,
        topSpenders
    };

    sendSuccess(res, data);
}));

// @route   GET /api/admin/kpis/campaigns
// @desc    Boost campaign analytics
router.get('/campaigns', auth(['ADMIN']), asyncHandler(async (req, res) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [campaignStats, spendToday, topCampaigns] = await Promise.all([
        Campaign.aggregate([
            {
                $group: {
                    _id: null,
                    totalCampaigns: { $sum: 1 },
                    activeCampaigns: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    },
                    pausedCampaigns: {
                        $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] }
                    },
                    totalSpend: { $sum: '$credits_spent' }
                }
            }
        ]),
        Campaign.aggregate([
            { $match: { updated_at: { $gte: todayStart } } },
            {
                $group: {
                    _id: null,
                    spendToday: { $sum: '$credits_spent' }
                }
            }
        ]),
        Campaign.aggregate([
            { $sort: { credits_spent: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    campaignId: '$_id',
                    productName: '$product.name',
                    status: 1,
                    creditsSpent: '$credits_spent',
                    category: '$category'
                }
            }
        ])
    ]);

    const stats = campaignStats[0] || {
        totalCampaigns: 0,
        activeCampaigns: 0,
        pausedCampaigns: 0,
        totalSpend: 0
    };

    const data = {
        totalCampaigns: stats.totalCampaigns,
        activeCampaigns: stats.activeCampaigns,
        pausedCampaigns: stats.pausedCampaigns,
        totalSpend: stats.totalSpend,
        spendToday: spendToday[0]?.spendToday || 0,
        topCampaigns
    };

    sendSuccess(res, data);
}));

// @route   GET /api/admin/kpis/moderation
// @desc    Moderation queue and user management
router.get('/moderation', auth(['ADMIN']), asyncHandler(async (req, res) => {
    const [pendingProducts, recentRejections, bannedUsers] = await Promise.all([
        Product.find({ status: 'pending' })
            .sort({ created_at: -1 })
            .limit(20)
            .select('name tagline status created_at owner_user_id')
            .populate('owner_user_id', 'name email'),
        Product.find({ status: 'rejected' })
            .sort({ updated_at: -1 })
            .limit(10)
            .select('name status updated_at owner_user_id')
            .populate('owner_user_id', 'name email'),
        User.countDocuments({ banned: true })
    ]);

    const data = {
        pendingCount: pendingProducts.length,
        pendingProducts,
        recentRejections,
        bannedUsersCount: bannedUsers
    };

    sendSuccess(res, data);
}));

module.exports = router;
