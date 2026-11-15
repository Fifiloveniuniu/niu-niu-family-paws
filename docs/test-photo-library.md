# Test pet photo library

Owner requested hundreds of cat, dog, and rabbit photos on November 15, 2026, with datasets permitted and all pet images loaded from Google Cloud Storage rather than hardcoded frontend assets.

## Storage and use

- 300 photographs: 100 cats, 100 dogs, 100 rabbits; 100 per species is the implementation target.
- Existing private Oregon bucket: `gs://niu-niu-family-paws-dev-pet-photos/test-library/v1/`.
- Content-addressed WebP objects, within 640 × 640 pixels. Source metadata is stripped.
- Per-image source/creator/license, transformations, checksums and verified object generations are in [the manifest](test-assets/pet-photos.json).
- This is a test asset library, not real customer photos. No customer/pet documents are created or overwritten by the collector/uploader. No Auth or IAM changes.
- Existing pet cards read their saved private photo through the authenticated pet-photo API, backed by Cloud Storage. Missing photos show “No photo yet” / “尚未添加照片”; no bundled stock photo remains.
- Downloading this library does not automatically assign images to existing test pets. Future development fixtures must select by species from the manifest, retain attribution, and use the normal private pet-photo storage/API path. Do not assign stock images to real pets or load Wikimedia directly in the customer browser.
- These are photographs, not 300 distinct animal identities. Some show the same animal or different crops; each uploaded object has distinct bytes.

## Provenance and licensing

Source: Wikimedia Commons, using direct subject categories (cat/dog portraits, pet/domesticated rabbits), not broad keyword results. Only supported CC0, CC BY and CC BY-SA licenses with creator and license URL metadata are accepted. Per-file terms are retained; adaptations remain under each file's stated license. Display the source/creator/license when reusing an image, including test UI galleries. The manifest is the attribution record, not a blanket license for the collection.

Official references: [Commons machine-readable metadata](https://commons.wikimedia.org/wiki/Help:Machine-readable_data), [MediaWiki imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo). Every manifest entry links its original file page and license.

## Reproduce

Use an external working directory for image bytes; do not commit them or bundle the manifest into frontend code.

```sh
python3 scripts/collect-test-pet-photos.py --output /tmp/family-paws-photo-assets --per-species 100
node scripts/upload-test-pet-photos.mjs /tmp/family-paws-photo-assets --prepare
```

Review the generated cat/dog/rabbit contact sheets before uploading. Collection limits each creator to eight photos per species to improve variety. Filtering reduces irrelevant artwork and unsafe subjects; visual review is still required.

```sh
node scripts/upload-test-pet-photos.mjs /tmp/family-paws-photo-assets --upload
```

Upload uses the existing Firebase CLI login, fixed development bucket/test prefix, private bucket checks, create-only generation preconditions, and remote size/MD5 verification. No keys or tokens are written. Repeated uploads verify existing identical image objects rather than replacing them. The immutable cloud manifest is uploaded last; its location is recorded in the local upload report. Preserve manifest attribution when copying assets into future test fixtures.

## Validation

All 300 prepared images were decoded, checked for unique content hashes, visually reviewed in contact sheets, and uploaded with per-object read-back verification. Anonymous access must remain denied. Application production build, API typecheck, unit tests and all ten browser tests cover the existing flows; bilingual placeholder and private-photo behavior are included. Actual signed-in localhost Chrome walkthrough confirmed missing-image placeholders on the existing test pet cards without business writes.
