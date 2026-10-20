# Lauren & Casey's Wedding Camera — $0 DIY setup

**Wedding:** November 7, 2026  
**Guest experience:** Scan QR → open camera → take photo → auto-upload; or choose a photo already on the phone. No guest account and no app installation.

This folder contains a ready-made, mobile-friendly website. **Your Cloudinary values are already connected.** You only need to publish the site on GitHub Pages and test a real photo upload. A free GitHub account is needed to publish.

## Files to publish

Upload just these four files to your GitHub Pages repository:

- `index.html` — wedding camera web page
- `style.css` — navy-and-gold design
- `app.js` — browser camera, local backup, uploads and retry
- `config.js` — your two Cloudinary settings and optional names/date

You can keep this `START-HERE.md` file on your computer. **Never put Cloudinary's API Secret into any of these files.**

## 1. Cloudinary connection — already entered for you

Your two Cloudinary fields are **already saved** in `config.js`:

```js
cloudName: "lsxygthd",
unsignedUploadPreset: "lauren_casey_wedding_2026",
```

Do **not** paste any Cloudinary API secret or password into the website. These two values are browser-visible identifiers required for unsigned uploads.

Before going live, visit https://console.cloudinary.com/ and check that your named upload preset:

1. Has **Signing mode: Unsigned** (not Signed).
2. Accepts JPEG images (`jpg` and/or `jpeg`); the site converts pictures to JPEG before upload.
3. Points to the intended wedding folder in Cloudinary, e.g. `Lauren-Casey-Wedding-2026`.
4. Uses **Disallow public ID** (if available), and doesn't use optional paid add-ons.

These settings live in your Cloudinary account; configuring this file **does not** itself check or change them.

**Security warning:** An *unsigned* preset is visible in a public website and can technically be used by someone other than your guests. No static website can truly restrict this by guest identity. Cloudinary explicitly warns about this. Monitor usage in your Cloudinary dashboard and disable/delete the preset right after your wedding. If you need a private, authenticated upload system, a server/backend or a service with its own access controls is necessary.

## 2. You're ready for publishing

The website files have been connected to the Cloudinary identifiers you provided. You do **not** need to edit them. Live uploads have **not** been tested against your account yet; follow the rehearsal in step 5.

## 3. Publish your website (GitHub Pages — free)

1. Sign in at https://github.com/ or create a free account. If using a phone, the desktop website on a computer may be easier.
2. Create a new **Public** repository, e.g. `wedding-camera`. A public repository is required for free GitHub Pages.
3. **Unzip the downloaded ZIP first.** In your new repository, use **Add file → Upload files** to upload these **four individual files** into the top level (not inside a folder): `index.html`, `style.css`, `app.js`, and `config.js`. Commit the files to the `main` branch. **Do not upload only the ZIP file.**
4. In the repository, choose **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and **Save**.
6. GitHub will provide an HTTPS website address, normally like `https://YOUR-USERNAME.github.io/wedding-camera/`. Open it on your phone.

**Important:** The GitHub repository and the photo camera website will be publicly accessible. Guests will *not* see other guests' photos in this version. Cloudinary-hosted image URLs may still be accessible to anyone who obtains an individual URL, so do not treat the photo storage as end-to-end encrypted or fully private.

## 4. Turn your website address into a QR code ($0)

1. Copy the exact live HTTPS GitHub Pages address (include trailing slash if given).
2. Go to https://www.canva.com/ and start a 5×7 inch design.
3. Use Canva's QR Code app / free QR code generator. Paste the GitHub Pages address.
4. Add this sign wording:

   **PICS OR IT DIDN'T HAPPEN!**  
   You're our unofficial photographer.  
   **SCAN • SNAP • SHARE**  
   Lauren & Casey • 11.07.2026

5. Scan the code *with another phone* before printing. Use several signs around the reception, including one near the bar.

## 5. Run a real rehearsal — important

Test with an **iPhone and Android** if you can:

- Scan the real QR code and open the GitHub Pages website over HTTPS.
- Tap **Open wedding camera**, accept camera access, and capture a test photo.
- Verify **Uploading…** changes to **Uploaded ✓**.
- In your **own Cloudinary Media Library**, locate the photo in the wedding folder.
- Use **Save a copy** on each phone: on some iPhones the Share sheet lets you choose Save Image, while other browsers may save to Files/Downloads.
- Try **Use phone camera** (native camera picker) and **Choose a photo** (camera roll), too.
- Turn off Wi-Fi or mobile data *after the page has loaded*, capture a picture, and make sure the app keeps it with a Retry option when the upload fails. Reconnect and retry. This tests failure handling; it is not a guarantee of permanent offline storage.
- Test with the actual venue Wi-Fi/mobile signal, if possible.

If you ever see **Not uploaded — retry**, the photo has **not** reached your album. Have the guest choose **Save a copy** and try again.

## 6. After the wedding — download and lock it down

1. Sign into Cloudinary and inspect the wedding folder in **Media Library**.
2. Download/export the originals to your own computer. Double-check the number of files. Make a second backup, such as an external hard drive or your personal cloud drive.
3. Once collection is finished, **disable or delete the unsigned upload preset** in Cloudinary to stop anyone using the open upload endpoint. Consider replacing the website with a thank-you page too.
4. The saved copies on guests' browsers are NOT permanent copies and are not a substitute for your backup.

## Limitations you should know about

- $0 is achievable **within free-plan resource limits**. Cloudinary currently grants **25 monthly credits** for combinations of storage, bandwidth, and transformations; not literally unlimited storage. You can monitor usage and lower image size if needed. Source: https://cloudinary.com/documentation/billing_and_plans
- The site is photo-only. It **does not accept videos**.
- There is no required guest account, but an open unsigned upload preset carries spam/abuse risk. The website's JPEG conversion is NOT a security barrier against someone who calls Cloudinary's endpoint directly.
- The site attempts to keep a copy in browser IndexedDB for retries; browser privacy modes, storage limits, device cleanup, or tab data removal can erase it. **Save a copy** must be selected by guests to place an independent copy on their phones.
- An upload is successful only once the page displays **Uploaded ✓**. The system cannot guarantee delivery if the internet, phone, hosting, or Cloudinary is unavailable.
- Current Cloudinary image URLs are generally shareable/public unless you arrange special access controls. Do not rely on the absence of a public guest gallery to protect sensitive pictures.
- GitHub Pages is a website host, not your photo storage. Your Cloudinary account holds the uploaded photos.
- This demo has not been tested against **your actual Cloudinary account**; verify every step with your real configuration before printing signs.

## Source documentation

- Cloudinary unsigned browser upload: https://cloudinary.com/documentation/client_side_uploading
- Cloudinary upload preset security: https://cloudinary.com/documentation/upload_presets
- Cloudinary billing and credits: https://cloudinary.com/documentation/billing_and_plans
- GitHub Pages setup: https://docs.github.com/en/pages/getting-started-with-github-pages
