import { useEffect, useState } from "react";

type DailyReportData = {
  success: boolean;
  date: string;
  salesCount: number;
  totalSales: number;
  totalExpenses: number;
  customerPaymentsReceived: number;
  estimatedDifference: number;
};

const API_URL = "https://chaimint.onrender.com";

function DailyReport() {
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReport(selectedDate: string) {
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Login session missing. Please login again.");
      }

      const response = await fetch(
        `${API_URL}/api/reports/daily?date=${encodeURIComponent(selectedDate)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        throw new Error(
          "Login session expired or invalid. Please login again."
        );
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Report load failed");
      }

      setReport(data);
    } catch (error) {
      setReport(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load daily report"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport(date);
  }, [date]);

  const money = (value: number) =>
    `₹${Number(value || 0).toFixed(2)}`;

  const reportCards = report
    ? [
        {
          label: "Total Sales",
          value: money(report.totalSales),
          detail: `${report.salesCount} sales recorded`,
          valueClass: "text-emerald-400",
        },
        {
          label: "Payments Received",
          value: money(report.customerPaymentsReceived),
          detail: "Customer payments received",
          valueClass: "text-sky-400",
        },
        {
          label: "Total Expenses",
          value: money(report.totalExpenses),
          detail: "Shop expenses for the selected date",
          valueClass: "text-rose-400",
        },
        {
          label: "Estimated Difference",
          value: money(report.estimatedDifference),
          detail: "Sales minus expenses",
          valueClass: "text-amber-300",
        },
      ]
    : [];

  return (
    <section className="w-full rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl shadow-black/10 sm:p-6">
      <p className="text-sm font-medium text-emerald-400">
        BUSINESS OVERVIEW
      </p>

      <h2 className="mt-1 text-2xl font-bold text-white">
        Daily Report
      </h2>

      <p className="mt-1 text-sm text-gray-400">
        Review sales, customer payments and expenses by date.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-300">
            Select Date
          </label>

          <input
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-gray-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={() => void loadReport(date)}
          disabled={loading}
          className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Report"}
        </button>
      </div>

      {loading && (
        <p className="mt-5 text-sm text-gray-400">
          Loading report...
        </p>
      )}

      {message && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {message}
        </p>
      )}

      {report && !loading && (
        <>
          <p className="mt-5 text-sm text-gray-400">
            Report date:{" "}
            <span className="font-medium text-gray-200">
              {report.date}
            </span>
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {reportCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-gray-800 bg-gray-950 p-4"
              >
                <p className="text-sm text-gray-400">
                  {card.label}
                </p>

                <p
                  className={`mt-2 text-2xl font-bold ${card.valueClass}`}
                >
                  {card.value}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  {card.detail}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs leading-5 text-gray-500">
            Estimated difference is total sales minus expenses. It is not
            necessarily net profit and does not automatically account for all
            cash movements.
          </p>
        </>
      )}
    </section>
  );
}

export default DailyReport;
