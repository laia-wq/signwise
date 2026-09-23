# Put Signwise online for free

Signwise runs entirely in the browser. Cloudflare Pages offers a free plan with a free HTTPS `pages.dev` address and unlimited static requests. You do not need a paid AI API, backend server, or custom domain for these features.

1. Sign in to or create a Cloudflare account on the Free plan.
2. In Workers & Pages, create a Pages application and choose direct upload / drag and drop.
3. Upload the prepared `signwise-public.zip` (its root contains `index.html`).
4. Choose an available project name, then deploy. Cloudflare supplies the public HTTPS address. Anyone with that address can open the app.
5. On later updates, upload a newly exported copy using Create a new deployment.

A Direct Upload project cannot later switch to Git integration; create a new Pages project if you want automatic Git deployments.

The portable ZIP omits the private Sites address from social-image metadata. After your public URL is assigned, optionally add the absolute public URL of `og.png` as the `og:image` and `twitter:image` metadata in index.html.

Camera access works on HTTPS (or localhost), not a plain HTTP public page. Video and model downloads require internet access. Instructor video links open on the original websites. There is no visitor login or cloud storage; progress stays in the visitor's browser.

This is a prototype with experimental static-handshape feedback. Hosting it publicly does not validate its recognition accuracy.

Official sources, checked September 21, 2026:
- https://pages.cloudflare.com/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
