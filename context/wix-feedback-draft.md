# Optional Wix tooling feedback — not sent

This run created a Wix-managed Astro Hebrew/RTL commerce POC for Arta from 6,265 source SKUs, populating 4,613 products, 253 categories and five CMS collections.

Confirmed friction: (1) Frontmatter statements before the first Astro reference on a page exporting wixMetadata were hoisted to module scope by the build. Ambient SDK calls there lacked request context and navigation returned empty. Moving the Astro reference before data loading kept SDK calls in the request component; compiled output confirmed the correction. (2) Hosting appended generic English main-page SEO tags to item pages even when native SEO.Tags were already rendered, producing duplicate titles. A browser normalization workaround was required for the POC. (3) Both documented PATCH paths for setting STATIC_PAGE SEO patterns returned non-JSON 404, while GET worked. (4) Bulk product/media operations hit rate limits; resumable state and throttling were needed. (5) The product option cap required splitting three families over 100 choices while retaining a combined storefront view.

No tokens or credentials are included. Send only after the user approves the wording; add any feedback in their own words verbatim.
