const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../utils/response');

router.get('/products', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const products = await Product.find().sort({ created_at: -1 });
    sendSuccess(res, products);
}));

router.post('/products/approve', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const { product_id, status } = req.body;
    const product = await Product.findById(product_id);
    if (!product) return sendError(next, 'NOT_FOUND', 'Product not found', 404);

    product.status = status;
    await product.save();
    sendSuccess(res, product);
}));

module.exports = router;
