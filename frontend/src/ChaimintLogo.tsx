
type ChaimintLogoProps = {
  size?: number;
};

export default function ChaimintLogo({
  size = 40,
}: ChaimintLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Chaimint logo"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="chaimint-gradient" x1="4" y1="4" x2="44" y2="44">
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="14" fill="#052E2B" />

      <path
        d="M32 12.5A15 15 0 1 0 32 35.5"
        stroke="url(#chaimint-gradient)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      <path
        d="M20 31C21 22 28 17 37 18C36 27 30 33 20 31Z"
        fill="#6EE7B7"
      />

      <path
        d="M20 34C24 29 29 26 35 24"
        stroke="#D1FAE5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
