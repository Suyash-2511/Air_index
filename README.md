# Saans

Smog-season planner for families. Saans estimates how much PM2.5 each person in a household actually inhales during the day, then ranks practical changes by how much they cut that dose.

> Work in progress. The exposure engine and its tests are in place; the interface and data integrations are being built.

## Run it

```bash
npm install
npm run verify   # typecheck, lint and tests
npm run dev      # http://localhost:3000
```

No API keys are needed to run the tests.

## Exposure model

See [docs/EXPOSURE-MODEL.md](docs/EXPOSURE-MODEL.md) for the formula, the sourced breathing rates, and every modelling assumption.

## Acknowledgements & Data Credits

Global planetary surface imagery and city lights textures are courtesy of NASA Earth Observatory and NASA's Black Marble / Visible Infrared Imaging Radiometer Suite (VIIRS) day-night band datasets (public domain).
