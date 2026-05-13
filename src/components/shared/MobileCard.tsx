import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function MobileCard({ children }: { children: ReactNode }) {
  return <Card className="md:hidden">{children}</Card>;
}
