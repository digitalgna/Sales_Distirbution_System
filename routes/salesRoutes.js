const express = require("express");
const router = express.Router();
const upload = require("../middleware/salesUpload");
const salesController = require("../controllers/salesController");

// CRUD Routes
router.post("/", upload.array("reciept", 5), salesController.createSale);
router.get("/", salesController.getAllSales);
router.get("/:id", salesController.getSaleById);
router.put("/:id", upload.array("reciept", 5), salesController.updateSale);
router.delete("/:id", salesController.deleteSale);

router.get("/customer/:customerId", salesController.getSalesByCustomer);
router.get("/item/:itemId", salesController.getSalesByItem);
router.get("/user/:userId", salesController.getSalesBySalesMan);
router.get("/warehouse/:warehouseId", salesController.getSalesByWarehouse);
router.post("/report", salesController.getSalesReportByDateRange);


module.exports = router;
