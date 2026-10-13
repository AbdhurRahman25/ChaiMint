import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { showToast } from "./Toast";

type Sale = {
  _id: string;
  customerName: string;
  teaQuantity: number;
  pricePerCup: number;
  teaTotal?: number;
  biscuitQuantity?: number;
  biscuitPrice?: number;
  biscuitTotal?: number;
  totalAmount: number;
  amountPaid?: number;
  paymentStatus: "Paid" | "Pending";
  notes?: string;
  createdAt: string;
};

type SalesListProps = {
  refreshKey: number;
};

const API_URL = "http://localhost:4000";

const inputClass =
  "mt-1 w-full min-w-0 rounded-lg border border-teal-800/80 bg-slate-950 px-2.5 py-2 text-sm text-gray-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20";

function money(value: number) {
  return `₹${value.toFixed(2)}`;
}

export default function SalesList({ refreshKey }: SalesListProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [teaQuantity, setTeaQuantity] = useState("");
  const [pricePerCup, setPricePerCup] = useState("10");
  const [biscuitQuantity, setBiscuitQuantity] = useState("0");
  const [biscuitPrice, setBiscuitPrice] = useState("5");
  const [paymentStatus, setPaymentStatus] =
    useState<"Paid" | "Pending">("Paid");
  const [amountPaid, setAmountPaid] = useState("0");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

 
const loadSales = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login with your email OTP first.");
    }

    const response = await fetch(`${API_URL}/api/sales`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load sales");
    }

    setSales(data.sales || []);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Could not load sales"
    );
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    void loadSales();
  }, [loadSales, refreshKey]);

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

  const enteredPaidAmount =
    paymentStatus === "Paid" ? totalAmount : Number(amountPaid);

  const validPaidAmount =
    Number.isFinite(enteredPaidAmount) &&
    enteredPaidAmount >= 0 &&
    enteredPaidAmount <= totalAmount;

  const pendingAmount = Math.max(0, totalAmount - enteredPaidAmount);

  function getSaleAmounts(sale: Sale) {
    const teaQty = Number(sale.teaQuantity || 0);
    const teaPrice = Number(sale.pricePerCup || 0);
    const biscuitQty = Number(sale.biscuitQuantity || 0);
    const biscuitUnitPrice = Number(sale.biscuitPrice || 0);

    const teaSum = Number(sale.teaTotal ?? teaQty * teaPrice);
    const biscuitSum = Number(
      sale.biscuitTotal ?? biscuitQty * biscuitUnitPrice
    );
    const total = Number(sale.totalAmount ?? teaSum + biscuitSum);

    const paid = Math.min(
      Math.max(
        0,
        Number(
          sale.amountPaid ??
          (sale.paymentStatus === "Paid" ? total : 0)
        )
      ),
      total
    );

    return {
      teaQty,
      teaPrice,
      teaSum,
      biscuitQty,
      biscuitUnitPrice,
      biscuitSum,
      total,
      paid,
      pending: Math.max(0, total - paid),
    };
  }

  function openEdit(sale: Sale) {
    const amounts = getSaleAmounts(sale);

    setEditingSale(sale);
    setCustomerName(sale.customerName || "");
    setTeaQuantity(String(sale.teaQuantity));
    setPricePerCup(String(sale.pricePerCup));
    setBiscuitQuantity(String(amounts.biscuitQty));
    setBiscuitPrice(String(amounts.biscuitUnitPrice));
    setPaymentStatus(amounts.pending <= 0 ? "Paid" : "Pending");
    setAmountPaid(String(amounts.paid));
  }

  function closeEdit() {
    if (saving) return;

    setEditingSale(null);
    setCustomerName("");
    setTeaQuantity("");
    setPricePerCup("10");
    setBiscuitQuantity("0");
    setBiscuitPrice("5");
    setPaymentStatus("Paid");
    setAmountPaid("0");
  }

  
  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingSale) return;

    if (!validTea || !validBiscuits) {
      showToast("Enter valid tea and biscuit quantity/price.", "error");
      return;
    }

    if (
      paymentStatus === "Pending" &&
      (amountPaid.trim() === "" ||
        !Number.isFinite(Number(amountPaid)) ||
        Number(amountPaid) < 0 ||
        Number(amountPaid) > totalAmount)
    ) {
      showToast(
        "Paid amount must be between ₹0 and the total amount.",
        "error"
      );
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      showToast("Please login again with your email OTP.", "error");
      return;
    }

    const finalPaidAmount =
      paymentStatus === "Paid" ? totalAmount : Number(amountPaid);

    const finalPaymentStatus: "Paid" | "Pending" =
      finalPaidAmount >= totalAmount ? "Paid" : "Pending";

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/sales/${editingSale._id}`,
        {
          method: "PUT",
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
            amountPaid: finalPaidAmount,
            paymentStatus: finalPaymentStatus,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        throw new Error("Login expired. Please logout and login again.");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not update sale");
      }

      setEditingSale(null);
      showToast("Sale updated successfully!", "success");
      await loadSales();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update sale",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }


  
  async function handleDelete(sale: Sale) {
    const amounts = getSaleAmounts(sale);

    const confirmed = window.confirm(
      `Delete sale for ${sale.customerName} (${money(amounts.total)})? This action cannot be undone.`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token) {
      showToast("Please login again with your email OTP.", "error");
      return;
    }

    setDeletingId(sale._id);

    try {
      const response = await fetch(
        `${API_URL}/api/sales/${sale._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        throw new Error("Login expired. Please logout and login again.");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not delete sale");
      }

      if (editingSale?._id === sale._id) {
        setEditingSale(null);
      }

      showToast("Sale deleted successfully!", "success");
      await loadSales();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete sale",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }


  return (
    <section className="mt-6 w-full rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-xl shadow-black/10 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-emerald-400">
            TRANSACTIONS
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Sales History
          </h2>
        </div>

        <button
          type="button"
          className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
          onClick={() => void loadSales()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <p className="rounded-lg bg-gray-950 p-4 text-sm text-gray-400">
          Loading sales...
        </p>
      ) : error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 font-semibold underline underline-offset-4"
            onClick={() => void loadSales()}
          >
            Retry
          </button>
        </div>
      ) : sales.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-sm text-gray-400">
          No sales recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-gray-950 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Tea Cups / Biscuits</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Paid</th>
                <th className="px-3 py-3">Pending</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-800">
              {sales.map((sale) => {
                const amounts = getSaleAmounts(sale);

                return (
                  <tr
                    key={sale._id}
                    className="transition hover:bg-gray-800/50"
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-gray-400">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-3 py-3 font-medium text-white">
                      {sale.customerName}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2">
                        <span className="font-bold text-emerald-400">
                          {amounts.teaQty}
                        </span>
                        <span className="text-gray-500">/</span>
                        <span className="font-bold text-amber-300">
                          {amounts.biscuitQty}
                        </span>
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-white">
                      {money(amounts.total)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-emerald-400">
                      {money(amounts.paid)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-amber-300">
                      {money(amounts.pending)}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${amounts.pending <= 0
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-300"
                          }`}
                      >
                        {amounts.pending <= 0 ? "Paid" : "Pending"}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(sale)}
                          disabled={deletingId !== null}
                          className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(sale)}
                          disabled={deletingId !== null}
                          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {deletingId === sale._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-sale-title"
            className="my-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-2xl sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-emerald-400">
                  SALES MANAGEMENT
                </p>
                <h3
                  id="edit-sale-title"
                  className="mt-1 text-xl font-bold text-white"
                >
                  Edit Sale
                </h3>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                aria-label="Close edit form"
                className="rounded-lg px-3 py-1 text-xl text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-300">
                  Customer Name
                </label>
                <input
                  className={inputClass}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Customer Name..."
                />
              </div>

              <div className="rounded-xl border border-teal-800/70 bg-slate-950/50 p-3">
                <h4 className="mb-2 text-sm font-semibold text-emerald-300">
                  Tea Details
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-300">
                      Tea Cups
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={teaQuantity}
                      onChange={(event) =>
                        setTeaQuantity(event.target.value)
                      }
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
                      onChange={(event) =>
                        setPricePerCup(event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-800/70 bg-slate-950/50 p-3">
                <h4 className="mb-2 text-sm font-semibold text-amber-300">
                  Biscuit Details
                </h4>

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
                      onChange={(event) =>
                        setBiscuitPrice(event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300">
                  Payment Status
                </label>
                <select
                  className={inputClass}
                  value={paymentStatus}
                  onChange={(event) => {
                    const status = event.target.value as
                      | "Paid"
                      | "Pending";

                    setPaymentStatus(status);

                    if (status === "Paid") {
                      setAmountPaid(String(totalAmount));
                    }
                  }}
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              {paymentStatus === "Pending" && (
                <div>
                  <label className="text-xs font-medium text-gray-300">
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
                    onChange={(event) =>
                      setAmountPaid(event.target.value)
                    }
                    placeholder="Amount received"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-gray-700 bg-gray-950 p-2">
                  <p className="text-xs text-gray-400">Tea</p>
                  <p className="mt-1 text-sm font-bold text-emerald-400">
                    {money(teaTotal)}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-700 bg-gray-950 p-2">
                  <p className="text-xs text-gray-400">Biscuits</p>
                  <p className="mt-1 text-sm font-bold text-amber-300">
                    {money(biscuitTotal)}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-700 bg-gray-950 p-2">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {money(totalAmount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="text-xs text-emerald-300">Paid</p>
                  <p className="mt-1 font-bold text-emerald-400">
                    {money(enteredPaidAmount || 0)}
                  </p>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs text-amber-300">Pending</p>
                  <p className="mt-1 font-bold text-amber-300">
                    {money(pendingAmount)}
                  </p>
                </div>
              </div>

              {paymentStatus === "Pending" && !validPaidAmount && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  Paid amount ₹0 முதல் ₹{totalAmount.toFixed(2)} வரை இருக்க வேண்டும்.
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  className="w-full rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !validTea ||
                    !validBiscuits ||
                    (paymentStatus === "Pending" && !validPaidAmount)
                  }
                  className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-gray-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
