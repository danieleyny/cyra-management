# Cyra Management

An editorial, responsive website for Cyra Management, built as a dependency-free static site for GitHub Pages. The experience is centered on resident care, direct property stewardship, and a verified representative portfolio spanning New York City, the Hudson Valley, and South Florida.

## Local preview

From the project directory, run:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## Build

No compilation is required. The repository root is the production site. Before release, validate that `index.html`, `privacy.html`, `terms.html`, and `404.html` load through a local HTTP server; direct `file://` previews are not recommended.

## Editing content

- Main page structure and editorial copy: `index.html`
- Design system and responsive behavior: `assets/css/styles.css`
- Public contact information and Formspree endpoint: `assets/js/config.js`
- Representative property addresses, regions, imagery, and layouts: `assets/js/data.js`
- Navigation, dialogs, motion, and form behavior: `assets/js/main.js`

## Property data

Edit the `window.CYRA_RESIDENCES` array in `assets/js/data.js`. Each item includes an internal ID, address, location, region, image path, alt text, and a list of representative residence types. The published language intentionally avoids implying that historical sample layouts are currently available.

Property details and public contact information were carried forward from the former company website at `https://ny-apts.com/` and checked on September 16, 2026. The numerical counters and unsupported promotional claims from that site were not reused.

## Contact configuration

All public contact values live in `assets/js/config.js`:

- `email`
- `phoneDisplay` and `phoneHref`
- `whatsappDisplay` and `whatsappHref`
- `formEndpoint`

The current values reflect the public details on the former site. Confirm that the email, phone numbers, WhatsApp account, and Formspree destination are still owned and monitored before launch.

## Formspree setup

The project currently uses the public Formspree endpoint found on the former site. To replace it:

1. Create or select a form in Formspree.
2. Copy its public endpoint, such as `https://formspree.io/f/abcdwxyz`.
3. Replace `formEndpoint` in `assets/js/config.js`.
4. Submit a real test inquiry and confirm delivery to the intended inbox.

The form includes native constraints, accessible field messages, a honeypot, a hidden subject, disabled sending state, inline success/failure feedback, and preserves entered data after a failed request.

## Images

Portfolio photographs were downloaded from the former company website and are served locally from `assets/images/`. They were resized and recompressed as WebP files with descriptive names. To replace one, export a WebP image close to a 4:3 ratio, update the file path and alt text in `assets/js/data.js`, and keep the final file under roughly 500 KB when practical.

The font files in `assets/fonts/` are licensed under the included SIL Open Font License files.

## GitHub Pages deployment

The workflow at `.github/workflows/pages.yml` publishes the repository root whenever `main` is updated.

1. Create a GitHub repository named `cyra-management`.
2. Push this project to its `main` branch.
3. In **Settings → Pages**, choose **GitHub Actions** as the source if it is not selected automatically.
4. Confirm the `Deploy static site to GitHub Pages` workflow completes successfully.
5. Visit `https://danieleyny.github.io/cyra-management/` and inspect the live site.

If the repository owner or name changes, update the canonical URL in `index.html`, `assets/js/config.js`, `robots.txt`, `sitemap.xml`, and the structured-data block in `index.html`.

## Before final public launch

- Confirm all public contact destinations, particularly the inherited Formspree form.
- Have the privacy and website terms reviewed by qualified legal counsel.
- Confirm that every displayed property and photograph remains approved for publication.
- Update canonical metadata if a custom domain will be used.
