
import { useState } from "react";
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

const menuItems: {
  label: Page;
  icon: string;
}[] = [
  { label: "Dashboard", icon: "▦" },
  { label: "Sales", icon: "₹" },
  { label: "Expenses", icon: "↗" },
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

function handleLoginSuccess(token: string, email: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("userEmail", email);
  setUserEmail(email);
  setIsLoggedIn(true);
}

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
  setUserEmail("");
  setIsLoggedIn(false);
  setPage("Dashboard");
}
  const [refreshKey, setRefreshKey] = useState(0);

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
            <SalesList refreshKey={refreshKey}  />
          </div>
        );

      case "Expenses":
        return <Expenses />;

     case "Customers":
  return (
    <CustomerBalances
    />
  );

      case "Reports":
        return <DailyReport />;

      default:
        return (
          <div className="space-y-6">
            {/* Welcome banner */}
            <section className="relative overflow-hidden rounded-2xl border border-emerald-900 bg-gradient-to-r from-[#031a1c] via-[#062b28] to-[#031a1c] p-6 shadow-xl sm:p-8 lg:min-h-[290px]">
              <div className="relative z-10 max-w-2xl pr-20 sm:pr-0">
                <p className="font-semibold text-emerald-400">
                  Welcome to your shop dashboard
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    ChaiMint
                  </h1>
                  <span className="text-4xl text-emerald-400">🍃</span>
                </div>

                <p className="mt-3 text-base text-slate-400 sm:text-lg">
                  Manage your sales, expenses and customer balances.
                </p>

                <button
                  onClick={() => setPage("Sales")}
                  className="mt-6 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-gray-950 transition hover:bg-emerald-400"
                >
                  + Add New Sale
                </button>
              </div>

              {/* Decorative tea illustration */}
            
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

            {/* Feature cards */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardCards.map((item) => (
                <button
                  key={item.title}
                  onClick={() => setPage(item.target)}
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

            {/* Quick overview */}
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

  return (
    <div className="min-h-screen bg-[#030914] text-slate-100 md:flex">
      {/* Sidebar */}
      
<aside className="fixed left-0 top-0 z-40 hidden h-screen w-[300px] flex-col overflow-y-auto border-r border-slate-800 bg-[#0d1727] p-5 md:flex">

        <div className="mb-7 flex items-center gap-3 px-1 py-1">
          <ChaimintLogo size={56} />

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              ChaiMint
            </h1>
            <p className="text-xs text-slate-400">
              Tea Shop Management
            </p>
          </div>
        </div>

        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Main Menu
        </p>

        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setPage(item.label)}
              className={`flex shrink-0 items-center gap-4 rounded-xl px-4 py-4 text-left text-sm font-medium transition ${
                page === item.label
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="w-4 text-center text-lg">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <p className="mt-auto hidden pt-10 text-sm leading-6 text-slate-400 md:block">
          Your daily tea shop operations, all in one place.
        </p>
      </aside>

      {/* Main content */}
      
<main className="min-w-0 flex-1 bg-[#030914] p-4 sm:p-6 lg:ml-[300px] lg:p-8">

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              ChaiMint / {page}
            </p>
            <h2 className="mt-1 text-3xl font-bold text-white">
              {page}
            </h2>
          </div>

         <div className="flex flex-wrap items-center gap-3">
  <div className="rounded-full border border-emerald-900/70 bg-slate-900 px-4 py-2 text-sm font-medium text-emerald-300">
    ☕ {userEmail || "Shop Workspace"}
  </div>

  <button
    onClick={handleLogout}
    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
  >
    Logout
  </button>
</div>
        </header>

        {renderPage()}

        <ToastContainer />
      </main>
    </div>
  );
}

export default App;
