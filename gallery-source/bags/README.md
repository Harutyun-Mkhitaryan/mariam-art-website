# Bag artwork source folder

Drop future original bag artwork photographs in this folder. The public category is already prepared in `src/data/artworks.json` with `visible: false`, so it does not appear in the gallery, search, footer, or sitemap while empty.

When Mariam's bag works are ready:

1. Add optimized artwork images under `public/assets/artworks/`.
2. Add translated artwork records to `src/data/artworks.json` with `category: "bags"`.
3. Set the `bags` category `visible` value to `true`.
4. Run `npm run build` and review the category in all three languages.
