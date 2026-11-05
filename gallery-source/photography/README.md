# Photography source images

Current set: 10 JPG files supplied from `C:\Users\Harut-Admin\Desktop\photos`.
The gallery publishes these as four numbered cards. Views 4–10 are grouped under Photo 04 because they show the same subject from alternate angles.

To reprocess this exact set, run from the project root:

```powershell
npm run import:photography -- "gallery-source/photography"
```

When replacing or adding photographs, update the 4-card grouping in `scripts/import-photography.mjs` and the corresponding entries in `src/data/artworks.json` together.
