# Stipendia

Stipendia är en mobilanpassad prototyp som hjälper studenter att hitta relevanta stiftelser, spara intressanta stipendier och bedöma möjlig behörighet.

## Stipendiedata

Originalkällan är `Alla sveriges stiftelser för studenter.xlsx`. Appen läser inte Excel-filen direkt i webbläsaren, utan använder chunkade JSON-filer i `public/data/scholarships/`.

Regenerera datan med:

```bash
npm run generate:scholarships
```

Scriptet `scripts/generate-scholarship-data.mjs` läser Excel-filen, filtrerar fram poster som är relevanta för vanliga universitets- och högskolestudenter, och skriver om:

- `public/data/scholarships/index.json`
- `public/data/scholarships/scholarships-001.json` osv.

Filtreringen är avsiktligt försiktig. Den behåller poster med tydlig koppling till studenter, studerande, universitet, högskola, eftergymnasiala studier, examensarbete, kandidat/master/magister eller liknande. Den filtrerar bort poster som främst gäller forskning, doktorander, professorer, gymnasium/grundskola, barn/ungdom utan högskolekoppling, organisationer, företag, idrott, kulturutövare, social hjälp eller vård utan studiekoppling.

`index.json` innehåller metadata som `totalOriginalCount`, `totalFilteredCount`, `filterDescription`, `generatedAt`, `fieldChunks` och `idToChunk`. Appen använder detta för att fortsätta ladda stipendier stegvis utan att hämta hela databasen på mobil.
