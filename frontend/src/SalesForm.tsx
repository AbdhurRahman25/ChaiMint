import { useState, type FormEvent } from "react";
import { showToast } from "./Toast";
import { handleEnterToNext } from "./enterNavigation";

type SalesFormProps = {
  onSaleSaved: () => void;
};

const inputClass =
  "mt-1 w-full min-w-0 rounded-lg border border-teal-800/80 bg-slate-950 px-2.5 py-2 text-sm text-gray-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20";

function formatCustomerName(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|\s)([a-z])/g, (_, space, letter) =>
      space + letter.toUpperCase()
    );
}

export default function SalesForm({ onSaleSaved }: SalesFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [teaQuantity, setTeaQuantity] = useState("1");
  const [pricePerCup, setPricePerCup] = useState("10");

  const [biscuitQuantity, setBiscuitQuantity] = useState("0");
  const [biscuitPrice, setBiscuitPrice] = useState("5");

  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Pending">(
    "Paid"
  );
  const [amountPaid, setAmountPaid] = useState("");
  const [saving, setSaving] = useState(false);

  const quantity = Number(teaQuantity);
  const price = Number(pricePerCup);
  const biscuits = Number(biscuitQuantity);
  const biscuitUnitPrice = Number(biscuitPrice);

  const validTea =
    teaQuantity.trim() !== "" &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    pricePerCup.trim() !== "" &&
    Number.isFinite(price) &&
    price >= 0;

  const validBiscuits =
    biscuitQuantity.trim() !== "" &&
    Number.isInteger(biscuits) &&
    biscuits >= 0 &&
    biscuitPrice.trim() !== "" &&
    Number.isFinite(biscuitUnitPrice) &&
    biscuitUnitPrice >= 0;

  const teaTotal = validTea ? quantity * price : 0;
  const biscuitTotal = validBiscuits ? biscuits * biscuitUnitPrice : 0;
  const totalAmount = teaTotal + biscuitTotal;

  const paidAmount =
    paymentStatus === "Paid" ? totalAmount : Number(amountPaid || 0);

  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validTea || !validBiscuits) {
      showToast("Valid tea and biscuit quantity/price enter pannunga.", "error");
      return;
    }

    const enteredPaidAmount =
      paymentStatus === "Paid" ? totalAmount : Number(amountPaid || 0);

    if (
      !Number.isFinite(enteredPaidAmount) ||
      enteredPaidAmount < 0 ||
      enteredPaidAmount > totalAmount
    ) {
      showToast(
        "Paid amount total amount-kulla irukkanum.",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
     
const token = localStorage.getItem("token");

if (!token) {
  showToast("Please login with your email OTP first.", "error");
  return;
}

const response = await fetch("http://localhost:4000/api/sales", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({

          customerName: customerName.trim() || "Walk-in Customer",

          teaQuantity: quantity,
          pricePerCup: price,
          teaTotal,

          biscuitQuantity: biscuits,
          biscuitPrice: biscuitUnitPrice,
          biscuitTotal,

          totalAmount,
          paymentStatus:
            enteredPaidAmount >= totalAmount ? "Paid" : "Pending",
          amountPaid: enteredPaidAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Could not save sale.");
      }

      showToast("Sale saved successfully!", "success");

      setCustomerName("");
      setTeaQuantity("1");
      setPricePerCup("10");
      setBiscuitQuantity("0");
      setBiscuitPrice("5");
      setPaymentStatus("Paid");
      setAmountPaid("");

      onSaleSaved();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Backend connection failed.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-xl shadow-black/10 sm:p-5">
      <div className="mb-4">
        <p className="text-xs font-medium text-emerald-400">
          SALES MANAGEMENT
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">
          Add Sale
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Tea and biscuits sales entry
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={handleEnterToNext}
        className="space-y-3"
      >
        <div>
          <label className="text-xs font-medium text-gray-300">
            Customer Name
          </label>
          <input
            className={inputClass}
            value={customerName}
            onChange={(event) =>
              setCustomerName(formatCustomerName(event.target.value))
            }
            placeholder="Walk-in customer"
          />
        </div>

        <div className="rounded-xl border border-teal-800/70 bg-slate-950/50 p-3">
          <h3 className="mb-2 text-sm font-semibold text-emerald-300">
            Tea Details
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-300">
                Tea Quantity (cups)
              </label>
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                required
                value={teaQuantity}
                onChange={(event) => setTeaQuantity(event.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-gray-300">
                Price / Cup (₹)
              </label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                required
                value={pricePerCup}
                onChange={(event) => setPricePerCup(event.target.value)}
              />
            </div>
          </div>

          <p className="mt-2 text-right text-sm text-gray-300">
            Tea Total:{" "}
            <span className="font-semibold text-emerald-400">
              ₹{teaTotal.toFixed(2)}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-amber-800/70 bg-slate-950/50 p-3">
          <h3 className="mb-2 text-sm font-semibold text-amber-300">
            Biscuit Details
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-300">
                Biscuit Quantity
              </label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="1"
                required
                value={biscuitQuantity}
                onChange={(event) =>
                  setBiscuitQuantity(event.target.value)
                }
              />
            </div>

            <div>
              <label className="text-xs text-gray-300">
                Price / Biscuit (₹)
              </label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                required
                value={biscuitPrice}
                onChange={(event) => setBiscuitPrice(event.target.value)}
              />
            </div>
          </div>

          <p className="mt-2 text-right text-sm text-gray-300">
            Biscuit Total:{" "}
            <span className="font-semibold text-amber-300">
              ₹{biscuitTotal.toFixed(2)}
            </span>
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-300">
            Payment Status
          </label>
          <select
            className={inputClass}
            value={paymentStatus}
            onChange={(event) => {
              const newStatus = event.target.value as "Paid" | "Pending";
              setPaymentStatus(newStatus);

              if (newStatus === "Paid") {
                setAmountPaid("");
              }
            }}
          >
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {paymentStatus === "Pending" && (
          <div>
            <label className="text-xs font-medium text-emerald-300">
              Amount Customer Paid (₹)
            </label>
            <input
              className={inputClass}
              type="number"
              min="0"
              max={totalAmount}
              step="0.01"
              required
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              placeholder="Amount received"
            />
            <p className="mt-1 text-xs text-gray-400">
              Customer pay pannala-na 0 enter pannunga.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="text-xs text-emerald-300">Total Amount</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">
              ₹{totalAmount.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs text-amber-300">Pending Amount</p>
            <p className="mt-1 text-xl font-bold text-amber-400">
              ₹{pendingAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {paymentStatus === "Pending" && (
          <p className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-2 text-xs text-sky-200">
            Amount Received: ₹{paidAmount.toFixed(2)}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !validTea || !validBiscuits}
          className="w-full rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Sale"}
        </button>
      </form>
    </section>
  );
}
