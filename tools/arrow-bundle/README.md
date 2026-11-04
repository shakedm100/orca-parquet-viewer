# Arrow and parquet-wasm

`editor/vendor/arrow.mjs` is Apache Arrow JS bundled from `entry.js`, and
`editor/vendor/parquet-wasm/` is parquet-wasm's published browser build (a Rust Parquet reader
compiled to WebAssembly; source at https://github.com/kylebarron/parquet-wasm), both at the
versions in `package.json`:

```sh
cd tools/arrow-bundle
npm install
npm run build
```
