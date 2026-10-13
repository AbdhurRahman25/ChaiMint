const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  customerName: {
    type: String,
    trim: true,
    default: "Walk-in Customer",
  },
  teaQuantity: { type: Number, required: true, min: 1 },
  pricePerCup: { type: Number, required: true, min: 0 },
  biscuitQuantity: { type: Number, default: 0, min: 0 },
  biscuitPrice: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ["Paid", "Pending"],
    default: "Paid",
  },
  notes: { type: String, trim: true, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Sale", saleSchema);
