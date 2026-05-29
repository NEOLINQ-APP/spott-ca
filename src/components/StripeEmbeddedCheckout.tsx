import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";

interface Props {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
  businessId?: string;
}

export function StripeEmbeddedCheckout({ priceId, quantity, returnUrl, businessId }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const cs = await createCheckoutSession({
      data: {
        priceId,
        quantity,
        returnUrl: returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
        ...(businessId && { businessId }),
      },
    });
    if (!cs) throw new Error("Could not start checkout");
    return cs;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
