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

- **Filter and sort cover the whole file.** The worker streams it one column of one row group
  at a time, keeping only a match mask and a row order. A filter skips columns that cannot
  contain the text (a word in a number column). For files over two million cells, search starts
  when you press Enter rather than at every pause in typing; Esc clears it.
- **Memory has a ceiling.** Parquet readers decode a column chunk (one column of one row group)
  whole, so before decoding one the worker estimates its cost from the footer. A chunk over the
  budget (a nested column in a very large row group, say) is not decoded: its cells read "(too
  large to load)", a search says which columns it skipped, and such a column cannot be sorted.
- **Page indexes help.** When the writer stored an offset index (`write_page_index=True` in
  pyarrow; Spark, DuckDB and Polars can too), showing rows decodes only their pages instead of
  the whole row group.
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
- `editor/vendor/hyparquet.mjs`: [hyparquet](https://github.com/hyparam/hyparquet) and
  [hyparquet-compressors](https://github.com/hyparam/hyparquet-compressors) (MIT), built from
  `tools/hyparquet-bundle`.

## License

MIT.
