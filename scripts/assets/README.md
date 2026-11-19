# Archived artwork refinement experiment

`refine-dog-vectors.py` preserves an earlier manual SVG refinement experiment. It is not run by the application build.

The script requires Python, `svgpathtools`, and the historical `public/images/marketing/logo-transparent.svg` source with its original named groups and masks. That source SVG is not in the current checkout. Supplying an unrelated SVG will not reproduce the experiment. The existing site uses its checked-in approved artwork independently.

When the matching source is available, run from the repository root in a disposable checkout. The script writes `logo-refined.svg` and `dog-head-refined.svg` beside the source; review those outputs before using them. It edits vector paths and preserves source shading, rather than generating a new raster likeness.
