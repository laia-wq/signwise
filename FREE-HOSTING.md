# Hosting Signwise

Public site: https://laia-wq.github.io/signwise/

GitHub Pages serves the static files in `dist/` for free from this public repository.

- Push updates to `main` to publish automatically.
- The **Publish Signwise** workflow runs the test suite before deploying.
- Check deployment status in the repository's **Actions** tab.
- In **Settings → Pages**, the publishing source is **GitHub Actions**.
- No build, backend, paid API, or custom domain is required.

Camera access requires HTTPS or localhost. The hand-tracking model requires an internet connection. Video is processed in the browser; progress is stored locally for each website address and does not transfer automatically from another host.

[GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
