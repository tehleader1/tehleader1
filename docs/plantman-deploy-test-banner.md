# PlantMan deployment test banner

The test banner text is: `Testing GitHub update is live`.

If the banner does not appear on the live PlantMan storefront after this GitHub change is deployed, the storefront is probably not loading the Flask static page or the Shopify app embed yet. Use one of these live checks:

1. Confirm the app deployment serves the standalone script: `https://supportrd.com/deploy-test-banner.js?v=20260510`.
2. Confirm the Shopify app proxy page includes the banner/script: `https://shop.supportrd.com/apps/supportrd`.
3. To force the test sign into the active Shopify theme, call `https://supportrd.com/api/admin/shopify/install-deploy-test-banner` after `SHOPIFY_STORE` and `SHOPIFY_ADMIN_TOKEN` are configured for the PlantMan shop and the app has `write_themes` permission.

That install endpoint edits the active Shopify `layout/theme.liquid` one time and adds a script tag that loads the no-cache banner script from SupportRD. It is idempotent, so calling it again returns `banner_already_installed` instead of duplicating the script.
