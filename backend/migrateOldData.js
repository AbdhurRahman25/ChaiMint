require("dotenv").config();
const mongoose = require("mongoose");

const Sale = require("./models/sale");
const Expense = require("./models/Expense");
const CustomerPayment = require("./models/CustomerPayment");
const User = require("./models/user");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = "arba6304@gmail.com";
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error(
        `Account ${email} not found. Register or verify the email first.`
      );
    }

    const owner = user._id;

    const sales = await Sale.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: owner } }
    );

    const expenses = await Expense.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: owner } }
    );

    const payments = await CustomerPayment.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: owner } }
    );

    console.log("Legacy data migration completed.");
    console.log("Owner:", email);
    console.log("Sales:", sales.modifiedCount);
    console.log("Expenses:", expenses.modifiedCount);
    console.log("Customer payments:", payments.modifiedCount);
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
