import Stripe from 'stripe';
import { env } from '../lib/env.js';

let client: Stripe | null = null;

/** Lazily-constructed Stripe client, replacing base44's built-in Stripe connector. */
export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured: set STRIPE_SECRET_KEY');
  }
  if (!client) client = new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}
