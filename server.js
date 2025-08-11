// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');



const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// CORS: allow your GitHub Pages origin

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN,
    methods: ['POST', 'GET', 'OPTIONS'],
}))

// Parse JSON bodies
app.use(express.json());

// Basic health check
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'cfrc-stripe-backend' });
});

// Create Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { amount, email } = req.body; // amount in cents (e.g., 2500 == $25)

    // Validate amount
    if (!Number.isInteger(amount)) {
      return res.status(400).json({ error: 'Amount must be an integer (in cents).' });
    }
    if (amount < 2500) {
      return res.status(400).json({ error: 'Minimum donation is $25.' });
    }
    // Optional: set a reasonable max (e.g., $10,000)
    if (amount > 1_000_000) {
      return res.status(400).json({ error: 'Maximum donation exceeded.' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Optional: let Stripe decide available methods (card, wallets, etc.)
      // payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Donation to CFRC' },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,
      // Optionally prefill email
      ...(email ? { customer_email: email } : {}),
      // Optional: attach metadata for your records
      metadata: {
        source: 'github-pages-cfrc-fundraiser',
      },
    });

    // You can use either the URL or the session ID on the frontend.
    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return res.status(500).json({ error: 'Unable to create checkout session.' });
  }
});

// Global error handler (just in case)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error.' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Stripe server listening on port ${port}`);
});