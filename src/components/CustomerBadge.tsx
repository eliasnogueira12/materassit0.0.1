import { User } from "lucide-react";
import { useCustomer } from "@/lib/customer";

export function CustomerBadge() {
  const { customer } = useCustomer();
  if (!customer) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur">
      <User className="h-4 w-4" />
      Cliente #{customer.customer_number}
    </div>
  );
}
