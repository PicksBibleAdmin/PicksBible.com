PicksBible ads: desktop + tablet only (phones untouched)

FILES
  ads.js   NEW file. Upload it to the site root next to app.js.

ONE LINE TO ADD to index.html (nothing else in the site changes)
  Find:     <script src="lead.js" defer></script>
  Replace:  <script src="lead.js" defer></script><script src="ads.js" defer></script>

BEFORE YOU DO IT: save a copy of your current index.html. To undo, put it back (or delete that one script tag). Nothing else is touched.

WHAT SHOWS
  Desktop (1100px and wider)
    - Right column: 300x250, then a 300x600 that stays in view while scrolling (starts beside Banker Bet of the Day)
    - 728x90 in-feed under Bets of the Day (your existing banner, moved here)
    - Your two "Advertise Here" boxes stay under the predictions, now in the main column
    - 728x90 catfish fixed to the bottom of the screen
  Tablet (768px to 1099px)
    - 300x250 and 320x50 inline under Bets of the Day
    - 728x90 catfish fixed to the bottom of the screen (shrinks to fit narrow screens)
  Catfish: has a close button (stays closed for that visit), waits until the cookie notice is dismissed, and the Chat Us, Telegram and theme buttons sit above it.

RUNNING AN ADVERTISER
  Open ads.js. At the top, fill the slot, for example:
    c: { img: "img/ads/brand-300x250.png", href: "https://advertiser.com", alt: "Brand" }
  Slots left empty show "Advertise Here!" with a Book this slot link to contact.html.
