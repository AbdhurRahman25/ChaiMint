import { useState } from "react";

const API_URL = "http://localhost:4000";

type LoginProps = {
  onLoginSuccess: (token: string, email: string) => void;
};

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function requestOtp() {
    setMessage("");
    setError(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(true);
      setMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not send OTP.");
      }

      setEmail(cleanEmail);
      setOtpSent(true);
      setMessage(data.message || "OTP sent to your email.");
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error
          ? err.message
          : "Cannot connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError(false);

    if (!/^\d{6}$/.test(otp.trim())) {
      setError(true);
      setMessage("Enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.token) {
        throw new Error(data.message || "OTP verification failed.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", data.user?.email || email.trim());

      onLoginSuccess(data.token, data.user?.email || email.trim());
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error
          ? err.message
          : "Cannot connect to the backend."
      );
    } finally {
      setLoading(false);
    }
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

        <h2 className="text-xl font-bold">
          {otpSent ? "Verify your email" : "Login with Email"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          {otpSent
            ? `Enter the 6-digit code sent to ${email}.`
            : "Enter your email address to receive a one-time password."}
        </p>

        <form onSubmit={verifyOtp} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={loading || otpSent}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-700 bg-[#030914] px-4 py-3 outline-none focus:border-emerald-500 disabled:opacity-60"
            />
          </div>

          {otpSent && (
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
                placeholder="Enter OTP"
                required
                className="w-full rounded-xl border border-slate-700 bg-[#030914] px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-emerald-500"
              />
            </div>
          )}

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

          {!otpSent ? (
            <button
              type="button"
              onClick={requestOtp}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify OTP & Login"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setOtp("");
                  setOtpSent(false);
                  setMessage("");
                  setError(false);
                }}
                className="w-full rounded-xl border border-slate-700 px-4 py-3 font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-60"
              >
                Change Email
              </button>
            </>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Secure email verification for your ChaiMint workspace.
        </p>
      </section>
    </main>
  );
}
