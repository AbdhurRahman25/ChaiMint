import { useState } from "react";
import type { FormEvent } from "react";

const API_URL = "https://chaimint.onrender.com";

type LoginProps = {
  onLoginSuccess: (token: string, email: string) => void;
};

type AuthResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  user?: {
    email?: string;
    shopName?: string;
  };
};

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setShopName("");
    setEmail("");
    setOtp("");
    setPassword("");
    setOtpSent(false);
    setShowPassword(false);
    setMessage("");
    setError(false);
  }

  async function postRequest(
    path: string,
    body: Record<string, string>
  ): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as AuthResponse;

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Request failed. Please try again.");
    }

    return data;
  }

  async function requestOtp() {
    setMessage("");
    setError(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(true);
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!shopName.trim()) {
      setError(true);
      setMessage("Please enter your shop name.");
      return;
    }

    setLoading(true);

    try {
      const data = await postRequest("/api/auth/register/request-otp", {
        email: cleanEmail,
      });

      setEmail(cleanEmail);
      setOtpSent(true);
      setMessage(data.message || "OTP sent to your email.");
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error ? err.message : "Cannot connect to backend."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(true);
      setMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError(true);
      setMessage("Password must be 8 to 128 characters long.");
      return;
    }

    if (mode === "register") {
      if (!shopName.trim()) {
        setError(true);
        setMessage("Please enter your shop name.");
        return;
      }

      if (!otpSent) {
        setError(true);
        setMessage("Please request and verify your email OTP first.");
        return;
      }

      if (!/^\d{6}$/.test(otp.trim())) {
        setError(true);
        setMessage("Enter the 6-digit OTP sent to your email.");
        return;
      }
    }

    setLoading(true);

    try {
      const data =
        mode === "register"
          ? await postRequest("/api/auth/register/verify-otp", {
              shopName: shopName.trim(),
              email: cleanEmail,
              otp: otp.trim(),
              password,
            })
          : await postRequest("/api/auth/login", {
              email: cleanEmail,
              password,
            });

      if (!data.token) {
        throw new Error("Authentication succeeded without a token.");
      }

      const userEmail = data.user?.email || cleanEmail;

      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", userEmail);

      onLoginSuccess(data.token, userEmail);
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error ? err.message : "Cannot connect to backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatShopName(value: string) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030914] px-4 py-8 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-emerald-900/70 bg-[#0d1727] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mb-4 text-5xl">🍃</div>
          <h1 className="text-3xl font-extrabold text-white">ChaiMint</h1>
          <p className="mt-2 text-sm text-slate-400">
            Tea Shop Management
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#030914] p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-lg px-3 py-3 text-sm font-semibold ${
              mode === "login"
                ? "bg-emerald-500 text-gray-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`rounded-lg px-3 py-3 text-sm font-semibold ${
              mode === "register"
                ? "bg-emerald-500 text-gray-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        <h2 className="text-xl font-bold">
          {mode === "register" ? "Create your shop account" : "Welcome back"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          {mode === "register"
            ? "Register with your shop name and verify your email."
            : "Login with your registered email and password."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Shop name
              </label>
              <input
                type="text"
                value={shopName}
               onChange={(event) =>
  setShopName(formatShopName(event.target.value))
}
                placeholder="Enter your shop name"
                maxLength={100}
                autoComplete="organization"
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-700 bg-[#030914] px-4 py-3 outline-none focus:border-emerald-500 disabled:opacity-60"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading || (mode === "register" && otpSent)}
              required
              className="w-full rounded-xl border border-slate-700 bg-[#030914] px-4 py-3 outline-none focus:border-emerald-500 disabled:opacity-60"
            />
          </div>

          {mode === "register" && !otpSent && (
            <button
              type="button"
              onClick={requestOtp}
              disabled={loading}
              className="w-full rounded-xl border border-emerald-700 px-4 py-3 font-semibold text-emerald-300 hover:bg-emerald-950 disabled:opacity-60"
            >
              {loading ? "Sending OTP..." : "Send Email OTP"}
            </button>
          )}

          {mode === "register" && otpSent && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  6-digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter email OTP"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 bg-[#030914] px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setOtp("");
                  setOtpSent(false);
                  setMessage("");
                  setError(false);
                }}
                className="text-sm text-emerald-300 hover:text-emerald-200"
              >
                Change email / request new OTP
              </button>
            </>
          )}

         
<div className="relative">
  <label className="mb-2 block text-sm font-medium">
  Password
</label>
  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(event) => setPassword(event.target.value)}
    placeholder="Minimum 8 characters"
    minLength={8}
    maxLength={128}
    autoComplete={
      mode === "register" ? "new-password" : "current-password"
    }
    disabled={loading}
    required
    className="w-full rounded-xl border border-slate-700 bg-[#030914] px-4 py-3 pr-20 outline-none focus:border-emerald-500 disabled:opacity-60"
  />

  <button
    type="button"
    onClick={() => setShowPassword((previous) => !previous)}
    className="absolute right-3 top-[65%] -translate-y-1/2 text-sm font-semibold text-emerald-300 
    hover:text-emerald-200"
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? "Hide" : "Show"}
  </button>
</div>


          {message && (
            <p
              role="status"
              className={`rounded-lg p-3 text-sm ${
                error
                  ? "bg-red-950/60 text-red-300"
                  : "bg-emerald-950/60 text-emerald-300"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "register" && !otpSent)}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "register"
                ? "Create Account"
                : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Secure access to your ChaiMint workspace.
        </p>
      </section>
    </main>
  );
}