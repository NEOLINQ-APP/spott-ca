import { useCallback, useState } from "react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { X } from "lucide-react";

interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
}

export function useStripeCheckout() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);

  const openCheckout = useCallback((opts: CheckoutOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const checkoutElement = isOpen && options ? (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto" onClick={closeCheckout}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={closeCheckout} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full bg-secondary p-1.5 hover:bg-secondary/80">
          <X className="h-4 w-4" />
        </button>
        <div className="max-h-[85vh] overflow-y-auto p-4 pt-12">
          <StripeEmbeddedCheckout {...options} />
        </div>
      </div>
    </div>
  ) : null;

  return { openCheckout, closeCheckout, isOpen, checkoutElement };
}
