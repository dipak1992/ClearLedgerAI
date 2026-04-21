import Stripe from "stripe";

import { env } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}
