
import { useState, useEffect } from "react";
import type { ReactNode } from "react";

import SalesForm from "./SalesForm";
import SalesList from "./SalesList";
import Expenses from "./Expenses";
import CustomerBalances from "./CustomerBalances";
import DailyReport from "./DailyReport";
import ChaimintLogo from "./ChaimintLogo";
import "./App.css";
import ToastContainer from "./Toast";
import Login from "./Login";

type Page =
  | "Dashboard"
  | "Sales"
  | "Expenses"
  | "Customers"
  | "Reports";

const menuItems: { label: Page; icon: string }[] = [
  { label: "Dashboard", icon: "▦" },
  { label: "Sales", icon: "☕" },
  { label: "Expenses", icon: "₹" },
  { label: "Customers", icon: "♙" },
  { label: "Reports", icon: "▥" },
];

function App() {
  const [page, setPage] = useState<Page>("Dashboard");

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem("token"))
  );

  const [userEmail, setUserEmail] = useState(
    () => localStorage.getItem("userEmail") || ""
  );

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [page]);

  function navigateTo(nextPage: Page) {
    setPage(nextPage);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function handleLoginSuccess(token: string, email: string) {
    localStorage.setItem("token", token);
    localStorage.setItem("userEmail", email);
    setUserEmail(email);
    setIsLoggedIn(true);
    setPage("Dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setUserEmail("");
    setIsLoggedIn(false);
    setPage("Dashboard");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function handleSaleSaved() {
    setRefreshKey((previous) => previous + 1);
  }

  const dashboardCards: {
    title: string;
    description: string;
    icon: ReactNode;
    target: Page;
  }[] = [
    {
      title: "Sales Management",
      description: "Record tea sales and view sales history.",
      icon: <ChaimintLogo size={44} />,
      target: "Sales",
    },
    {
      title: "Shop Expenses",
      description: "Track milk, sugar, rent and other costs.",
      icon: <span className="text-4xl font-semibold text-teal-300">₹</span>,
      target: "Expenses",
    },
    {
      title: "Customer Balances",
      description: "Review pending balances and record payments.",
      icon: <span className="text-4xl text-teal-200">♙</span>,
      target: "Customers",
    },
    {
      title: "Daily Reports",
      description: "Review daily sales and expenses.",
      icon: <span className="text-4xl text-teal-300">▥</span>,
      target: "Reports",
    },
  ];

  function renderPage() {
    switch (page) {
      case "Sales":
        return (
          <div className="space-y-6">
            <SalesForm onSaleSaved={handleSaleSaved} />
            <SalesList refreshKey={refreshKey} />
          </div>
        );

      case "Expenses":
        return <Expenses />;

      case "Customers":
        return <CustomerBalances />;

      case "Reports":
        return <DailyReport />;

      default:
        return (
          <div className="space-y-6">
            <section className="relative min-h-[310px] overflow-hidden rounded-2xl border border-emerald-900 bg-gradient-to-r from-[#031a1c] via-[#062b28] to-[#031a1c] p-6 shadow-xl sm:min-h-[290px] sm:p-8">
              <div className="relative z-10 max-w-2xl pr-20 sm:pr-0">
                <p className="font-semibold text-emerald-400">
                  Welcome to your shop dashboard
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    ChaiMint
                  </h1>
                  <span className="text-4xl text-emerald-400">🍃</span>
                </div>

                <p className="mt-3 text-base text-slate-400 sm:text-lg">
                  Manage your sales, expenses and customer balances.
                </p>

                <button
                  onClick={() => navigateTo("Sales")}
                  className="mt-6 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-gray-950 transition hover:bg-emerald-400 sm:px-6"
                >
                  + Add New Sale
                </button>
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 right-2 flex select-none items-end justify-center sm:right-4"
              >
                <div className="relative flex h-36 w-32 items-end justify-center sm:h-56 sm:w-64">
                  <div className="absolute bottom-24 right-12 text-4xl text-emerald-300/30 sm:bottom-28 sm:right-24 sm:text-5xl">
                    〰
                  </div>

                  <div className="relative mb-4 flex h-20 w-16 items-center justify-center rounded-b-3xl rounded-t-xl border-4 border-amber-700 bg-gradient-to-r from-amber-700 via-amber-400 to-orange-300 shadow-2xl sm:mb-5 sm:h-32 sm:w-28">
                    <div className="absolute -top-2 h-4 w-full rounded-[50%] border-4 border-amber-800 bg-amber-100 sm:h-5" />
                    <div className="mt-2 h-12 w-10 rounded-b-2xl rounded-t-lg bg-gradient-to-r from-orange-700 via-amber-800 to-orange-600 sm:h-20 sm:w-16" />
                    <div className="absolute -right-5 top-6 h-8 w-7 rounded-r-full border-[5px] border-amber-600 sm:-right-7 sm:top-9 sm:h-12 sm:w-10 sm:border-[7px]" />
                  </div>

                  <div className="absolute bottom-1 right-0 rotate-[-25deg] text-4xl text-emerald-500 sm:text-6xl">
                    🍃
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardCards.map((item) => (
                <button
                  key={item.title}
                  onClick={() => navigateTo(item.target)}
                  className="group rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#080f1c] p-5 text-left shadow-lg transition duration-200 hover:-translate-y-1 hover:border-emerald-700 hover:bg-slate-900"
                >
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-emerald-950">
                    {item.icon}
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>

                  <p className="mt-5 font-semibold text-emerald-400">
                    Open section&nbsp; →
                  </p>
                </button>
              ))}
            </section>

            <section className="flex gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-[#080f1c] p-5 sm:p-7">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-3xl text-emerald-400">
                ♧
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">
                  Quick Overview
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                  Select Sales to record a transaction, Expenses to enter
                  shop costs, Customers to manage pending balances, or
                  Reports to review a selected day's totals.
                </p>
              </div>
            </section>
          </div>
        );
    }
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const firstLetter = (userEmail.trim().charAt(0) || "C").toUpperCase();

  return (
    <div className="min-h-screen bg-[#030914] text-slate-100">
      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#07111f]/95 shadow-lg backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 px-3 py-3 sm:px-5 lg:px-8">
          {/* Account area */}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:gap-3">
            <div
              title={userEmail || "ChaiMint account"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-700 text-lg font-bold text-white"
            >
              {firstLetter}
            </div>

            <span
              title={userEmail}
              className="max-w-[150px] truncate text-xs font-medium text-emerald-200 sm:max-w-[220px] sm:text-sm"
            >
              {userEmail || "Shop Workspace"}
            </span>

            <button
              onClick={() => navigateTo("Dashboard")}
              className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 sm:px-3 sm:text-sm"
              aria-label="Go back to dashboard"
              title="Back to Dashboard"
            >
              ← <span className="hidden sm:inline">Back</span>
            </button>

            <button
              onClick={handleLogout}
              className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-red-800 hover:bg-red-950/50 sm:px-3 sm:text-sm"
            >
              <span className="sm:hidden">↪</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Page navigation */}
          <nav
            aria-label="Main navigation"
            className="flex w-full items-stretch gap-1 overflow-x-auto border-t border-slate-800/70 pt-2 sm:w-auto sm:flex-1 sm:justify-end sm:gap-2 sm:border-0 sm:pt-0"
          >
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigateTo(item.label)}
                aria-current={page === item.label ? "page" : undefined}
                className={`flex min-w-[62px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[10px] font-medium transition sm:min-w-[76px] sm:flex-none sm:px-3 sm:text-xs ${
                  page === item.label
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-lg leading-none sm:text-xl">
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">
                  {item.label === "Customers" ? "Customer" : item.label}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto min-w-0 max-w-[1800px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="mb-6">
          <p className="text-sm text-slate-500">ChaiMint / {page}</p>
          <h2 className="mt-1 text-3xl font-bold text-white sm:text-4xl">
            {page}
          </h2>
        </div>

        {renderPage()}
        <ToastContainer />
      </main>
    </div>
  );
}

export default App;
