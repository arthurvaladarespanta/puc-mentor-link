import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, tamanho = "md" }: { className?: string; tamanho?: "sm" | "md" | "lg" }) {
  const texto = tamanho === "lg" ? "text-3xl" : tamanho === "sm" ? "text-lg" : "text-xl";
  const icone = tamanho === "lg" ? "size-8" : tamanho === "sm" ? "size-5" : "size-6";
  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <GraduationCap className={cn(icone, "shrink-0")} strokeWidth={1.8} aria-hidden />
      <span className={cn("font-serif font-semibold tracking-tight", texto)}>Calouro+</span>
    </span>
  );
}
