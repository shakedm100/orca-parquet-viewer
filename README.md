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

Rows load in the background, the ones on screen first. Up to about four million cells stay in
memory; past that, rows load as you scroll to them, and sorting and filtering cover the rows
loaded so far (the status bar says so). Orca opens files up to 64 MB in plugin editors.

## Development

```sh
orca plugin dev watch .
orca plugin validate .
```

- `editor/app.js`: the grid, menus, schema and info tabs.
- `editor/reader.js`: footer summary and row reading; `editor/reader-worker.js` runs it off the
  UI thread and keeps the last decoded row group.
- `editor/format.js`: how values are shown, sorted and exported.
- `editor/vendor/hyparquet.mjs`: [hyparquet](https://github.com/hyparam/hyparquet) and
  [hyparquet-compressors](https://github.com/hyparam/hyparquet-compressors) (MIT), built from
  `tools/hyparquet-bundle`.

## License

MIT.
