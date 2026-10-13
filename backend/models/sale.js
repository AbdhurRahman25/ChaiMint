
const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      trim: true,
      default: "Walk-in Customer",
    },

    // Tea details
    teaQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerCup: {
      type: Number,
      required: true,
      min: 0,
    },

    // Biscuit details
    biscuitQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    biscuitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tea total + biscuit total
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Paid",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Sale", saleSchema);
