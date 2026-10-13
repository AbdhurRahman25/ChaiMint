import { useEffect, useMemo, useState, type FormEvent } from "react";

type CustomerBalance = {
  customerName: string;
  totalSales: number;
  totalPaid: number;
  balance: number;
};

type CustomerPayment = {
  _id: string;
  customerName: string;
  amount: number;
  notes: string;
  createdAt: string;
};

const API_URL = "http://localhost:4000";

const inputClass =
  "mt-1 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-3 text-gray-100 outline-none placeholder:text-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function CustomerBalances() {
  const [customers, setCustomers] = useState<CustomerBalance[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  async function loadData() {
    try {
      const [balanceResponse, paymentResponse] = await Promise.all([
        fetch(`${API_URL}/api/customer-balances`),
        fetch(`${API_URL}/api/customer-payments`),
      ]);

      const balanceData = await balanceResponse.json();
      const paymentData = await paymentResponse.json();

      if (!balanceResponse.ok || !paymentResponse.ok) {
        throw new Error("Customer data load aagala.");
      }

      setCustomers(
        Array.isArray(balanceData.customers) ? balanceData.customers : []
      );
      setPayments(
        Array.isArray(paymentData.payments) ? paymentData.payments : []
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Backend running-a check pannunga."
      );
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) =>
          customer.customerName.toLowerCase() === customerName.toLowerCase()
      ),
    [customers, customerName]
  );

  const totalPending = customers.reduce(
    (sum, customer) => sum + Math.max(0, Number(customer.balance || 0)),
    0
  );

  const customersWithBalance = customers.filter(
    (customer) => Number(customer.balance || 0) > 0
  ).length;

 const filteredCustomers = customers.filter(
  (customer) =>
    Number(customer.balance || 0) > 0 &&
    customer.customerName
      .toLowerCase()
      .includes(search.toLowerCase().trim())
);

  const customerPayments = useMemo(() => {
    if (!customerName) return [];

    return payments
      .filter(
        (payment) =>
          payment.customerName.toLowerCase() === customerName.toLowerCase()
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [payments, customerName]);

  async function handlePayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    const numericAmount = Number(amount);

    if (!customerName.trim()) {
      setIsError(true);
      setMessage("Customer-ai select pannunga.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setIsError(true);
      setMessage("Valid payment amount enter pannunga.");
      return;
    }

    if (!selectedCustomer) {
      setIsError(true);
      setMessage("Selected customer details kidaikkala.");
      return;
    }

    if (numericAmount > Number(selectedCustomer.balance || 0)) {
      setIsError(true);
      setMessage("Payment amount pending balance-ai vida adhigama irukku.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/customer-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: selectedCustomer.customerName,
          amount: numericAmount,
          notes: notes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Payment save aagala.");
      }

      setAmount("");
      setNotes("");
      setIsError(false);
      setMessage("Payment successfully recorded!");

      await loadData();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Payment save aagala."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full space-y-6 text-gray-100">
      {/* Page heading */}
      <div>
        <p className="text-xs font-bold tracking-[0.2em] text-emerald-400">
          CHAIMINT · CUSTOMER ACCOUNTS
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          Customer Credit
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Manage customer credit, outstanding balances, and payments.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-gray-900 p-5">
          <p className="text-sm text-gray-400">Total Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">
            {money(totalPending)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Total amount to be collected from customers
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-sm text-gray-400">Customers with Balance</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {customersWithBalance}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Customers with outstanding balances
          </p>
        </div>
      </div>

      {/* Customer accounts */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              Customer Accounts
            </h2>
            <p className="mt-1 text-sm text-gray-400">
            View each customer's credit details.
            </p>
          </div>

          <input
            className={`${inputClass} sm:max-w-xs`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer..."
            aria-label="Search customer"
          />
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full min-w-[580px] text-left text-sm">
            <thead className="bg-gray-950 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total Sales</th>
                <th className="px-4 py-3">Total Paid</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-800">
              {filteredCustomers.map((customer) => {
                const pending = Number(customer.balance || 0);

                return (
                  <tr
                    key={customer.customerName.toLowerCase()}
                    className="transition hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-4 font-semibold text-white">
                      {customer.customerName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-300">
                      {money(customer.totalSales)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-emerald-400">
                      {money(customer.totalPaid)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-bold text-amber-300">
                      {money(pending)}
                    </td>
                    <td className="px-4 py-4">
                      {pending > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerName(customer.customerName);
                            setAmount("");
                            setNotes("");
                            setMessage("");
                            setIsError(false);
                          }}
                          className="whitespace-nowrap rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-gray-950 transition hover:bg-emerald-400"
                        >
                          Record Payment
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-emerald-400">
                          Cleared
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!dataLoading && filteredCustomers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {search
                      ? "Matching customer kidaikkala."
                      : "Customer sales innum illai."}
                  </td>
                </tr>
              )}

              {dataLoading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Loading customer accounts...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record payment */}
      <div
        id="record-customer-payment"
        className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6"
      >
        <p className="text-xs font-bold tracking-widest text-emerald-400">
          PAYMENT COLLECTION
        </p>
        <h2 className="mt-2 text-xl font-bold text-white">
          Record Customer Payment
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Record full or partial payments received from customers.
        </p>

        <form onSubmit={handlePayment} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="credit-customer"
              className="text-sm font-medium text-gray-300"
            >
              Customer Name
            </label>
            <select
              id="credit-customer"
              className={inputClass}
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setAmount("");
                setMessage("");
                setIsError(false);
              }}
              required
            >
              <option value="">Select customer</option>
              {customers
  .filter((customer) => Number(customer.balance || 0) > 0)
  .map((customer) => (
    <option
      key={customer.customerName.toLowerCase()}
      value={customer.customerName}
    >
      {customer.customerName} — ₹
      {Number(customer.balance || 0).toFixed(2)} pending
    </option>
  ))}
    
            </select>
          </div>

          {selectedCustomer && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-700 bg-gray-950 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Total Sales</p>
                <p className="mt-1 font-semibold text-white">
                  {money(selectedCustomer.totalSales)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Paid</p>
                <p className="mt-1 font-semibold text-emerald-400">
                  {money(selectedCustomer.totalPaid)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Remaining Balance</p>
                <p className="mt-1 font-bold text-amber-300">
                  {money(selectedCustomer.balance)}
                </p>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="credit-amount"
              className="text-sm font-medium text-gray-300"
            >
              Payment Amount (₹)
            </label>
            <input
              id="credit-amount"
              className={inputClass}
              type="number"
              min="0.01"
              max={selectedCustomer ? Math.max(0, selectedCustomer.balance) : undefined}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount received"
              required
            />
            {selectedCustomer && (
              <p className="mt-1 text-xs text-gray-500">
                Maximum pending: {money(selectedCustomer.balance)}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="credit-notes"
              className="text-sm font-medium text-gray-300"
            >
              Notes (Optional)
            </label>
            <input
              id="credit-notes"
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example: Cash payment"
            />
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !selectedCustomer ||
              Number(selectedCustomer.balance) <= 0
            }
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving Payment..." : "Save Payment"}
          </button>
        </form>

        {message && (
          <p
            role="status"
            className={`mt-4 rounded-xl border p-3 text-sm ${
              isError
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      {/* Selected customer payment history */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Payment History</h2>
            <p className="mt-1 text-sm text-gray-400">
              {customerName
                ? `${customerName} - recorded payments`
                : "ஒரு customer-ஐ தேர்வு செய்தால் அவருடைய payment history தெரியும்."}
            </p>
          </div>

          {customerName && (
            <button
              type="button"
              onClick={() => setCustomerName("")}
              className="mt-2 self-start rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 transition hover:bg-gray-800 sm:mt-0"
            >
              Clear Selection
            </button>
          )}
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="bg-gray-950 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {customerPayments.map((payment) => (
                <tr key={payment._id} className="hover:bg-gray-800/50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                    {new Date(payment.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-gray-200">
                    {payment.customerName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-emerald-400">
                    {money(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {payment.notes || "-"}
                  </td>
                </tr>
              ))}

              {customerName && customerPayments.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No payment history found for this customer.
                  </td>
                </tr>
              )}

              {!customerName && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-gray-500"
                  >
Select a customer above to view their payment history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default CustomerBalances;
