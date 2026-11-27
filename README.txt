PicksBible payments update

Upload these 7 files to the root of your site (same folder as index.html), replacing the existing ones.
bank-payment.html is new; the other six replace existing files.

  app.js, data.js, style.css, premium.html, checkout.html, usdt-payment.html, bank-payment.html

To revert: re-upload the same files from picksbible-BACKUP-before-payments.zip and delete bank-payment.html.

BEFORE CARD PAYMENTS WORK, open data.js and paste your Paystack page links into the "paystack" block:
  ng   = pages for Nigerian customers  (N10,000 for 2 weeks, N20,000 for 30 days)
  intl = pages for everyone else       (naira amount equal to $10 and $20)
Your Whop links go in the "whop" block.
Any link left empty sends the customer to WhatsApp to get payment details instead.

Bank account name: set "name" in the bank block of data.js to show it on the bank page.
Approximate local-currency rates (UK, Euro, Canada, Australia, India) are in app.js, LOCAL_CUR.
