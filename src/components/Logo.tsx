import defaultLogo from "@/assets/logo.png";

export function Logo({
  className = "h-24 w-auto",
  src,
  alt,
}: {
  className?: string;
  src?: string;
  alt?: string;
}) {
  return <img src={src || defaultLogo} alt={alt || "MarquesMater"} className={className} />;
}
