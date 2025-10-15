const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");

// CRUD routes
router.post("/", expenseController.createExpense);        
router.get("/", expenseController.getAllExpenses);       
router.get("/:id", expenseController.getExpenseById);    
router.put("/:id", expenseController.updateExpense);    
router.delete("/:id", expenseController.deleteExpense);  

// Expense report by date range
router.post("/report", expenseController.getExpenseReportByDateRange);

module.exports = router;
