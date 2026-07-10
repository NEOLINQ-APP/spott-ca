import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Car, ShoppingBag, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type QuickSellButtonProps = {
  active?: boolean;
};

const OPTIONS: Array<{
  to: "/marketplace/new" | "/vehicles/sell" | "/business-signup";
  icon: typeof Car;
  title: string;
  desc: string;
}> = [
  {
    to: "/marketplace/new",
    icon: ShoppingBag,
    title: "Marketplace item",
    desc: "Sell furniture, electronics, home goods & more.",
  },
  {
    to: "/vehicles/sell",
    icon: Car,
    title: "Vehicle",
    desc: "List a car, truck, or motorcycle with VIN decoder.",
  },
  {
    to: "/business-signup",
    icon: Store,
    title: "List a business",
    desc: "Claim or add your business to the directory.",
  },
];

/**
 * Central "Sell" CTA for the mobile bottom nav. Opens a non-blocking
 * bottom sheet so users can choose what they're selling without leaving
 * the current route.
 */
export function QuickSellButton({ active }: QuickSellButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Sell an item"
          className={cn(
            "relative -mt-6 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95",
            active && "scale-105",
          )}
        >
          <Plus className="h-7 w-7" aria-hidden="true" />
          <span className="mt-0.5 text-[10px] font-semibold leading-none">Sell</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4"
      >
        <SheetHeader className="text-left">
          <SheetTitle>What are you selling?</SheetTitle>
        </SheetHeader>
        <ul className="mt-4 space-y-2">
          {OPTIONS.map(({ to, icon: Icon, title, desc }) => (
            <li key={to}>
              <Link
                to={to}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {desc}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
        </button>
      </SheetContent>
    </Sheet>
  );
}
