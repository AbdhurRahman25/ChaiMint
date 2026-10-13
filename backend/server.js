
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Sale = require("./models/sale");
const Expense = require("./models/Expense");
const CustomerPayment = require("./models/CustomerPayment");

const app = express();

app.use(cors());
app.use(express.json());

const validPaymentStatuses = ["Paid", "Pending"];

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "ChaiMint backend connected!",
  });
});

 // CREATE SALE
app.post("/api/sales", async (req, res) => {
  try {
    const {
      customerName,
      teaQuantity,
      pricePerCup,
      biscuitQuantity,
      biscuitPrice,
      paymentStatus,
      notes,
    } = req.body;

    const teaQty = Number(teaQuantity);
    const teaPrice = Number(pricePerCup);
    const biscuitQty = Number(biscuitQuantity ?? 0);
    const biscuitUnitPrice = Number(biscuitPrice ?? 0);
    const status = paymentStatus || "Paid";

    if (
      !Number.isInteger(teaQty) ||
      teaQty < 1 ||
      !Number.isFinite(teaPrice) ||
      teaPrice < 0 ||
      !Number.isInteger(biscuitQty) ||
      biscuitQty < 0 ||
      !Number.isFinite(biscuitUnitPrice) ||
      biscuitUnitPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter valid tea and biscuit quantities and prices",
      });
    }

    if (!validPaymentStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Payment status must be Paid or Pending",
      });
    }

    const totalAmount = Math.round(
      (teaQty * teaPrice + biscuitQty * biscuitUnitPrice) * 100
    ) / 100;

    const requestedPaidAmount =
      status === "Paid"
        ? totalAmount
        : Number(req.body.amountPaid ?? 0);

    if (
      !Number.isFinite(requestedPaidAmount) ||
      requestedPaidAmount < 0 ||
      requestedPaidAmount > totalAmount
    ) {
      return res.status(400).json({
        success: false,
        message: "Paid amount must be between 0 and the total amount",
      });
    }

    const actualPaymentStatus =
      requestedPaidAmount >= totalAmount ? "Paid" : "Pending";

    const sale = await Sale.create({
      customerName: customerName?.trim() || "Walk-in Customer",
      teaQuantity: teaQty,
      pricePerCup: teaPrice,
      biscuitQuantity: biscuitQty,
      biscuitPrice: biscuitUnitPrice,
      totalAmount,
      amountPaid: requestedPaidAmount,
      paymentStatus: actualPaymentStatus,
      notes: typeof notes === "string" ? notes.trim() : "",
    });

    return res.status(201).json({
      success: true,
      message: "Sale saved successfully",
      sale,
    });
  } catch (error) {
    console.error("Save sale error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save sale",
    });
  }
});


 // LIST SALES
app.get("/api/sales", async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: sales.length,
      sales,
    });
  } catch (error) {
    console.error("Fetch sales error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales",
    });
  }
});





 // EDIT SALE
app.put("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID",
      });
    }

    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    const {
      customerName,
      teaQuantity,
      pricePerCup,
      biscuitQuantity,
      biscuitPrice,
      paymentStatus,
      amountPaid,
      notes,
    } = req.body;

    const teaQty = Number(teaQuantity);
    const teaPrice = Number(pricePerCup);
    const biscuitQty = Number(biscuitQuantity ?? sale.biscuitQuantity ?? 0);
    const biscuitUnitPrice = Number(biscuitPrice ?? sale.biscuitPrice ?? 0);

    if (
      !Number.isInteger(teaQty) ||
      teaQty < 1 ||
      !Number.isFinite(teaPrice) ||
      teaPrice < 0 ||
      !Number.isInteger(biscuitQty) ||
      biscuitQty < 0 ||
      !Number.isFinite(biscuitUnitPrice) ||
      biscuitUnitPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter valid tea and biscuit quantities and prices",
      });
    }

    if (
      paymentStatus !== undefined &&
      !validPaymentStatuses.includes(paymentStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment status must be Paid or Pending",
      });
    }

    const newTotal = Math.round(
      (teaQty * teaPrice + biscuitQty * biscuitUnitPrice) * 100
    ) / 100;

    const linkedPayment = await CustomerPayment.findOne({
      "allocations.saleId": sale._id,
    });

    const oldPaid =
      sale.amountPaid != null
        ? sale.amountPaid
        : sale.paymentStatus === "Paid"
          ? sale.totalAmount
          : 0;

    const requestedStatus = paymentStatus || sale.paymentStatus;

    if (
      linkedPayment &&
      (
        newTotal !== sale.totalAmount ||
        (
          typeof customerName === "string" &&
          customerName.trim() !== sale.customerName
        ) ||
        (
          paymentStatus !== undefined &&
          paymentStatus !== sale.paymentStatus
        ) ||
        (
          biscuitQty !== (sale.biscuitQuantity ?? 0) ||
          biscuitUnitPrice !== (sale.biscuitPrice ?? 0)
        )
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This sale has customer payment history. Amount, customer and payment status cannot be changed.",
      });
    }

    if (newTotal < oldPaid) {
      return res.status(400).json({
        success: false,
        message: "New total cannot be less than the amount already paid.",
      });
    }

    let newPaidAmount = oldPaid;

    if (!linkedPayment) {
      if (amountPaid !== undefined) {
        newPaidAmount = Number(amountPaid);
      } else if (paymentStatus === "Paid") {
        newPaidAmount = newTotal;
      }

      if (
        !Number.isFinite(newPaidAmount) ||
        newPaidAmount < 0 ||
        newPaidAmount > newTotal
      ) {
        return res.status(400).json({
          success: false,
          message: "Paid amount must be between 0 and the total amount",
        });
      }

      if (
        requestedStatus === "Pending" &&
        newPaidAmount >= newTotal &&
        newTotal > 0
      ) {
        return res.status(400).json({
          success: false,
          message: "This sale is already fully paid.",
        });
      }
    }

    sale.customerName =
      typeof customerName === "string" && customerName.trim()
        ? customerName.trim()
        : "Walk-in Customer";

    sale.teaQuantity = teaQty;
    sale.pricePerCup = teaPrice;
    sale.biscuitQuantity = biscuitQty;
    sale.biscuitPrice = biscuitUnitPrice;
    sale.totalAmount = newTotal;
    sale.amountPaid = newPaidAmount;
    sale.paymentStatus =
      newPaidAmount >= newTotal ? "Paid" : "Pending";

    if (typeof notes === "string") {
      sale.notes = notes.trim();
    }

    await sale.save();

    return res.json({
      success: true,
      message: "Sale updated successfully",
      sale,
    });
  } catch (error) {
    console.error("Update sale error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update sale",
    });
  }
});


 // DELETE SALE
app.delete("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID",
      });
    }

    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    // Preserve recorded customer payment history
    const linkedPayment = await CustomerPayment.findOne({
      "allocations.saleId": sale._id,
    });

    if (linkedPayment) {
      return res.status(409).json({
        success: false,
        message:
          "This sale has customer payment history and cannot be deleted.",
      });
    }

    await Sale.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Sale deleted successfully",
    });
  } catch (error) {
    console.error("Delete sale error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete sale",
    });
  }
});

function formatExpenseCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function validateExpense(body) {
  const category = formatExpenseCategory(body.category);
  const quantity = Number(body.quantity);
  const amount = Number(body.amount);

  if (!category) {
    return { error: "Category is required" };
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity must be greater than zero" };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount per quantity must be greater than zero" };
  }

  const totalAmount = Math.round(quantity * amount * 100) / 100;

  return { category, quantity, amount, totalAmount };
}

// CREATE EXPENSE
app.post("/api/expenses", async (req, res) => {
  try {
    const values = validateExpense(req.body);

    if (values.error) {
      return res.status(400).json({
        success: false,
        message: values.error,
      });
    }

    const expense = await Expense.create(values);

    return res.status(201).json({
      success: true,
      message: "Expense saved successfully",
      expense,
    });
  } catch (error) {
    console.error("Save expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save expense",
    });
  }
});

// LIST EXPENSES
app.get("/api/expenses", async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    console.error("Fetch expenses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
    });
  }
});

// EDIT EXPENSE
app.put("/api/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const values = validateExpense(req.body);

    if (values.error) {
      return res.status(400).json({
        success: false,
        message: values.error,
      });
    }

    const expense = await Expense.findByIdAndUpdate(
      id,
      values,
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.json({
      success: true,
      message: "Expense updated successfully",
      expense,
    });
  } catch (error) {
    console.error("Update expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update expense",
    });
  }
});

// DELETE EXPENSE
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Delete expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete expense",
    });
  }
});


// CREATE CUSTOMER PAYMENT
app.post("/api/customer-payments", async (req, res) => {
  try {
    const customerName = req.body.customerName?.trim();
    const amount = Number(req.body.amount);
    const notes = req.body.notes || "";

    if (
      !customerName ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid customer name and payment amount are required",
      });
    }

    const allSales = await Sale.find().sort({ createdAt: 1 });

    const customerSales = allSales.filter(
      (sale) =>
        (sale.customerName || "Walk-in Customer")
          .trim()
          .toLowerCase() === customerName.toLowerCase()
    );

    const pendingSales = customerSales
      .map((sale) => {
        const paid =
          sale.amountPaid != null
            ? sale.amountPaid
            : sale.paymentStatus === "Paid"
              ? sale.totalAmount
              : 0;

        return {
          sale,
          paid,
          balance: Math.max(0, sale.totalAmount - paid),
        };
      })
      .filter((item) => item.balance > 0);

    const totalBalance = pendingSales.reduce(
      (sum, item) => sum + item.balance,
      0
    );

    if (amount > totalBalance) {
      return res.status(400).json({
        success: false,
        message: "Payment exceeds the customer's outstanding balance",
        outstandingBalance: totalBalance,
      });
    }

    let remaining = amount;
    const allocations = [];

    for (const item of pendingSales) {
      if (remaining <= 0) break;

      const applied = Math.min(remaining, item.balance);
      const newPaidAmount = item.paid + applied;

      item.sale.amountPaid = newPaidAmount;
      item.sale.paymentStatus =
        newPaidAmount >= item.sale.totalAmount ? "Paid" : "Pending";

      await item.sale.save();

      allocations.push({
        saleId: item.sale._id,
        amount: applied,
      });

      remaining -= applied;
    }

    const payment = await CustomerPayment.create({
      customerName,
      amount,
      notes,
      allocations,
    });

    return res.status(201).json({
      success: true,
      message: "Customer payment recorded successfully",
      payment,
      remainingBalance: Math.max(0, totalBalance - amount),
    });
  } catch (error) {
    console.error("Customer payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record customer payment",
    });
  }
});

// LIST CUSTOMER PAYMENTS
app.get("/api/customer-payments", async (req, res) => {
  try {
    const payments = await CustomerPayment.find().sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Fetch payments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
});

// CUSTOMER BALANCES
app.get("/api/customer-balances", async (req, res) => {
  try {
    const sales = await Sale.find();
    const balances = {};

    for (const sale of sales) {
      const name = (sale.customerName || "Walk-in Customer").trim();
      const key = name.toLowerCase();

      const paid =
        sale.amountPaid != null
          ? sale.amountPaid
          : sale.paymentStatus === "Paid"
            ? sale.totalAmount
            : 0;

      const outstanding = Math.max(0, sale.totalAmount - paid);

      if (!balances[key]) {
        balances[key] = {
          customerName: name,
          totalSales: 0,
          totalPaid: 0,
          balance: 0,
        };
      }

      balances[key].totalSales += sale.totalAmount;
      balances[key].totalPaid += paid;
      balances[key].balance += outstanding;
    }

    return res.json({
      success: true,
      customers: Object.values(balances),
    });
  } catch (error) {
    console.error("Customer balances error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer balances",
    });
  }
});

// DAILY REPORT
app.get("/api/reports/daily", async (req, res) => {
  try {
    const date = req.query.date;

    const selectedDate =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : new Date().toLocaleDateString("en-CA");

    const start = new Date(`${selectedDate}T00:00:00`);
    const end = new Date(`${selectedDate}T00:00:00`);
    end.setDate(end.getDate() + 1);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) ||
      Number.isNaN(start.getTime()) ||
      start.getFullYear() !== Number(selectedDate.slice(0, 4)) ||
      start.getMonth() + 1 !== Number(selectedDate.slice(5, 7)) ||
      start.getDate() !== Number(selectedDate.slice(8, 10))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use YYYY-MM-DD.",
      });
    }

    const [sales, expenses, payments] = await Promise.all([
      Sale.find({ createdAt: { $gte: start, $lt: end } }),
      Expense.find({ createdAt: { $gte: start, $lt: end } }),
      CustomerPayment.find({ createdAt: { $gte: start, $lt: end } }),
    ]);

    const totalSales = sales.reduce(
      (sum, sale) => sum + sale.totalAmount,
      0
    );

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + (expense.totalAmount ?? expense.amount),
      0
    );

    const customerPaymentsReceived = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    return res.json({
      success: true,
      date: selectedDate,
      salesCount: sales.length,
      totalSales,
      totalExpenses,
      customerPaymentsReceived,
      estimatedDifference: totalSales - totalExpenses,
    });
  } catch (error) {
    console.error("Daily report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate daily report",
    });
  }
});

// START SERVER
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Atlas connected successfully!");

    const port = process.env.PORT || 4000;

    app.listen(port, () => {
      console.log(`Backend running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exitCode = 1;
  }
}

startServer();
