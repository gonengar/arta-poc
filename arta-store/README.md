Live site: https://arta-poc-gonenj-0806.wix-site-host.com

# ארטא — אתר מסחר בעברית

אתר הדגמה המבוסס על מסמכי המוצר והעיצוב בתיקיית האב. נבנה באמצעות Wix Managed Headless, Astro 5 ו־React. כל הממשק בעברית ובכיווניות מימין לשמאל; שמות מותגים ומזהי מוצרים נשמרו במקור.

## ניהול האתר

[לוח הבקרה של Wix](https://manage.wix.com/dashboard/a0a5befd-2702-4f70-b267-edd2c50e5b77)

- Wix Stores מחזיק את המוצרים, הווריאנטים והמק״טים.
- `ArtaCategories` מחזיקה את היררכיית הניווט, הסדר, התמונות והקישור לקטגוריות החנות.
- `ArtaProductDetails` מחזיקה את השמות המלאים, שיוך המותג והטכניקה, פרטי הגוונים והמידות ומקורות המידע.
- `ArtaCrossSell` מחזיקה קשרים בין טכניקות וסוגי מוצרים. דוגמאות צבעי מים ופחם נגזרו ישירות מהמסמך; כללי שמן, אקריליק וגואש נגזרו מההיררכיה ודורשים בדיקת בעל החנות.
- `ArtaSettings` מחזיקה את מצב ההדגמה. `checkoutEnabled` מוגדר `true` לבקשת בעל האתר, במחירי הדגמה.
- `ArtaWishlist` פרטית לכל חבר אתר. הזדהות מתבצעת דרך Wix; אין גישת אורח לרשימות של חברים.

המוצרים והקטגוריות נשלפים בזמן הבקשה, ולא נצרבים באתר בעת הפרסום. הוספת מוצר רגיל ל־Stores תציג אותו בקטלוג. להצגת היררכיה, מידע ייעודי או וריאנטים עשירים יש לעדכן גם את רשומות ה־CMS המתאימות.

## מצב ההדגמה

הקובץ שסופק כולל 6,265 מק״טים, ללא מחירים או כמויות מלאי. נוצרו 4,613 רשומות מוצר הכוללות את כל המק״טים. שלוש משפחות עם יותר מ־100 אפשרויות פוצלו לרשומות מחוברות; עמוד המוצר מציג את המשפחה המאוחדת.

המחירים להמחשה בלבד. לבקשת בעל האתר, זמינות Wix הוגדרה כמלאי הדגמה ללא מעקב כמות. סל הקניות מחובר ל־Wix Cart V2 ותומך בהוספה, שינוי כמות, הסרה והפניה לקופה. אין חיבור פעיל ל־Priority או לספק סליקה, ולא פורסמו כתובת איסוף, תעריפי משלוח או מדיניות מסחרית מומצאים.

תמונות קיימות נלקחו מהקישורים שסופקו. במקום תמונה חסרה מוצגת חלופה עיצובית. צבעי גוונים מדויקים, פיגמנטים, אטימות ועמידות לאור לא סופקו — אין להציג את התמונות כמדידת צבע מדויקת.

## לפני פתיחה לרכישה

1. לספק מחירון, מלאי ונתוני חיבור ל־Priority; להגדיר סנכרון, זיהוי לקוח, מניעת הזמנות כפולות ושמירת מלאי.
2. לאמת את השיוך האוטומטי לקטגוריות, קבוצות מוצרים, רמות, צורות וגדלי מכחולים.
3. להגדיר ספק תשלום, תוכנית Wix מתאימה, תנאי משלוח ואיסוף, מדיניות החזרות ופרטי שירות אמיתיים.
4. להשלים בדיקת תשלום, שילוח ו־ERP לפני שימוש מסחרי. סל Wix והפניה לקופה פעילים במחירי הדגמה.
5. לאמת תנאי לקוחות מוסדיים, מועדון לקוחות, קופונים ומיסוי. להסיר את הוראת `noindex` רק עם הכנת האתר לפרסום מסחרי.

## פיתוח

```sh
npm install --ignore-scripts
npm run build
npm run release
```

ההתחברות ל־Wix מנוהלת על ידי האינטגרציה. אין ליצור לקוח OAuth או לשלב טוקן מנהל בקוד האתר. קובצי סביבה ותיקיית `.wix` אינם נכללים ב־Git.

סקריפטי הכנת הנתונים והייבוא נמצאים בתיקיית האב. `context/wix-import-state.json` שומר את מצב ההתקדמות למניעת יצירה חוזרת. קובצי המקור נשארו ללא שינוי.

## Verification and technical limitations

Production build and TypeScript passed. Live HTTP checks covered catalog, search, brand filtering, product variants, account redirect and server checkout denial. Import verification in `../context/import-verification.json` confirms all 6,265 SKUs in Wix, all out of stock, and 2,137 product families with attached images. No visual browser inspection was possible because no browser was available.

Wix hosting currently appends a generic title even on item pages. The layout script retains the product/category title in the browser and translates main-page titles to Hebrew. Initial HTML can still contain Wix English fallback titles; this POC is noindex. Before commercial launch, resolve route SEO records in Wix and remove the browser correction after verification. Pattern writes to both documented API paths returned HTTP 404.

Build note: on pages exporting wixMetadata, keep the first Astro request-context reference before SDK calls. The Wix metadata transform hoisted earlier category navigation calls into module scope; moving them inside the request component corrected empty navigation. This was verified in compiled output and the live route.

## Checkout update - 2026-09-09

The owner explicitly requested cart and checkout enabled with demo prices. All 6,265 variants were marked in stock without quantity tracking (demo availability, not ERP stock). `/api/commerce` now reads and mutates the current visitor cart; line updates derive the cart ID server-side and validate ownership. Native hosted checkout receives the cart ID and a HTTPS return URL. The previous local-only basket is no longer used.

The product 500 was caused by generated module-scope access to `Astro.params`. Separating metadata and request statements keeps URL resolution inside the request component. `npm run test:request-scope` checks compiled product/category routes; it failed against the broken build and passes against the fix.

Cart session: Wix rendering middleware creates the visitor token and writes the wixSession cookie on HTML requests. Browser calls to local cart routes use plain same-origin fetch, with no SDK Authorization header and no application-managed tokens. The earlier curl probe used Accept: */* and therefore did not exercise browser rendering; its missing cookie was a test error, not a framework limitation. Unexpected HTML or malformed JSON now produces a Hebrew recovery message. Hebrew checkout uses additionalQueryParameters.lang.

Authentication verification: `node scripts/verify-live-cart.mjs` starts with a normal HTML request (Accept: text/html), uses only the framework-issued cookie, and verifies cart persistence across rendering, quantity updates, checkout redirect, visitor isolation and removal. It creates no tokens itself and attaches no Authorization header. `npm run test:shop-client` covers local fetch behavior and HTML/malformed-JSON error handling.
