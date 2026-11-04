# Parquet Viewer for Orca

Opens Apache Parquet files (`.parquet`, `.parq`) in Orca's editor, read-only.

- **Data**: a grid that draws only the rows and columns on screen, so wide and long files scroll
  smoothly. Nested values (lists, structs, maps) show as compact JSON; `null` is marked; binary
  shows as text when it is printable UTF-8 and as hex otherwise.
  - Click a column header to sort (ascending, descending, off). Drag a header's edge to resize
    it; double-click the edge to fit the content.
  - **Filter rows** keeps the rows that contain the text in any visible column.
  - **Columns** shows or hides columns.
  - Click a cell to select it; double-click or press Enter for the detail pane with the full
    value. Ctrl+C copies the cell, Ctrl+Shift+C the row as JSON. Arrow keys, Page Up/Down and
    Ctrl+Home/End move around.
  - **Export** saves the rows shown, with the visible columns, as CSV, JSON or JSON Lines.
- **Schema**: the full schema tree with logical and physical types and repetition.
- **Info**: row count, row groups, sizes and compression ratio, the writer, and for each column
  its codec, encodings, sizes, null count and min/max from the file's statistics, plus the
  key-value metadata (pandas and Arrow schemas are pretty-printed).

Reads Snappy, gzip, Zstandard, Brotli, LZ4 and uncompressed files, on Linux, macOS and Windows.
It needs nothing installed and asks for no access beyond showing the files it opens.

## Large files

The file stays in a worker; the page keeps only the rows near what is on screen.

- **Two decoders.** Rows, searches and sorts by number or date are read with
  [parquet-wasm](https://github.com/kylebarron/parquet-wasm) into compact Apache Arrow buffers:
  a million strings are one byte buffer rather than a million objects, and a search matches
  their UTF-8 bytes in place. Everything else, and any client without WebAssembly, uses
  [hyparquet](https://github.com/hyparam/hyparquet).
- **Filter and sort cover the whole file**, one row group at a time, keeping only a match mask
  and a row order. Each search runs in a short-lived worker that is closed when it finishes, so
  its memory goes back at once. A filter skips columns that cannot contain the text (a word in a
  number column). For files over two million cells, search starts when you press Enter rather
  than at every pause in typing; Esc clears it.
- **Memory has a ceiling.** Where hyparquet decodes, the worker first estimates the cost of each
  column chunk from the footer; a chunk over the budget is not decoded, its cells read "(too
  large to load)", and a search says which columns it skipped.
- Orca opens files up to 64 MB in plugin editors.

## Development

```sh
orca plugin dev watch .
orca plugin validate .
```

- `editor/app.js`: the grid, menus, schema and info tabs.
- `editor/reader.js`: footer summary and row reading; `editor/reader-worker.js` runs it off the
  UI thread and keeps the last decoded row group.
- `editor/format.js`: how values are shown, sorted and exported.
- `editor/arrow-search.js`: byte-level search, display windows and sort keys over Arrow data;
  `editor/arrow-values.js` turns Arrow values into the ones hyparquet gives, so both display
  the same.
- `editor/vendor/hyparquet.mjs`: [hyparquet](https://github.com/hyparam/hyparquet) and
  [hyparquet-compressors](https://github.com/hyparam/hyparquet-compressors) (MIT), built from
  `tools/hyparquet-bundle`.
- `editor/vendor/parquet-wasm/` (MIT or Apache-2.0) and `editor/vendor/arrow.mjs` (Apache-2.0),
  from `tools/arrow-bundle`.

## License

MIT. Bundled: hyparquet (MIT), parquet-wasm (MIT or Apache-2.0), Apache Arrow JS (Apache-2.0).
