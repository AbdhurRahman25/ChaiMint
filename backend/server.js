
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const Sale = require("./models/sale");
const Expense = require("./models/Expense");
const CustomerPayment = require("./models/CustomerPayment");
const User = require("./models/user");



const app = express();

app.use(cors({
  origin: "https://chaimint.netlify.app",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const allowedOrigins = (
  process.env.FRONTEND_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);


app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json({ limit: "100kb" }));


const bcrypt = require("bcryptjs");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const otpStore = new Map();
const otpRequests = new Map();

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Please login to continue",
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      shopName: user.shopName,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

// REGISTER: SEND OTP
app.post("/api/auth/register/request-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!validEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }
      if (
  !process.env.RESEND_API_KEY ||
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32
)
    {
      return res.status(500).json({
        success: false,
        message: "Email or authentication settings are missing",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please login.",
      });
    }

    const now = Date.now();
    const key = `register:${email}`;
    const previous = otpRequests.get(key);

    if (previous && now - previous.lastSent < 60_000) {
      return res.status(429).json({
        success: false,
        message: "Wait 60 seconds before requesting another OTP",
      });
    }

    const recent = (previous?.times || []).filter(
      (time) => now - time < 60 * 60 * 1000
    );

    if (recent.length >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests. Try again later.",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    otpStore.set(key, {
      otpHash,
      expiresAt: now + 5 * 60 * 1000,
      attempts: 0,
    });

    otpRequests.set(key, {
      lastSent: now,
      times: [...recent, now],
    });

    try {
     const { data, error } = await resend.emails.send({
  from: "ChaiMint <onboarding@resend.dev>",
  to: [email],
  subject: "Verify your ChaiMint registration",
  text: `Your ChaiMint registration OTP is ${otp}. It expires in 5 minutes. Do not share it.`,
});

if (error) {
  throw new Error(error.message);
}
    } catch (mailError) {
      otpStore.delete(key);
      console.error("Registration email failed:", mailError.message);

      return res.status(502).json({
        success: false,
        message: "Could not send OTP email. Check Resend API settings.",
      });
    }

    return res.json({
      success: true,
      message: "Registration OTP sent. It expires in 5 minutes.",
    });
  } catch (error) {
    console.error("Registration OTP error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not send registration OTP",
    });
  }
});

// REGISTER: VERIFY OTP AND CREATE ACCOUNT
app.post("/api/auth/register/verify-otp", async (req, res) => {
  try {
    const shopName = String(req.body.shopName || "").trim();
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const password = String(req.body.password || "");
    const key = `register:${email}`;

    if (!shopName || shopName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Enter a shop name (maximum 100 characters)",
      });
    }

    if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email and 6-digit OTP",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be 8–128 characters long",
      });
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(500).json({
        success: false,
        message: "Authentication settings are missing",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      otpStore.delete(key);
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please login.",
      });
    }

    const record = otpStore.get(key);

    if (!record || Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({
        success: false,
        message: "OTP expired. Request a new OTP.",
      });
    }

    record.attempts += 1;

    if (record.attempts > 5) {
      otpStore.delete(key);
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Request a new OTP.",
      });
    }

    const submittedHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const matches = crypto.timingSafeEqual(
      Buffer.from(record.otpHash, "hex"),
      Buffer.from(submittedHash, "hex")
    );

    if (!matches) {
      return res.status(400).json({
        success: false,
        message: "Incorrect OTP",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      shopName,
      email,
      passwordHash,
      isVerified: true,
    });

    otpStore.delete(key);

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        shopName: user.shopName,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
    }

    console.error("Registration error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not create account",
    });
  }
});

// LOGIN: EMAIL AND PASSWORD ONLY
app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!validEmail(email) || !password || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Enter your registered email and password",
      });
    }

    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);

    if (!matches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        shopName: user.shopName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not login",
    });
  }
});

// CURRENT USER
app.get("/api/auth/me", authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: { email: req.user.email },
  });
});

const validPaymentStatuses = ["Paid", "Pending"];

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "ChaiMint backend connected!",
  });
});

// PROTECT ALL BUSINESS APIS
app.use("/api/sales", authenticateToken);
app.use("/api/expenses", authenticateToken);
app.use("/api/customer-payments", authenticateToken);
app.use("/api/customer-balances", authenticateToken);
app.use("/api/reports", authenticateToken);

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

    const sale = await Sale.create({ userId: req.user.userId,
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




 // LIST SALES — only the logged-in user's sales
app.get("/api/sales", async (req, res) => {
  try {
    const sales = await Sale.find({
      userId: req.user.userId,
    }).sort({ createdAt: -1 });

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

    const sale = await Sale.findOne({
  _id: id,
  userId: req.user.userId,
});

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    
    if (sale.status === "Cancelled") {
      return res.status(409).json({
        success: false,
        message: "Cancelled sales cannot be edited.",
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

    // Preserve recorded customer payment history
    const linkedPayment = await CustomerPayment.findOne({
  userId: req.user.userId,
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




 // DELETE SALE — permanently delete sale and clean payment allocations
app.delete("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID",
      });
    }

    const sale = await Sale.findOne({
      _id: id,
      userId: req.user.userId,
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    // Find payments linked to this sale
    const payments = await CustomerPayment.find({
      userId: req.user.userId,
      "allocations.saleId": sale._id,
    });

    for (const payment of payments) {
      const removedAllocations = payment.allocations.filter(
        (allocation) =>
          allocation.saleId.toString() === sale._id.toString()
      );

      const removedAmount = removedAllocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0
      );

      // Remove only this sale's allocation
      payment.allocations = payment.allocations.filter(
        (allocation) =>
          allocation.saleId.toString() !== sale._id.toString()
      );

      // If no allocations remain, remove the payment record.
      // Otherwise, preserve the other allocations and adjust its amount.
      if (payment.allocations.length === 0) {
        await CustomerPayment.deleteOne({
          _id: payment._id,
          userId: req.user.userId,
        });
      } else {
        payment.amount = Math.round(
          (payment.amount - removedAmount) * 100
        ) / 100;

        if (payment.amount <= 0) {
          await CustomerPayment.deleteOne({
            _id: payment._id,
            userId: req.user.userId,
          });
        } else {
          await payment.save();
        }
      }
    }

    // Permanently remove the sale
    await Sale.deleteOne({
      _id: sale._id,
      userId: req.user.userId,
    });

    return res.json({
      success: true,
      message: "Sale permanently deleted successfully",
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

    const expense = await Expense.create({ ...values, userId: req.user.userId });

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
    const expenses = await Expense.find({ userId: req.user.userId }).sort({ createdAt: -1 });

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

   const expense = await Expense.findOneAndUpdate(
  {
    _id: id,
    userId: req.user.userId,
  },
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

    const expense = await Expense.findOneAndDelete({
  _id: id,
  userId: req.user.userId,
});

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



 // CREATE CUSTOMER PAYMENT — ignore cancelled sales
app.post("/api/customer-payments", async (req, res) => {
  try {
    const customerName =
      typeof req.body.customerName === "string"
        ? req.body.customerName.trim()
        : "";

    const amount = Number(req.body.amount);
    const notes =
      typeof req.body.notes === "string" ? req.body.notes : "";

    if (!customerName || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid customer name and payment amount are required",
      });
    }

    // Only active sales belonging to this logged-in user
    const customerSales = await Sale.find({
      userId: req.user.userId,
      status: { $ne: "Cancelled" },
    }).sort({ createdAt: 1 });

    const matchingSales = customerSales.filter(
      (sale) =>
        (sale.customerName || "Walk-in Customer")
          .trim()
          .toLowerCase() === customerName.toLowerCase()
    );

    const pendingSales = matchingSales
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
      userId: req.user.userId,
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
    const payments = await CustomerPayment.find({ userId: req.user.userId }).sort({
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


 // CUSTOMER BALANCES — exclude cancelled sales
app.get("/api/customer-balances", async (req, res) => {
  try {
    const sales = await Sale.find({
      userId: req.user.userId,
      status: { $ne: "Cancelled" },
    }).sort({ createdAt: -1 });

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



 // DAILY REPORT — exclude cancelled sales
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

    const ownerId = req.user.userId;

    const [sales, expenses, payments] = await Promise.all([
      Sale.find({
        userId: ownerId,
        status: { $ne: "Cancelled" },
        createdAt: { $gte: start, $lt: end },
      }),

      Expense.find({
        userId: ownerId,
        createdAt: { $gte: start, $lt: end },
      }),

      CustomerPayment.find({
        userId: ownerId,
        createdAt: { $gte: start, $lt: end },
      }),
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
