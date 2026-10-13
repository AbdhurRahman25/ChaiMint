import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { showToast } from "./Toast";

type Expense = {
  _id: string;
  category: string;
  quantity?: number;
  amount: number;
  totalAmount?: number;
  description?: string;
  createdAt: string;
};

const API_URL = "http://localhost:4000";

const inputClass =
  "mt-1 w-full min-w-0 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-gray-100 outline-none placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

function formatWords(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|\s)([a-z])/g, (_, space: string, letter: string) =>
      space + letter.toUpperCase()
    );
}

function handleEnterToNext(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;

  event.preventDefault();

  const form = event.currentTarget.form;
  if (!form) return;

  const elements = Array.from(form.elements).filter(
    (element): element is HTMLInputElement | HTMLButtonElement =>
      (element instanceof HTMLInputElement ||
        element instanceof HTMLButtonElement) &&
      !element.disabled &&
      element.type !== "hidden" &&
      element.type !== "submit"
  );

  const currentIndex = elements.indexOf(event.currentTarget);
  const nextElement = elements[currentIndex + 1];

  if (nextElement) {
    nextElement.focus();
  } else {
    form.requestSubmit();
  }
}

function Expenses() {
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  
  async function loadExpenses() {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please login again with your email OTP.");
      }

      const response = await fetch(`${API_URL}/api/expenses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        throw new Error("Login expired. Please login again.");
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to load expenses");
      }

      setExpenses(data.expenses || []);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Expenses load aagala.",
        "error"
      );
    }
  }


  useEffect(() => {
    void loadExpenses();
  }, []);

  const numericQuantity = Number(quantity);
  const numericAmount = Number(amount);

  const validQuantity =
    quantity.trim() !== "" &&
    Number.isInteger(numericQuantity) &&
    numericQuantity > 0;

  const validAmount =
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0;

  const totalForEntry =
    validQuantity && validAmount
      ? Math.round(numericQuantity * numericAmount * 100) / 100
      : 0;

  const totalExpenses = expenses.reduce(
    (sum, expense) =>
      sum +
      Number(
        expense.totalAmount ??
          Number(expense.quantity ?? 1) * Number(expense.amount ?? 0)
      ),
    0
  );

  function startEdit(expense: Expense) {
    setEditingId(expense._id);
    setEditCategory(expense.category);
    setEditQuantity(String(expense.quantity ?? 1));
    setEditAmount(String(expense.amount));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditCategory("");
    setEditQuantity("");
    setEditAmount("");
  }

  async function saveEdit(id: string) {
    const formattedCategory = formatWords(editCategory.trim());
    const qty = Number(editQuantity);
    const unitAmount = Number(editAmount);

    if (!formattedCategory) {
      showToast("Expense category enter pannunga.", "error");
      return;
    }

    if (
      editQuantity.trim() === "" ||
      !Number.isInteger(qty) ||
      qty <= 0 ||
      editAmount.trim() === "" ||
      !Number.isFinite(unitAmount) ||
      unitAmount <= 0
    ) {
      showToast("Valid quantity and amount enter pannunga.", "error");
      return;
    }

    setSavingEdit(true);
     
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login again with your email OTP.");
    }

    const response = await fetch(`${API_URL}/api/expenses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        category: formattedCategory,
        quantity: qty,
        amount: unitAmount,
        totalAmount: Math.round(qty * unitAmount * 100) / 100,
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      throw new Error("Login expired. Please login again.");
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Expense update failed");
    }

    cancelEdit();
    showToast("Expense updated successfully!", "success");
    await loadExpenses();
  } catch (error) {
    showToast(
      error instanceof Error ? error.message : "Expense update failed.",
      "error"
    );
  } finally {
    setSavingEdit(false);
  }

};

  
  async function deleteExpense(id: string) {
    const confirmed = window.confirm(
      "Indha expense-ai delete pannava? Indha action-ai undo panna mudiyadhu."
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token) {
      showToast("Please login again with your email OTP.", "error");
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`${API_URL}/api/expenses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        throw new Error("Login expired. Please login again.");
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Expense delete failed");
      }

      if (editingId === id) {
        cancelEdit();
      }

      showToast("Expense deleted successfully!", "success");
      await loadExpenses();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Expense delete failed.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }


  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formattedCategory = formatWords(category.trim());

    if (!formattedCategory) {
      showToast("Expense category enter pannunga.", "error");
      return;
    }

    if (!validQuantity) {
      showToast("Valid quantity enter pannunga.", "error");
      return;
    }

    if (!validAmount) {
      showToast("Valid amount per quantity enter pannunga.", "error");
      return;
    }

    setLoading(true);

    
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login again with your email OTP.");
    }

    const response = await fetch(`${API_URL}/api/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        category: formattedCategory,
        quantity: numericQuantity,
        amount: numericAmount,
        totalAmount: totalForEntry,
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      throw new Error("Login expired. Please login again.");
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Failed to save expense");
    }

    setCategory("");
    setQuantity("");
    setAmount("");

    showToast("Expense saved successfully!", "success");
    await loadExpenses();
  } catch (error) {
    showToast(
      error instanceof Error ? error.message : "Expense save aagala.",
      "error"
    );
  } finally {
    setLoading(false);
  }

  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl shadow-black/10 sm:p-6">
        <p className="text-sm font-medium text-emerald-400">
          SHOP MANAGEMENT
        </p>

        <h2 className="mt-1 text-2xl font-bold text-white">
          Shop Expenses
        </h2>

        <p className="mt-1 text-sm text-gray-400">
          Record and track your shop spending.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300">
              Category
            </label>

            <input
              className={inputClass}
              type="text"
              value={category}
              onChange={(e) => setCategory(formatWords(e.target.value))}
              onKeyDown={handleEnterToNext}
              placeholder="Example: Milk, Tea Powder, Gas"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300">
              Quantity (Qty)
            </label>

            <input
              className={inputClass}
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyDown={handleEnterToNext}
              placeholder="Enter quantity"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300">
              Amount Per Qty (₹)
            </label>

            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={handleEnterToNext}
              placeholder="Enter amount for one quantity"
              required
            />
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300">
              Total Expense Preview
            </p>

            <p className="mt-1 text-2xl font-bold text-emerald-400">
              ₹{totalForEntry.toFixed(2)}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              {validQuantity ? numericQuantity : 0} Qty × ₹
              {validAmount ? numericAmount.toFixed(2) : "0.00"} per Qty
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !validQuantity || !validAmount}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Expense"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
        <p className="text-sm text-gray-400">Total Expenses</p>

        <p className="mt-2 text-3xl font-bold text-emerald-400">
          ₹{totalExpenses.toFixed(2)}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
        <h3 className="mb-4 text-xl font-bold text-white">
          Expense History
        </h3>

        {expenses.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-gray-400">
            No expenses recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-950 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Amount / Qty</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800">
                {expenses.map((expense) => {
                  const qty = Number(expense.quantity ?? 1);
                  const unitAmount = Number(expense.amount ?? 0);
                  const total = Number(
                    expense.totalAmount ?? qty * unitAmount
                  );

                  const isEditing = editingId === expense._id;

                  return (
                    <tr
                      key={expense._id}
                      className="hover:bg-gray-800/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                        {new Date(expense.createdAt).toLocaleDateString()}
                      </td>

                      {isEditing ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              className={inputClass}
                              value={editCategory}
                              onChange={(e) =>
                                setEditCategory(formatWords(e.target.value))
                              }
                              aria-label="Edit category"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              className={inputClass}
                              type="number"
                              min="1"
                              step="1"
                              value={editQuantity}
                              onChange={(e) =>
                                setEditQuantity(e.target.value)
                              }
                              aria-label="Edit quantity"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              className={inputClass}
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) =>
                                setEditAmount(e.target.value)
                              }
                              aria-label="Edit amount per quantity"
                            />
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-400">
                            ₹
                            {(
                              Math.max(0, Number(editQuantity) || 0) *
                              Math.max(0, Number(editAmount) || 0)
                            ).toFixed(2)}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={savingEdit}
                                onClick={() => void saveEdit(expense._id)}
                                className="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-gray-950 disabled:opacity-50"
                              >
                                {savingEdit ? "Saving..." : "Save"}
                              </button>

                              <button
                                type="button"
                                disabled={savingEdit}
                                onClick={cancelEdit}
                                className="rounded-lg border border-gray-600 px-3 py-2 text-gray-200 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-gray-200">
                            {expense.category}
                          </td>

                          <td className="px-4 py-3 text-gray-300">
                            {qty}
                          </td>

                          <td className="px-4 py-3 text-gray-300">
                            ₹{unitAmount.toFixed(2)}
                          </td>

                          <td className="px-4 py-3 font-semibold text-emerald-400">
                            ₹{total.toFixed(2)}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={
                                  editingId !== null || deletingId !== null
                                }
                                onClick={() => startEdit(expense)}
                                className="rounded-lg bg-blue-500/15 px-3 py-2 font-semibold text-blue-300 hover:bg-blue-500/25 disabled:opacity-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  editingId !== null || deletingId !== null
                                }
                                onClick={() => void deleteExpense(expense._id)}
                                className="rounded-lg bg-red-500/15 px-3 py-2 font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                              >
                                {deletingId === expense._id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default Expenses;