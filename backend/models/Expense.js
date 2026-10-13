const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  category: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, default: 1, min: 0.01 },
  amount: { type: Number, required: true, min: 0.01 },
  totalAmount: { type: Number, min: 0.01 },
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);
