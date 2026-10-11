# Arta commerce project

Prepared from the six local source files on 2026-09-09. The project is a Hebrew art-supplies storefront on Wix with a planned bidirectional Priority ERP integration. The user requested a commerce website and population of its Wix backend using these sources and the Wix Headless skill.

User confirmed Hebrew-only storefront: all navigation, controls, validation, status and explanatory copy must be Hebrew, with right-to-left layout. Original brand names, identifiers and shade names/codes can retain their source form.

## Source map

| Source | Authority |
| --- | --- |
| `איפיון בסיסי וראשוני של הקישור בין אתר ארטא.docx` | Initial integration requirements, customer types, checkout, shipping, payments and refunds |
| `אפיון מערכת Cross-Sale.docx` | Technique-based complementary recommendations and exclusions |
| `הגדרות למסלול החיפוש באתר.docx` | Navigation, filters, product groups, shade and size selection |
| `היררכיית קטגוריות ומוצרים.docx` | Category tree and named brands; extracted nesting in `context/category-hierarchy.md` |
| `חיפוש באתר - תרשים זרימה.jpg` | Visual navigation and inline shade-expansion reference |
| `מלאי ארטא - תמונות ותיאורים.xlsx` | Product identifiers, names, HTML descriptions, image links and source product links |

## Navigation and product experience

There are 11 horizontal primary categories: צבעים לאומנות, רישום, חומרים, ניירות ובלוקים, קנווסים, מכחולים, אביזרים לאומן ולסטודיו, פיסול, צבעים להובי, מתנות, מותגים.

Desktop subcategories open vertically on hover; successive levels appear to the left. Every category level is clickable and opens large image tiles for the next level, in a merchant-controlled order. Avoid presenting an undifferentiated product list at broad category levels. Categories and products recur under technique, product type and brand paths; do not assume every repeated label represents a different product.

Filters sit on the right: brand, series, price range and artist/student/beginner level, plus product-specific filters such as brush shape and size. The supplied navigation is desktop-oriented; touch and keyboard behavior need an implementation design.

Example path: צבעים לאומנות → שמן → צבעי שמן → Winsor & Newton → tiles for Artist, Winton and sets. Selecting a group opens a product page with name, description upper right, quality product image upper left and a grid of shade swatches below. Each shade shows its name and code (example: Ivory Black 331).

Selecting a shade expands a horizontal panel **between swatch rows**, retaining visible swatches above and below. It must not open a new page or popup. In left-to-right panel order: enlarged shade image, size options (example 37 ml / 200 ml), optional shade information (opacity, pigments, lightfastness), price aligned with its size, quantity +/− and add-to-cart. The photo corroborates this interaction.

## Cross-sell

Recommend complementary supplies for the selected artistic technique. Never recommend another product from the same functional subcategory as the cart item: choosing Old Holland oil paint excludes all oil paints, including other brands. Relationships are configured at category/subcategory level, not per SKU.

Explicit examples:

- Charcoal → charcoal paper, erasers/sharpeners, materials for pastel and charcoal.
- Watercolor paint → watercolor brushes and watercolor paper blocks.

The complete relationship table, ranking, item count and behavior for mixed-technique carts are not supplied.

## Data ownership and integration requirements

Priority owns SKU/barcode, official product name, prices and price lists, commercial discount rules and available inventory. Wix CMS owns extended marketing descriptions, images/video, website categories and tags. Match products using a Priority part number or barcode; do not change the ERP identifier from the site.

The intended interface uses REST APIs/webhooks. Inventory comes from the main Priority warehouse, with real-time or scheduled updates, checkout availability checks and reserved stock to prevent overselling. Out-of-stock items are visibly marked. No API endpoints, credentials, schedule, retry/idempotency design or reservation lifecycle are provided.

Retail checkout requires first/last name, complete street/house/city address, mobile and email. Purchasers are created or linked in both Wix and Priority; returning logged-in customers must reuse their ERP record. The source calls retail customers `C2B` in some places and `B2C` elsewhere; preserve that ambiguity until the customer-series mapping is confirmed. Institutional B2B customers originate in Priority and receive their assigned price list or standing discount after identification, with payment terms and delivery area loaded.

Retail flow: validate stock → calculate price/coupons/shipping → payment → immediate order confirmation and payment acknowledgment → transmit customer, SKU lines, line prices, shipping and payment reference to Priority → warehouse picking → Priority invoice/delivery note → physical delivery. B2B flow includes customer identification and commercial terms; its payment/credit behavior needs clarification.

Shipping is requested by customer address/area, with configurable pickup including the Tel Aviv store. No delivery rates, zones or exact pickup address are provided. Shipping should map to a dedicated Priority line/SKU. Coupons are managed by the website and transmitted as line or order discounts; precedence relative to Priority promotions is unresolved.

Refunds and returns are handled manually by customer service through the payment provider and Priority. Loyalty requires an additional solution; ownership of points remains open. Wishlist, saved/repeat orders, returning-customer offers and external campaign data access are requested for detailed scoping.

The integration document includes a tax-invoice allocation threshold claim. This is an unverified source statement, not a validated current rule; confirm applicable invoicing configuration before implementing it.

## Inventory source and limitations

Worksheet `SheiltaMhrMlay_1662026_163240`, range A1:E6266, contains 6,265 data rows and 6,265 distinct item identifiers. Columns: `פריט`, `שם`, `short_description`, `image_link`, `link`. All rows have names; 2,933 have nonblank description values. Descriptions contain HTML. Links include Excel error values such as `#N/A`; nonblank is not proof of a valid URL or accessible image.

The export does not contain prices, stock quantities, explicit category assignments, structured brand/series, shade color values or variant grouping keys. Product names and source URLs can support **inferred** categorization and grouping, but those inferences need provenance and review. Do not treat this file as live inventory or infer availability from row presence. Preserve distinct SKUs even when names or source URLs repeat.

## Open implementation decisions

- New versus existing Wix target site and selected Wix architecture.
- POC pricing/availability policy pending a real price and stock source.
- Product-family and shade/size grouping, accurate swatch data, taxonomy mapping and missing media.
- Priority connectivity and customer identity matching, price/discount precedence and stock reservation lifecycle.
- Payment provider, B2B credit flow, delivery zones/rates/pickup details and customer-service policies.
- Loyalty provider and scope of account features.

No working integration or verified payment setup is implied by these documents.


## Implemented POC - 2026-09-09

- Frontend: `arta-store`, Wix-managed Astro, Hebrew only and RTL.
- Live: https://arta-poc-gonenj-0806.wix-site-host.com
- Dashboard: https://manage.wix.com/dashboard/a0a5befd-2702-4f70-b267-edd2c50e5b77
- All 6,265 source SKUs verified in 4,613 Wix products; 253 category nodes and five CMS collections populated. 2,137 product families have attached source images.
- Catalog mapping is inferred and requires merchant review. Original source files are unchanged.
- Demo prices only; inventory zero, preorder off, server checkout disabled. Priority/payment/shipping require real inputs and implementation before sales.
- See `arta-store/README.md` for admin ownership, validation and technical limitations; `context/import-verification.json` and `context/category-verification.json` hold import evidence.


## User-authorized checkout update - 2026-09-09

The user explicitly requested enabling cart and checkout with demo prices and fixing product-page HTTP 500. This supersedes the earlier disabled-checkout assumption. Wix Cart V2 now powers the cart; CMS checkoutEnabled is true. All imported variants use untracked demo availability. Original source prices and ERP stock remain unavailable. No payment was submitted by the agent.


## Authentication correction - 2026-09-09

The user correctly clarified that Wix issues the visitor session during rendering. The framework middleware writes wixSession on HTML requests. Same-origin cart calls must reuse that cookie with plain fetch; do not add httpClient.fetchWithAuth or manually create visitor tokens. Earlier curl checks omitted Accept: text/html and did not represent browser navigation. Regression coverage checks cookie-based requests and safe handling of unexpected HTML responses.
