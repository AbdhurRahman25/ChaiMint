
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 0.01,
    },

    // Amount for one unit
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Total = quantity * amount
    totalAmount: {
      type: Number,
      min: 0.01,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Expense", expenseSchema);
