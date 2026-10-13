const mongoose = require("mongoose");

const customerPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  customerName: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  notes: { type: String, trim: true, default: "" },
  allocations: [{
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
  }],
}, { timestamps: true });

module.exports = mongoose.model("CustomerPayment", customerPaymentSchema);
