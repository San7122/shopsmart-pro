const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  getLowStockProducts,
  getExpiringProducts
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { validate, validationSchemas } = require('../middleware/validation');

router.use(protect);

// Alerts routes (before :id to avoid conflict)
router.get('/alerts/low-stock', getLowStockProducts);
router.get('/alerts/expiring', getExpiringProducts);

// Barcode lookup
router.get('/barcode/:barcode', getProductByBarcode);

router.route('/')
  .get(validate(validationSchemas.searchParams), getProducts)
  .post(validate(validationSchemas.product), createProduct);

router.route('/:id')
  .get(validate(validationSchemas.objectId), getProduct)
  .put(validate(validationSchemas.objectId), validate(validationSchemas.product), updateProduct)
  .delete(validate(validationSchemas.objectId), deleteProduct);

router.patch('/:id/stock', validate(validationSchemas.stockUpdate), updateStock);

module.exports = router;
