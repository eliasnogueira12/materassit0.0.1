import logo from "@/assets/logo.png";

export function Logo({ className = "h-24 w-auto" }: { className?: string }) {
  return <img src={logo} alt="MarquesMater" className={className} />;
}
