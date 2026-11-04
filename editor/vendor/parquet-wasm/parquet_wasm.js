/* @ts-self-types="./parquet_wasm.d.ts" */

/**
 * Metadata for a Parquet column chunk.
 */
export class ColumnChunkMetaData {
    static __wrap(ptr) {
        const obj = Object.create(ColumnChunkMetaData.prototype);
        obj.__wbg_ptr = ptr;
        ColumnChunkMetaDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ColumnChunkMetaDataFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_columnchunkmetadata_free(ptr, 0);
    }
    /**
     * Path (or identifier) of this column.
     * @returns {string[]}
     */
    columnPath() {
        const ret = wasm.columnchunkmetadata_columnPath(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns the total compressed data size of this column chunk.
     * @returns {number}
     */
    compressedSize() {
        const ret = wasm.columnchunkmetadata_compressedSize(this.__wbg_ptr);
        return ret;
    }
    /**
     * Compression for this column.
     * @returns {Compression}
     */
    compression() {
        const ret = wasm.columnchunkmetadata_compression(this.__wbg_ptr);
        return ret;
    }
    /**
     * All encodings used for this column.
     * @returns {Encoding[]}
     */
    encodings() {
        const ret = wasm.columnchunkmetadata_encodings(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Byte offset in `file_path()`.
     * @returns {bigint}
     */
    fileOffset() {
        const ret = wasm.columnchunkmetadata_fileOffset(this.__wbg_ptr);
        return ret;
    }
    /**
     * File where the column chunk is stored.
     *
     * If not set, assumed to belong to the same file as the metadata.
     * This path is relative to the current file.
     * @returns {string | undefined}
     */
    filePath() {
        const ret = wasm.columnchunkmetadata_filePath(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]);
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Total number of values in this column chunk.
     * @returns {number}
     */
    numValues() {
        const ret = wasm.columnchunkmetadata_numValues(this.__wbg_ptr);
        return ret;
    }
    /**
     * Returns the total uncompressed data size of this column chunk.
     * @returns {number}
     */
    uncompressedSize() {
        const ret = wasm.columnchunkmetadata_uncompressedSize(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) ColumnChunkMetaData.prototype[Symbol.dispose] = ColumnChunkMetaData.prototype.free;

/**
 * Supported compression algorithms.
 *
 * Codecs added in format version X.Y can be read by readers based on X.Y and later.
 * Codec support may vary between readers based on the format version and
 * libraries available at runtime.
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}
 */
export const Compression = Object.freeze({
    UNCOMPRESSED: 0, "0": "UNCOMPRESSED",
    SNAPPY: 1, "1": "SNAPPY",
    GZIP: 2, "2": "GZIP",
    BROTLI: 3, "3": "BROTLI",
    /**
     * @deprecated as of Parquet 2.9.0.
     * Switch to LZ4_RAW
     */
    LZ4: 4, "4": "LZ4",
    ZSTD: 5, "5": "ZSTD",
    LZ4_RAW: 6, "6": "LZ4_RAW",
    LZO: 7, "7": "LZO",
});

/**
 * Controls the level of statistics to be computed by the writer
 * @enum {0 | 1 | 2}
 */
export const EnabledStatistics = Object.freeze({
    /**
     * Compute no statistics
     */
    None: 0, "0": "None",
    /**
     * Compute chunk-level statistics but not page-level
     */
    Chunk: 1, "1": "Chunk",
    /**
     * Compute page-level and chunk-level statistics
     */
    Page: 2, "2": "Page",
});

/**
 * Encodings supported by Parquet.
 * Not all encodings are valid for all types. These enums are also used to specify the
 * encoding of definition and repetition levels.
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}
 */
export const Encoding = Object.freeze({
    /**
     * Default byte encoding.
     * - BOOLEAN - 1 bit per value, 0 is false; 1 is true.
     * - INT32 - 4 bytes per value, stored as little-endian.
     * - INT64 - 8 bytes per value, stored as little-endian.
     * - FLOAT - 4 bytes per value, stored as little-endian.
     * - DOUBLE - 8 bytes per value, stored as little-endian.
     * - BYTE_ARRAY - 4 byte length stored as little endian, followed by bytes.
     * - FIXED_LEN_BYTE_ARRAY - just the bytes are stored.
     */
    PLAIN: 0, "0": "PLAIN",
    /**
     * **Deprecated** dictionary encoding.
     *
     * The values in the dictionary are encoded using PLAIN encoding.
     * Since it is deprecated, RLE_DICTIONARY encoding is used for a data page, and
     * PLAIN encoding is used for dictionary page.
     */
    PLAIN_DICTIONARY: 1, "1": "PLAIN_DICTIONARY",
    /**
     * Group packed run length encoding.
     *
     * Usable for definition/repetition levels encoding and boolean values.
     */
    RLE: 2, "2": "RLE",
    /**
     * Bit packed encoding.
     *
     * This can only be used if the data has a known max width.
     * Usable for definition/repetition levels encoding.
     */
    BIT_PACKED: 3, "3": "BIT_PACKED",
    /**
     * Delta encoding for integers, either INT32 or INT64.
     *
     * Works best on sorted data.
     */
    DELTA_BINARY_PACKED: 4, "4": "DELTA_BINARY_PACKED",
    /**
     * Encoding for byte arrays to separate the length values and the data.
     *
     * The lengths are encoded using DELTA_BINARY_PACKED encoding.
     */
    DELTA_LENGTH_BYTE_ARRAY: 5, "5": "DELTA_LENGTH_BYTE_ARRAY",
    /**
     * Incremental encoding for byte arrays.
     *
     * Prefix lengths are encoded using DELTA_BINARY_PACKED encoding.
     * Suffixes are stored using DELTA_LENGTH_BYTE_ARRAY encoding.
     */
    DELTA_BYTE_ARRAY: 6, "6": "DELTA_BYTE_ARRAY",
    /**
     * Dictionary encoding.
     *
     * The ids are encoded using the RLE encoding.
     */
    RLE_DICTIONARY: 7, "7": "RLE_DICTIONARY",
    /**
     * Encoding for floating-point data.
     *
     * K byte-streams are created where K is the size in bytes of the data type.
     * The individual bytes of an FP value are scattered to the corresponding stream and
     * the streams are concatenated.
     * This itself does not reduce the size of the data but can lead to better compression
     * afterwards.
     */
    BYTE_STREAM_SPLIT: 8, "8": "BYTE_STREAM_SPLIT",
    /**
     * Adaptive Lossless floating-Point encoding (ALP).
     *
     * Currently specified for FLOAT and DOUBLE.
     */
    ALP: 9, "9": "ALP",
});

/**
 * An Arrow array exported to FFI.
 *
 * Using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi), you can view or copy Arrow
 * these objects to JavaScript.
 *
 * Note that this also includes an ArrowSchema C struct as well, so that extension type
 * information can be maintained.
 * ## Memory management
 *
 * Note that this array will not be released automatically. You need to manually call `.free()` to
 * release memory.
 */
export class FFIData {
    static __wrap(ptr) {
        const obj = Object.create(FFIData.prototype);
        obj.__wbg_ptr = ptr;
        FFIDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FFIDataFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ffidata_free(ptr, 0);
    }
    /**
     * Access the pointer to the
     * [`ArrowArray`](https://arrow.apache.org/docs/format/CDataInterface.html#structure-definitions)
     * struct. This can be viewed or copied (without serialization) to an Arrow JS `RecordBatch` by
     * using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi). You can access the
     * [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)
     * instance by using {@linkcode wasmMemory}.
     *
     * **Example**:
     *
     * ```ts
     * import { parseRecordBatch } from "arrow-js-ffi";
     *
     * const wasmRecordBatch: FFIRecordBatch = ...
     * const wasmMemory: WebAssembly.Memory = wasmMemory();
     *
     * // Pass `true` to copy arrays across the boundary instead of creating views.
     * const jsRecordBatch = parseRecordBatch(
     *   wasmMemory.buffer,
     *   wasmRecordBatch.arrayAddr(),
     *   wasmRecordBatch.schemaAddr(),
     *   true
     * );
     * ```
     * @returns {number}
     */
    arrayAddr() {
        const ret = wasm.ffidata_arrayAddr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Access the pointer to the
     * [`ArrowSchema`](https://arrow.apache.org/docs/format/CDataInterface.html#structure-definitions)
     * struct. This can be viewed or copied (without serialization) to an Arrow JS `Field` by
     * using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi). You can access the
     * [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)
     * instance by using {@linkcode wasmMemory}.
     *
     * **Example**:
     *
     * ```ts
     * import { parseRecordBatch } from "arrow-js-ffi";
     *
     * const wasmRecordBatch: FFIRecordBatch = ...
     * const wasmMemory: WebAssembly.Memory = wasmMemory();
     *
     * // Pass `true` to copy arrays across the boundary instead of creating views.
     * const jsRecordBatch = parseRecordBatch(
     *   wasmMemory.buffer,
     *   wasmRecordBatch.arrayAddr(),
     *   wasmRecordBatch.schemaAddr(),
     *   true
     * );
     * ```
     * @returns {number}
     */
    schemaAddr() {
        const ret = wasm.ffidata_schemaAddr(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) FFIData.prototype[Symbol.dispose] = FFIData.prototype.free;

export class FFISchema {
    static __wrap(ptr) {
        const obj = Object.create(FFISchema.prototype);
        obj.__wbg_ptr = ptr;
        FFISchemaFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FFISchemaFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ffischema_free(ptr, 0);
    }
    /**
     * Access the pointer to the
     * [`ArrowSchema`](https://arrow.apache.org/docs/format/CDataInterface.html#structure-definitions)
     * struct. This can be viewed or copied (without serialization) to an Arrow JS `Field` by
     * using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi). You can access the
     * [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)
     * instance by using {@linkcode wasmMemory}.
     *
     * **Example**:
     *
     * ```ts
     * import { parseRecordBatch } from "arrow-js-ffi";
     *
     * const wasmRecordBatch: FFIRecordBatch = ...
     * const wasmMemory: WebAssembly.Memory = wasmMemory();
     *
     * // Pass `true` to copy arrays across the boundary instead of creating views.
     * const jsRecordBatch = parseRecordBatch(
     *   wasmMemory.buffer,
     *   wasmRecordBatch.arrayAddr(),
     *   wasmRecordBatch.schemaAddr(),
     *   true
     * );
     * ```
     * @returns {number}
     */
    addr() {
        const ret = wasm.ffischema_addr(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) FFISchema.prototype[Symbol.dispose] = FFISchema.prototype.free;

/**
 * A representation of an Arrow C Stream in WebAssembly memory exposed as FFI-compatible
 * structs through the Arrow C Data Interface.
 *
 * Unlike other Arrow implementations outside of JS, this always stores the "stream" fully
 * materialized as a sequence of Arrow chunks.
 */
export class FFIStream {
    static __wrap(ptr) {
        const obj = Object.create(FFIStream.prototype);
        obj.__wbg_ptr = ptr;
        FFIStreamFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FFIStreamFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ffistream_free(ptr, 0);
    }
    /**
     * Get the pointer to one ArrowArray FFI struct for a given chunk index and column index
     *
     * Access the pointer to one
     * [`ArrowArray`](https://arrow.apache.org/docs/format/CDataInterface.html#structure-definitions)
     * struct representing one of the internal `RecordBatch`es. This can be viewed or copied (without serialization) to an Arrow JS `RecordBatch` by
     * using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi). You can access the
     * [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)
     * instance by using {@linkcode wasmMemory}.
     *
     * **Example**:
     *
     * ```ts
     * import * as arrow from "apache-arrow";
     * import { parseRecordBatch } from "arrow-js-ffi";
     *
     * const wasmTable: FFITable = ...
     * const wasmMemory: WebAssembly.Memory = wasmMemory();
     *
     * const jsBatches: arrow.RecordBatch[] = []
     * for (let i = 0; i < wasmTable.numBatches(); i++) {
     *   // Pass `true` to copy arrays across the boundary instead of creating views.
     *   const jsRecordBatch = parseRecordBatch(
     *     wasmMemory.buffer,
     *     wasmTable.arrayAddr(i),
     *     wasmTable.schemaAddr(),
     *     true
     *   );
     *   jsBatches.push(jsRecordBatch);
     * }
     * const jsTable = new arrow.Table(jsBatches);
     * ```
     *
     * @param chunk number The chunk index to use
     * @returns number pointer to an ArrowArray FFI struct in Wasm memory
     * @param {number} chunk
     * @returns {number}
     */
    arrayAddr(chunk) {
        const ret = wasm.ffistream_arrayAddr(this.__wbg_ptr, chunk);
        return ret >>> 0;
    }
    /**
     * @returns {Uint32Array}
     */
    arrayAddrs() {
        const ret = wasm.ffistream_arrayAddrs(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    drop() {
        const ptr = this.__destroy_into_raw();
        wasm.ffistream_drop(ptr);
    }
    /**
     * Get the total number of elements in this stream
     * @returns {number}
     */
    numArrays() {
        const ret = wasm.ffistream_numArrays(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the pointer to the ArrowSchema FFI struct
     * @returns {number}
     */
    schemaAddr() {
        const ret = wasm.ffistream_schemaAddr(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) FFIStream.prototype[Symbol.dispose] = FFIStream.prototype.free;

/**
 * Metadata for a Parquet file.
 */
export class FileMetaData {
    static __wrap(ptr) {
        const obj = Object.create(FileMetaData.prototype);
        obj.__wbg_ptr = ptr;
        FileMetaDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FileMetaDataFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_filemetadata_free(ptr, 0);
    }
    /**
     * String message for application that wrote this file.
     *
     * This should have the following format:
     * `<application> version <application version> (build <application build hash>)`.
     *
     * ```shell
     * parquet-mr version 1.8.0 (build 0fda28af84b9746396014ad6a415b90592a98b3b)
     * ```
     * @returns {string | undefined}
     */
    createdBy() {
        const ret = wasm.filemetadata_createdBy(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]);
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Returns key_value_metadata of this file.
     * @returns {Map<any, any>}
     */
    keyValueMetadata() {
        const ret = wasm.filemetadata_keyValueMetadata(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Returns number of rows in the file.
     * @returns {number}
     */
    numRows() {
        const ret = wasm.filemetadata_numRows(this.__wbg_ptr);
        return ret;
    }
    /**
     * Returns version of this file.
     * @returns {number}
     */
    version() {
        const ret = wasm.filemetadata_version(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) FileMetaData.prototype[Symbol.dispose] = FileMetaData.prototype.free;

export class IntoUnderlyingByteSource {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingByteSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingbytesource_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get autoAllocateChunkSize() {
        const ret = wasm.intounderlyingbytesource_autoAllocateChunkSize(this.__wbg_ptr);
        return ret >>> 0;
    }
    cancel() {
        const ptr = this.__destroy_into_raw();
        wasm.intounderlyingbytesource_cancel(ptr);
    }
    /**
     * @param {ReadableByteStreamController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        const ret = wasm.intounderlyingbytesource_pull(this.__wbg_ptr, controller);
        return ret;
    }
    /**
     * @param {ReadableByteStreamController} controller
     */
    start(controller) {
        wasm.intounderlyingbytesource_start(this.__wbg_ptr, controller);
    }
    /**
     * @returns {ReadableStreamType}
     */
    get type() {
        const ret = wasm.intounderlyingbytesource_type(this.__wbg_ptr);
        return __wbindgen_enum_ReadableStreamType[ret];
    }
}
if (Symbol.dispose) IntoUnderlyingByteSource.prototype[Symbol.dispose] = IntoUnderlyingByteSource.prototype.free;

export class IntoUnderlyingSink {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSinkFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingsink_free(ptr, 0);
    }
    /**
     * @param {any} reason
     * @returns {Promise<any>}
     */
    abort(reason) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.intounderlyingsink_abort(ptr, reason);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    close() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.intounderlyingsink_close(ptr);
        return ret;
    }
    /**
     * @param {any} chunk
     * @returns {Promise<any>}
     */
    write(chunk) {
        const ret = wasm.intounderlyingsink_write(this.__wbg_ptr, chunk);
        return ret;
    }
}
if (Symbol.dispose) IntoUnderlyingSink.prototype[Symbol.dispose] = IntoUnderlyingSink.prototype.free;

export class IntoUnderlyingSource {
    static __wrap(ptr) {
        const obj = Object.create(IntoUnderlyingSource.prototype);
        obj.__wbg_ptr = ptr;
        IntoUnderlyingSourceFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        IntoUnderlyingSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_intounderlyingsource_free(ptr, 0);
    }
    cancel() {
        const ptr = this.__destroy_into_raw();
        wasm.intounderlyingsource_cancel(ptr);
    }
    /**
     * @param {ReadableStreamDefaultController} controller
     * @returns {Promise<any>}
     */
    pull(controller) {
        const ret = wasm.intounderlyingsource_pull(this.__wbg_ptr, controller);
        return ret;
    }
}
if (Symbol.dispose) IntoUnderlyingSource.prototype[Symbol.dispose] = IntoUnderlyingSource.prototype.free;

export class ParquetFile {
    static __wrap(ptr) {
        const obj = Object.create(ParquetFile.prototype);
        obj.__wbg_ptr = ptr;
        ParquetFileFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ParquetFileFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_parquetfile_free(ptr, 0);
    }
    /**
     * Construct a ParquetFile from a new [Blob] or [File] handle.
     *
     * [Blob]: https://developer.mozilla.org/en-US/docs/Web/API/Blob
     * [File]: https://developer.mozilla.org/en-US/docs/Web/API/File
     *
     * Safety: Do not use this in a multi-threaded environment,
     * (transitively depends on `!Send` `web_sys::Blob`)
     * @param {Blob} handle
     * @returns {Promise<ParquetFile>}
     */
    static fromFile(handle) {
        const ret = wasm.parquetfile_fromFile(handle);
        return ret;
    }
    /**
     * Construct a ParquetFile from a new URL.
     * @param {string} url
     * @returns {Promise<ParquetFile>}
     */
    static fromUrl(url) {
        const ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.parquetfile_fromUrl(ptr0, len0);
        return ret;
    }
    /**
     * @returns {ParquetMetaData}
     */
    metadata() {
        const ret = wasm.parquetfile_metadata(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ParquetMetaData.__wrap(ret[0]);
    }
    /**
     * Read from the Parquet file in an async fashion.
     *
     * @param options
     *
     *    Options for reading Parquet data. Optional keys include:
     *
     *    - `batchSize`: The number of rows in each batch. If not provided, the upstream parquet
     *           default is 1024.
     *    - `rowGroups`: Only read data from the provided row group indexes.
     *    - `limit`: Provide a limit to the number of rows to be read.
     *    - `offset`: Provide an offset to skip over the given number of rows.
     *    - `columns`: The column names from the file to read.
     * @param {ReaderOptions | null} [options]
     * @returns {Promise<Table>}
     */
    read(options) {
        const ret = wasm.parquetfile_read(this.__wbg_ptr, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        return ret;
    }
    /**
     * @returns {Schema}
     */
    schema() {
        const ret = wasm.parquetfile_schema(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Schema.__wrap(ret[0]);
    }
    /**
     * Create a readable stream of record batches.
     *
     * Each item in the stream will be a {@linkcode RecordBatch}.
     *
     * @param options
     *
     *    Options for reading Parquet data. Optional keys include:
     *
     *    - `batchSize`: The number of rows in each batch. If not provided, the upstream parquet
     *           default is 1024.
     *    - `rowGroups`: Only read data from the provided row group indexes.
     *    - `limit`: Provide a limit to the number of rows to be read.
     *    - `offset`: Provide an offset to skip over the given number of rows.
     *    - `columns`: The column names from the file to read.
     *    - `concurrency`: The number of concurrent requests to make
     * @param {ReaderOptions | null} [options]
     * @returns {Promise<ReadableStream>}
     */
    stream(options) {
        const ret = wasm.parquetfile_stream(this.__wbg_ptr, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        return ret;
    }
}
if (Symbol.dispose) ParquetFile.prototype[Symbol.dispose] = ParquetFile.prototype.free;

/**
 * Global Parquet metadata.
 */
export class ParquetMetaData {
    static __wrap(ptr) {
        const obj = Object.create(ParquetMetaData.prototype);
        obj.__wbg_ptr = ptr;
        ParquetMetaDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ParquetMetaDataFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_parquetmetadata_free(ptr, 0);
    }
    /**
     * Returns file metadata as reference.
     * @returns {FileMetaData}
     */
    fileMetadata() {
        const ret = wasm.parquetmetadata_fileMetadata(this.__wbg_ptr);
        return FileMetaData.__wrap(ret);
    }
    /**
     * Returns number of row groups in this file.
     * @returns {number}
     */
    numRowGroups() {
        const ret = wasm.parquetmetadata_numRowGroups(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Returns row group metadata for `i`th position.
     * Position should be less than number of row groups `num_row_groups`.
     * @param {number} i
     * @returns {RowGroupMetaData}
     */
    rowGroup(i) {
        const ret = wasm.parquetmetadata_rowGroup(this.__wbg_ptr, i);
        return RowGroupMetaData.__wrap(ret);
    }
    /**
     * Returns row group metadata for all row groups
     * @returns {RowGroupMetaData[]}
     */
    rowGroups() {
        const ret = wasm.parquetmetadata_rowGroups(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}
if (Symbol.dispose) ParquetMetaData.prototype[Symbol.dispose] = ParquetMetaData.prototype.free;

/**
 * A group of columns of equal length in WebAssembly memory with an associated {@linkcode Schema}.
 */
export class RecordBatch {
    static __wrap(ptr) {
        const obj = Object.create(RecordBatch.prototype);
        obj.__wbg_ptr = ptr;
        RecordBatchFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    static __unwrap(jsValue) {
        if (!(jsValue instanceof RecordBatch)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RecordBatchFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_recordbatch_free(ptr, 0);
    }
    /**
     * Returns the total number of bytes of memory occupied physically by this batch.
     * @returns {number}
     */
    getArrayMemorySize() {
        const ret = wasm.recordbatch_getArrayMemorySize(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Export this RecordBatch to FFI structs according to the Arrow C Data Interface.
     *
     * This method **does consume** the RecordBatch, so the original RecordBatch will be
     * inaccessible after this call. You must still call {@linkcode FFIRecordBatch.free} after
     * you've finished using the FFIRecordBatch.
     * @returns {FFIData}
     */
    intoFFI() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.recordbatch_intoFFI(ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return FFIData.__wrap(ret[0]);
    }
    /**
     * Consume this RecordBatch and convert to an Arrow IPC Stream buffer
     * @returns {Uint8Array}
     */
    intoIPCStream() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.recordbatch_intoIPCStream(ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * The number of columns in this RecordBatch.
     * @returns {number}
     */
    get numColumns() {
        const ret = wasm.recordbatch_numColumns(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * The number of rows in this RecordBatch.
     * @returns {number}
     */
    get numRows() {
        const ret = wasm.recordbatch_numRows(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * The {@linkcode Schema} of this RecordBatch.
     * @returns {Schema}
     */
    get schema() {
        const ret = wasm.recordbatch_schema(this.__wbg_ptr);
        return Schema.__wrap(ret);
    }
    /**
     * Return a new RecordBatch where each column is sliced
     * according to `offset` and `length`
     * @param {number} offset
     * @param {number} length
     * @returns {RecordBatch}
     */
    slice(offset, length) {
        const ret = wasm.recordbatch_slice(this.__wbg_ptr, offset, length);
        return RecordBatch.__wrap(ret);
    }
    /**
     * Export this RecordBatch to FFI structs according to the Arrow C Data Interface.
     *
     * This method **does not consume** the RecordBatch, so you must remember to call {@linkcode
     * RecordBatch.free} to release the resources. The underlying arrays are reference counted, so
     * this method does not copy data, it only prevents the data from being released.
     * @returns {FFIData}
     */
    toFFI() {
        const ret = wasm.recordbatch_toFFI(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return FFIData.__wrap(ret[0]);
    }
    /**
     * Override the schema of this [`RecordBatch`]
     *
     * Returns an error if `schema` is not a superset of the current schema
     * as determined by [`Schema::contains`]
     * @param {Schema} schema
     * @returns {RecordBatch}
     */
    withSchema(schema) {
        _assertClass(schema, Schema);
        var ptr0 = schema.__destroy_into_raw();
        const ret = wasm.recordbatch_withSchema(this.__wbg_ptr, ptr0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RecordBatch.__wrap(ret[0]);
    }
}
if (Symbol.dispose) RecordBatch.prototype[Symbol.dispose] = RecordBatch.prototype.free;

/**
 * Metadata for a Parquet row group.
 */
export class RowGroupMetaData {
    static __wrap(ptr) {
        const obj = Object.create(RowGroupMetaData.prototype);
        obj.__wbg_ptr = ptr;
        RowGroupMetaDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RowGroupMetaDataFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rowgroupmetadata_free(ptr, 0);
    }
    /**
     * Returns column chunk metadata for `i`th column.
     * @param {number} i
     * @returns {ColumnChunkMetaData}
     */
    column(i) {
        const ret = wasm.rowgroupmetadata_column(this.__wbg_ptr, i);
        return ColumnChunkMetaData.__wrap(ret);
    }
    /**
     * Returns column chunk metadata for all columns
     * @returns {ColumnChunkMetaData[]}
     */
    columns() {
        const ret = wasm.rowgroupmetadata_columns(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Total size of all compressed column data in this row group.
     * @returns {number}
     */
    compressedSize() {
        const ret = wasm.rowgroupmetadata_compressedSize(this.__wbg_ptr);
        return ret;
    }
    /**
     * Number of columns in this row group.
     * @returns {number}
     */
    numColumns() {
        const ret = wasm.rowgroupmetadata_numColumns(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of rows in this row group.
     * @returns {number}
     */
    numRows() {
        const ret = wasm.rowgroupmetadata_numRows(this.__wbg_ptr);
        return ret;
    }
    /**
     * Total byte size of all uncompressed column data in this row group.
     * @returns {number}
     */
    totalByteSize() {
        const ret = wasm.rowgroupmetadata_totalByteSize(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) RowGroupMetaData.prototype[Symbol.dispose] = RowGroupMetaData.prototype.free;

/**
 * A named collection of types that defines the column names and types in a RecordBatch or Table
 * data structure.
 *
 * A Schema can also contain extra user-defined metadata either at the Table or Column level.
 * Column-level metadata is often used to define [extension
 * types](https://arrow.apache.org/docs/format/Columnar.html#extension-types).
 */
export class Schema {
    static __wrap(ptr) {
        const obj = Object.create(Schema.prototype);
        obj.__wbg_ptr = ptr;
        SchemaFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SchemaFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_schema_free(ptr, 0);
    }
    /**
     * Find the index of the column with the given name.
     * @param {string} name
     * @returns {number}
     */
    indexOf(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.schema_indexOf(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] >>> 0;
    }
    /**
     * Export this Table to FFI structs according to the Arrow C Data Interface.
     *
     * This method **does consume** the Table, so the original Table will be
     * inaccessible after this call. You must still call {@linkcode FFITable.free} after
     * you've finished using the FFITable.
     * @returns {FFISchema}
     */
    intoFFI() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.schema_intoFFI(ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return FFISchema.__wrap(ret[0]);
    }
    /**
     * Consume this schema and convert to an Arrow IPC Stream buffer
     * @returns {Uint8Array}
     */
    intoIPCStream() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.schema_intoIPCStream(ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Returns an immutable reference to the Map of custom metadata key-value pairs.
     * @returns {SchemaMetadata}
     */
    metadata() {
        const ret = wasm.schema_metadata(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Export this schema to an FFISchema object, which can be read with arrow-js-ffi.
     *
     * This method **does not consume** the Schema, so you must remember to call {@linkcode
     * Schema.free} to release the resources. The underlying arrays are reference counted, so
     * this method does not copy data, it only prevents the data from being released.
     * @returns {FFISchema}
     */
    toFFI() {
        const ret = wasm.schema_toFFI(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return FFISchema.__wrap(ret[0]);
    }
    /**
     * Sets the metadata of this `Schema` to be `metadata` and returns a new object
     * @param {SchemaMetadata} metadata
     * @returns {Schema}
     */
    withMetadata(metadata) {
        const ret = wasm.schema_withMetadata(this.__wbg_ptr, metadata);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Schema.__wrap(ret[0]);
    }
}
if (Symbol.dispose) Schema.prototype[Symbol.dispose] = Schema.prototype.free;

/**
 * A Table in WebAssembly memory conforming to the Apache Arrow spec.
 *
 * A Table consists of one or more {@linkcode RecordBatch} objects plus a {@linkcode Schema} that
 * each RecordBatch conforms to.
 */
export class Table {
    static __wrap(ptr) {
        const obj = Object.create(Table.prototype);
        obj.__wbg_ptr = ptr;
        TableFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TableFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_table_free(ptr, 0);
    }
    /**
     * Create a table from an Arrow IPC Stream buffer
     * @param {Uint8Array} buf
     * @returns {Table}
     */
    static fromIPCStream(buf) {
        const ptr0 = passArray8ToWasm0(buf, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.table_fromIPCStream(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Table.__wrap(ret[0]);
    }
    /**
     * Returns the total number of bytes of memory occupied physically by all batches in this
     * table.
     * @returns {number}
     */
    getArrayMemorySize() {
        const ret = wasm.table_getArrayMemorySize(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Export this Table to FFI structs according to the Arrow C Data Interface.
     *
     * This method **does consume** the Table, so the original Table will be
     * inaccessible after this call. You must still call {@linkcode FFITable.free} after
     * you've finished using the FFITable.
     * @returns {FFIStream}
     */
    intoFFI() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.table_intoFFI(ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return FFIStream.__wrap(ret[0]);
    }
    /**
     * Consume this table and convert to an Arrow IPC Stream buffer
     * @returns {Uint8Array}
     */
    intoIPCStream() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.table_intoIPCStream(ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * The number of batches in the Table
     * @returns {number}
     */
    get numBatches() {
        const ret = wasm.table_numBatches(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Access a RecordBatch from the Table by index.
     *
     * @param index The positional index of the RecordBatch to retrieve.
     * @returns a RecordBatch or `null` if out of range.
     * @param {number} index
     * @returns {RecordBatch | undefined}
     */
    recordBatch(index) {
        const ret = wasm.table_recordBatch(this.__wbg_ptr, index);
        return ret === 0 ? undefined : RecordBatch.__wrap(ret);
    }
    /**
     * @returns {RecordBatch[]}
     */
    recordBatches() {
        const ret = wasm.table_recordBatches(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Access the Table's {@linkcode Schema}.
     * @returns {Schema}
     */
    get schema() {
        const ret = wasm.table_schema(this.__wbg_ptr);
        return Schema.__wrap(ret);
    }
    /**
     * Export this Table to FFI structs according to the Arrow C Data Interface.
     *
     * This method **does not consume** the Table, so you must remember to call {@linkcode
     * Table.free} to release the resources. The underlying arrays are reference counted, so
     * this method does not copy data, it only prevents the data from being released.
     * @returns {FFIStream}
     */
    toFFI() {
        const ret = wasm.table_toFFI(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return FFIStream.__wrap(ret[0]);
    }
}
if (Symbol.dispose) Table.prototype[Symbol.dispose] = Table.prototype.free;

/**
 * Immutable struct to hold writing configuration for `writeParquet`.
 *
 * Use {@linkcode WriterPropertiesBuilder} to create a configuration, then call {@linkcode
 * WriterPropertiesBuilder.build} to create an instance of `WriterProperties`.
 */
export class WriterProperties {
    static __wrap(ptr) {
        const obj = Object.create(WriterProperties.prototype);
        obj.__wbg_ptr = ptr;
        WriterPropertiesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WriterPropertiesFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_writerproperties_free(ptr, 0);
    }
}
if (Symbol.dispose) WriterProperties.prototype[Symbol.dispose] = WriterProperties.prototype.free;

/**
 * Builder to create a writing configuration for `writeParquet`
 *
 * Call {@linkcode build} on the finished builder to create an immputable {@linkcode WriterProperties} to pass to `writeParquet`
 */
export class WriterPropertiesBuilder {
    static __wrap(ptr) {
        const obj = Object.create(WriterPropertiesBuilder.prototype);
        obj.__wbg_ptr = ptr;
        WriterPropertiesBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WriterPropertiesBuilderFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_writerpropertiesbuilder_free(ptr, 0);
    }
    /**
     * Finalizes the configuration and returns immutable writer properties struct.
     * @returns {WriterProperties}
     */
    build() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_build(ptr);
        return WriterProperties.__wrap(ret);
    }
    /**
     * Returns default state of the builder.
     */
    constructor() {
        const ret = wasm.writerpropertiesbuilder_new();
        this.__wbg_ptr = ret;
        WriterPropertiesBuilderFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Sets compression codec for a column.
     * Takes precedence over globally defined settings.
     * @param {string} col
     * @param {Compression} value
     * @returns {WriterPropertiesBuilder}
     */
    setColumnCompression(col, value) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(col, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.writerpropertiesbuilder_setColumnCompression(ptr, ptr0, len0, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets flag to enable/disable dictionary encoding for a column.
     * Takes precedence over globally defined settings.
     * @param {string} col
     * @param {boolean} value
     * @returns {WriterPropertiesBuilder}
     */
    setColumnDictionaryEnabled(col, value) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(col, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.writerpropertiesbuilder_setColumnDictionaryEnabled(ptr, ptr0, len0, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets encoding for a column.
     * Takes precedence over globally defined settings.
     *
     * If dictionary is not enabled, this is treated as a primary encoding for this
     * column. In case when dictionary is enabled for this column, either through
     * global defaults or explicitly, this value is considered to be a fallback
     * encoding for this column.
     *
     * Panics if user tries to set dictionary encoding here, regardless of dictionary
     * encoding flag being set.
     * @param {string} col
     * @param {Encoding} value
     * @returns {WriterPropertiesBuilder}
     */
    setColumnEncoding(col, value) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(col, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.writerpropertiesbuilder_setColumnEncoding(ptr, ptr0, len0, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets flag to enable/disable statistics for a column.
     * Takes precedence over globally defined settings.
     * @param {string} col
     * @param {EnabledStatistics} value
     * @returns {WriterPropertiesBuilder}
     */
    setColumnStatisticsEnabled(col, value) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(col, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.writerpropertiesbuilder_setColumnStatisticsEnabled(ptr, ptr0, len0, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets compression codec for any column.
     * @param {Compression} value
     * @returns {WriterPropertiesBuilder}
     */
    setCompression(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setCompression(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * EXPERIMENTAL: Enables content-defined chunking, which writes data pages at boundaries
     * determined by the column values so that unchanged data produces identical bytes
     * across file versions. Omitted options use the upstream defaults.
     *
     * Throws if:
     * - `minChunkSize` is 0
     * - `maxChunkSize` is not greater than `minChunkSize`
     * @param {ContentDefinedChunkingOptions | null} [options]
     * @returns {WriterPropertiesBuilder}
     */
    setContentDefinedChunking(options) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setContentDefinedChunking(ptr, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WriterPropertiesBuilder.__wrap(ret[0]);
    }
    /**
     * Sets "created by" property.
     * @param {string} value
     * @returns {WriterPropertiesBuilder}
     */
    setCreatedBy(value) {
        const ptr = this.__destroy_into_raw();
        const ptr0 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.writerpropertiesbuilder_setCreatedBy(ptr, ptr0, len0);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets data page size limit.
     * @param {number} value
     * @returns {WriterPropertiesBuilder}
     */
    setDataPageSizeLimit(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setDataPageSizeLimit(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets flag to enable/disable dictionary encoding for any column.
     *
     * Use this method to set dictionary encoding, instead of explicitly specifying
     * encoding in `set_encoding` method.
     * @param {boolean} value
     * @returns {WriterPropertiesBuilder}
     */
    setDictionaryEnabled(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setDictionaryEnabled(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets dictionary page size limit.
     * @param {number} value
     * @returns {WriterPropertiesBuilder}
     */
    setDictionaryPageSizeLimit(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setDictionaryPageSizeLimit(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets encoding for any column.
     *
     * If dictionary is not enabled, this is treated as a primary encoding for all
     * columns. In case when dictionary is enabled for any column, this value is
     * considered to be a fallback encoding for that column.
     *
     * Panics if user tries to set dictionary encoding here, regardless of dictionary
     * encoding flag being set.
     * @param {Encoding} value
     * @returns {WriterPropertiesBuilder}
     */
    setEncoding(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setEncoding(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets "key_value_metadata" property.
     * @param {KeyValueMetadata} value
     * @returns {WriterPropertiesBuilder}
     */
    setKeyValueMetadata(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setKeyValueMetadata(ptr, value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return WriterPropertiesBuilder.__wrap(ret[0]);
    }
    /**
     * Sets maximum size of a row group in bytes.
     * @param {number} value
     * @returns {WriterPropertiesBuilder}
     */
    setMaxRowGroupBytes(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setMaxRowGroupBytes(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets maximum number of rows in a row group.
     * @param {number} value
     * @returns {WriterPropertiesBuilder}
     */
    setMaxRowGroupSize(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setMaxRowGroupSize(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets flag to enable/disable statistics for any column.
     * @param {EnabledStatistics} value
     * @returns {WriterPropertiesBuilder}
     */
    setStatisticsEnabled(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setStatisticsEnabled(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets write batch size.
     * @param {number} value
     * @returns {WriterPropertiesBuilder}
     */
    setWriteBatchSize(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setWriteBatchSize(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
    /**
     * Sets writer version.
     * @param {WriterVersion} value
     * @returns {WriterPropertiesBuilder}
     */
    setWriterVersion(value) {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.writerpropertiesbuilder_setWriterVersion(ptr, value);
        return WriterPropertiesBuilder.__wrap(ret);
    }
}
if (Symbol.dispose) WriterPropertiesBuilder.prototype[Symbol.dispose] = WriterPropertiesBuilder.prototype.free;

/**
 * The Parquet version to use when writing
 * @enum {0 | 1}
 */
export const WriterVersion = Object.freeze({
    V1: 0, "0": "V1",
    V2: 1, "1": "V2",
});

/**
 * Returns a handle to this wasm instance's `WebAssembly.Table` which is the indirect function
 * table used by Rust
 * @returns {FunctionTable}
 */
export function _functionTable() {
    const ret = wasm._functionTable();
    return ret;
}

/**
 * Read Parquet metadata from a Parquet file (or footer-only) bytes in memory.
 * @param {Uint8Array} parquet_file
 * @returns {ParquetMetaData}
 */
export function readMetadata(parquet_file) {
    const ptr0 = passArray8ToWasm0(parquet_file, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.readMetadata(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ParquetMetaData.__wrap(ret[0]);
}

/**
 * Read a Parquet file into Arrow data.
 *
 * This returns an Arrow table in WebAssembly memory. To transfer the Arrow table to JavaScript
 * memory you have two options:
 *
 * - (Easier): Call {@linkcode Table.intoIPCStream} to construct a buffer that can be parsed with
 *   Arrow JS's `tableFromIPC` function.
 * - (More performant but bleeding edge): Call {@linkcode Table.intoFFI} to construct a data
 *   representation that can be parsed zero-copy from WebAssembly with
 *   [arrow-js-ffi](https://github.com/kylebarron/arrow-js-ffi) using `parseTable`.
 *
 * Example with IPC stream:
 *
 * ```js
 * import { tableFromIPC } from "apache-arrow";
 * import initWasm, {readParquet} from "parquet-wasm";
 *
 * // Instantiate the WebAssembly context
 * await initWasm();
 *
 * const resp = await fetch("https://example.com/file.parquet");
 * const parquetUint8Array = new Uint8Array(await resp.arrayBuffer());
 * const arrowWasmTable = readParquet(parquetUint8Array);
 * const arrowTable = tableFromIPC(arrowWasmTable.intoIPCStream());
 * ```
 *
 * Example with `arrow-js-ffi`:
 *
 * ```js
 * import { parseTable } from "arrow-js-ffi";
 * import initWasm, {readParquet, wasmMemory} from "parquet-wasm";
 *
 * // Instantiate the WebAssembly context
 * await initWasm();
 * const WASM_MEMORY = wasmMemory();
 *
 * const resp = await fetch("https://example.com/file.parquet");
 * const parquetUint8Array = new Uint8Array(await resp.arrayBuffer());
 * const arrowWasmTable = readParquet(parquetUint8Array);
 * const ffiTable = arrowWasmTable.intoFFI();
 * const arrowTable = parseTable(
 *   WASM_MEMORY.buffer,
 *   ffiTable.arrayAddrs(),
 *   ffiTable.schemaAddr()
 * );
 * ```
 *
 * @param parquet_file Uint8Array containing Parquet data
 * @param options
 *
 *    Options for reading Parquet data. Optional keys include:
 *
 *    - `batchSize`: The number of rows in each batch. If not provided, the upstream parquet
 *           default is 1024.
 *    - `rowGroups`: Only read data from the provided row group indexes.
 *    - `limit`: Provide a limit to the number of rows to be read.
 *    - `offset`: Provide an offset to skip over the given number of rows.
 *    - `columns`: The column names from the file to read.
 * @param {Uint8Array} parquet_file
 * @param {ReaderOptions | null} [options]
 * @returns {Table}
 */
export function readParquet(parquet_file, options) {
    const ptr0 = passArray8ToWasm0(parquet_file, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.readParquet(ptr0, len0, isLikeNone(options) ? 0 : addToExternrefTable0(options));
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return Table.__wrap(ret[0]);
}

/**
 * Read a Parquet file into a stream of Arrow `RecordBatch`es.
 *
 * This returns a ReadableStream containing RecordBatches in WebAssembly memory. To transfer the
 * Arrow table to JavaScript memory you have two options:
 *
 * - (Easier): Call {@linkcode RecordBatch.intoIPCStream} to construct a buffer that can be parsed
 *   with Arrow JS's `tableFromIPC` function. (The table will have a single internal record
 *   batch).
 * - (More performant but bleeding edge): Call {@linkcode RecordBatch.intoFFI} to construct a data
 *   representation that can be parsed zero-copy from WebAssembly with
 *   [arrow-js-ffi](https://github.com/kylebarron/arrow-js-ffi) using `parseRecordBatch`.
 *
 * Example with IPC stream:
 *
 * ```js
 * import { tableFromIPC, Table } from "apache-arrow";
 * import initWasm, {readParquetStream} from "parquet-wasm";
 *
 * // Instantiate the WebAssembly context
 * await initWasm();
 *
 * const stream = await readParquetStream(url);
 *
 * const batches = [];
 * for await (const wasmRecordBatch of stream) {
 *   const arrowTable = tableFromIPC(wasmRecordBatch.intoIPCStream());
 *   batches.push(...arrowTable.batches);
 * }
 * const table = new Table(batches);
 * ```
 *
 * Example with `arrow-js-ffi`:
 *
 * ```js
 * import { Table } from "apache-arrow";
 * import { parseRecordBatch } from "arrow-js-ffi";
 * import initWasm, {readParquetStream, wasmMemory} from "parquet-wasm";
 *
 * // Instantiate the WebAssembly context
 * await initWasm();
 * const WASM_MEMORY = wasmMemory();
 *
 * const stream = await readParquetStream(url);
 *
 * const batches = [];
 * for await (const wasmRecordBatch of stream) {
 *   const ffiRecordBatch = wasmRecordBatch.intoFFI();
 *   const recordBatch = parseRecordBatch(
 *     WASM_MEMORY.buffer,
 *     ffiRecordBatch.arrayAddr(),
 *     ffiRecordBatch.schemaAddr(),
 *     true
 *   );
 *   batches.push(recordBatch);
 * }
 * const table = new Table(batches);
 * ```
 *
 * @param url URL to Parquet file
 * @param {string} url
 * @param {number | null} [content_length]
 * @returns {Promise<ReadableStream>}
 */
export function readParquetStream(url, content_length) {
    const ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.readParquetStream(ptr0, len0, isLikeNone(content_length) ? Number.MAX_SAFE_INTEGER : (content_length) >>> 0);
    return ret;
}

/**
 * Read an Arrow schema from a Parquet file in memory.
 *
 * This returns an Arrow schema in WebAssembly memory. To transfer the Arrow schema to JavaScript
 * memory you have two options:
 *
 * - (Easier): Call {@linkcode Schema.intoIPCStream} to construct a buffer that can be parsed with
 *   Arrow JS's `tableFromIPC` function. This results in an Arrow JS Table with zero rows but a
 *   valid schema.
 * - (More performant but bleeding edge): Call {@linkcode Schema.intoFFI} to construct a data
 *   representation that can be parsed zero-copy from WebAssembly with
 *   [arrow-js-ffi](https://github.com/kylebarron/arrow-js-ffi) using `parseSchema`.
 *
 * Example with IPC Stream:
 *
 * ```js
 * import { tableFromIPC } from "apache-arrow";
 * import initWasm, {readSchema} from "parquet-wasm";
 *
 * // Instantiate the WebAssembly context
 * await initWasm();
 *
 * const resp = await fetch("https://example.com/file.parquet");
 * const parquetUint8Array = new Uint8Array(await resp.arrayBuffer());
 * const arrowWasmSchema = readSchema(parquetUint8Array);
 * const arrowTable = tableFromIPC(arrowWasmSchema.intoIPCStream());
 * const arrowSchema = arrowTable.schema;
 * ```
 *
 * Example with `arrow-js-ffi`:
 *
 * ```js
 * import { parseSchema } from "arrow-js-ffi";
 * import initWasm, {readSchema, wasmMemory} from "parquet-wasm";
 *
 * // Instantiate the WebAssembly context
 * await initWasm();
 * const WASM_MEMORY = wasmMemory();
 *
 * const resp = await fetch("https://example.com/file.parquet");
 * const parquetUint8Array = new Uint8Array(await resp.arrayBuffer());
 * const arrowWasmSchema = readSchema(parquetUint8Array);
 * const ffiSchema = arrowWasmSchema.intoFFI();
 * const arrowTable = parseSchema(WASM_MEMORY.buffer, ffiSchema.addr());
 * const arrowSchema = arrowTable.schema;
 * ```
 *
 * @param parquet_file Uint8Array containing Parquet data
 * @param {Uint8Array} parquet_file
 * @returns {Schema}
 */
export function readSchema(parquet_file) {
    const ptr0 = passArray8ToWasm0(parquet_file, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.readSchema(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return Schema.__wrap(ret[0]);
}

/**
 * Transform a ReadableStream of RecordBatches to a ReadableStream of bytes
 *
 * Browser example with piping to a file via the File System API:
 *
 * ```js
 * import initWasm, {ParquetFile, transformParquetStream} from "parquet-wasm";
 *
 * // Instantiate the WebAssembly context
 * await initWasm();
 *
 * const fileInstance = await ParquetFile.fromUrl("https://example.com/file.parquet");
 * const recordBatchStream = await fileInstance.stream();
 * const serializedParquetStream = await transformParquetStream(recordBatchStream);
 * // NB: requires transient user activation - you would typically do this before ☝️
 * const handle = await window.showSaveFilePicker();
 * const writable = await handle.createWritable();
 * await serializedParquetStream.pipeTo(writable);
 * ```
 *
 * NodeJS (ESM) example with piping to a file:
 * ```js
 * import { open } from "node:fs/promises";
 * import { Writable } from "node:stream";
 * import initWasm, {ParquetFile, transformParquetStream} from "parquet-wasm";
 *
 * // Instantiate the WebAssembly context
 * await initWasm();
 *
 * const fileInstance = await ParquetFile.fromUrl("https://example.com/file.parquet");
 * const recordBatchStream = await fileInstance.stream();
 * const serializedParquetStream = await transformParquetStream(recordBatchStream);
 *
 * // grab a file handle via fsPromises
 * const handle = await open("file.parquet");
 * const destinationStream = Writable.toWeb(handle.createWriteStream());
 * await serializedParquetStream.pipeTo(destinationStream);
 *
 * ```
 * NB: the above is a little contrived - `await writeFile("file.parquet", serializedParquetStream)`
 * is enough for most use cases.
 *
 * Browser kitchen sink example - teeing to the Cache API, using as a streaming post body, transferring
 * to a Web Worker:
 * ```js
 * // prelude elided - see above
 * const serializedParquetStream = await transformParquetStream(recordBatchStream);
 * const [cacheStream, bodyStream] = serializedParquetStream.tee();
 * const postProm = fetch(targetUrl, {
 *     method: "POST",
 *     duplex: "half",
 *     body: bodyStream
 * });
 * const targetCache = await caches.open("foobar");
 * await targetCache.put("https://example.com/file.parquet", new Response(cacheStream));
 * // this could have been done with another tee, but beware of buffering
 * const workerStream = await targetCache.get("https://example.com/file.parquet").body;
 * const worker = new Worker("worker.js");
 * worker.postMessage(workerStream, [workerStream]);
 * await postProm;
 * ```
 *
 * @param stream A {@linkcode ReadableStream} of {@linkcode RecordBatch} instances
 * @param writer_properties (optional) Configuration for writing to Parquet. Use the {@linkcode
 * WriterPropertiesBuilder} to build a writing configuration, then call `.build()` to create an
 * immutable writer properties to pass in here. Freed by this function, so don't call `.free()` on
 * it afterwards or reuse it.
 * @returns ReadableStream containing serialized Parquet data.
 * @param {ReadableStream} stream
 * @param {WriterProperties | null} [writer_properties]
 * @returns {Promise<ReadableStream>}
 */
export function transformParquetStream(stream, writer_properties) {
    let ptr0 = 0;
    if (!isLikeNone(writer_properties)) {
        _assertClass(writer_properties, WriterProperties);
        ptr0 = writer_properties.__destroy_into_raw();
    }
    const ret = wasm.transformParquetStream(stream, ptr0);
    return ret;
}

/**
 * Returns a handle to this wasm instance's `WebAssembly.Memory`
 * @returns {Memory}
 */
export function wasmMemory() {
    const ret = wasm.wasmMemory();
    return ret;
}

/**
 * Write Arrow data to a Parquet file.
 *
 * For example, to create a Parquet file with Snappy compression:
 *
 * ```js
 * import { tableToIPC } from "apache-arrow";
 * // Edit the `parquet-wasm` import as necessary
 * import initWasm, {
 *   Table,
 *   WriterPropertiesBuilder,
 *   Compression,
 *   writeParquet,
 * } from "parquet-wasm";
 *
 * // Instantiate the WebAssembly context
 * await initWasm();
 *
 * // Given an existing arrow JS table under `table`
 * const wasmTable = Table.fromIPCStream(tableToIPC(table, "stream"));
 * const writerProperties = new WriterPropertiesBuilder()
 *   .setCompression(Compression.SNAPPY)
 *   .build();
 * const parquetUint8Array = writeParquet(wasmTable, writerProperties);
 * ```
 *
 * If `writerProperties` is not provided or is `null`, the default writer properties will be used.
 * This is equivalent to `new WriterPropertiesBuilder().build()`.
 *
 * `writeParquet` takes ownership of `table` and `writerProperties` and frees them, so don't call
 * `.free()` on either afterwards (it throws `null pointer passed to rust`) or pass them to another
 * function (it throws `Attempt to use a moved value`). To write the same data again, create a new
 * {@linkcode Table}.
 *
 * @param table A {@linkcode Table} representation in WebAssembly memory. Freed by this function.
 * @param writer_properties (optional) Configuration for writing to Parquet. Use the {@linkcode
 * WriterPropertiesBuilder} to build a writing configuration, then call `.build()` to create an
 * immutable writer properties to pass in here. Freed by this function.
 * @returns Uint8Array containing written Parquet data.
 * @param {Table} table
 * @param {WriterProperties | null} [writer_properties]
 * @returns {Uint8Array}
 */
export function writeParquet(table, writer_properties) {
    _assertClass(table, Table);
    var ptr0 = table.__destroy_into_raw();
    let ptr1 = 0;
    if (!isLikeNone(writer_properties)) {
        _assertClass(writer_properties, WriterProperties);
        ptr1 = writer_properties.__destroy_into_raw();
    }
    const ret = wasm.writeParquet(ptr0, ptr1);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v3;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_67e7344beaa85059: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_Number_c54e7112a3fa7e3e: function(arg0) {
            const ret = Number(arg0);
            return ret;
        },
        __wbg_String_8564e559799eccda: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_bigint_get_as_i64_b482365c149396c8: function(arg0, arg1) {
            const v = arg1;
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_7a12af2b3f899c5a: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_0e68cf47c9cbd9b0: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_function_table_69595ae5c7f77628: function() {
            const ret = wasm.__wbindgen_export;
            return ret;
        },
        __wbg___wbindgen_in_50072d4d6e45c193: function(arg0, arg1) {
            const ret = arg0 in arg1;
            return ret;
        },
        __wbg___wbindgen_is_bigint_60fc0336cb14f5d7: function(arg0) {
            const ret = typeof(arg0) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_fcda5e3902d732fe: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_object_edb6b15aa3afe12e: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_c4f7cb494a2a21f1: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_8c687d0b90d5b524: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_9fdcd3c0a860dd3b: function(arg0, arg1) {
            const ret = arg0 === arg1;
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_3c30021c243b64cd: function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        },
        __wbg___wbindgen_memory_3f8442e22540244f: function() {
            const ret = wasm.memory;
            return ret;
        },
        __wbg___wbindgen_number_get_1dc732b810cb937c: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_92ab86bb19cbc12f: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_5d9e815e6fdf150f: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_997e73d32238e655: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_abort_03f8c5804715cb9a: function(arg0, arg1) {
            arg0.abort(arg1);
        },
        __wbg_abort_76dea11221098ae5: function(arg0) {
            arg0.abort();
        },
        __wbg_append_8e87c13f0f08f8cd: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_arrayBuffer_06f3da76f071d37f: function() { return handleError(function (arg0) {
            const ret = arg0.arrayBuffer();
            return ret;
        }, arguments); },
        __wbg_arrayBuffer_432de2b072afe7fb: function(arg0) {
            const ret = arg0.arrayBuffer();
            return ret;
        },
        __wbg_buffer_4a989bded7035f57: function(arg0) {
            const ret = arg0.buffer;
            return ret;
        },
        __wbg_byobRequest_f161fc37241dd3d4: function(arg0) {
            const ret = arg0.byobRequest;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_byteLength_0ddb1795e2c7e689: function(arg0) {
            const ret = arg0.byteLength;
            return ret;
        },
        __wbg_byteOffset_46eb015f52b6ad7d: function(arg0) {
            const ret = arg0.byteOffset;
            return ret;
        },
        __wbg_call_269c5566fbede3eb: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_call_6bcf8d3e20937e46: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_cancel_c076350a7e8954be: function(arg0) {
            const ret = arg0.cancel();
            return ret;
        },
        __wbg_catch_e2134ef6dcdb69ed: function(arg0, arg1) {
            const ret = arg0.catch(arg1);
            return ret;
        },
        __wbg_clearTimeout_1daad5c6ee4fcd3b: function(arg0) {
            const ret = clearTimeout(arg0);
            return ret;
        },
        __wbg_close_22882088c136df25: function() { return handleError(function (arg0) {
            arg0.close();
        }, arguments); },
        __wbg_close_5c3f1f028070f2f7: function(arg0) {
            const ret = arg0.close();
            return ret;
        },
        __wbg_close_8b609460dd26e367: function() { return handleError(function (arg0) {
            arg0.close();
        }, arguments); },
        __wbg_columnchunkmetadata_new: function(arg0) {
            const ret = ColumnChunkMetaData.__wrap(arg0);
            return ret;
        },
        __wbg_done_cffed884d87aa22e: function(arg0) {
            const ret = arg0.done;
            return ret;
        },
        __wbg_enqueue_6cb545d22db14f33: function() { return handleError(function (arg0, arg1) {
            arg0.enqueue(arg1);
        }, arguments); },
        __wbg_entries_972a87586902cf87: function(arg0) {
            const ret = Object.entries(arg0);
            return ret;
        },
        __wbg_entries_f9de04c09a57314e: function(arg0) {
            const ret = arg0.entries();
            return ret;
        },
        __wbg_fetch_7a37768ab67c5bd8: function(arg0) {
            const ret = fetch(arg0);
            return ret;
        },
        __wbg_fetch_920242d59bac2026: function(arg0, arg1) {
            const ret = arg0.fetch(arg1);
            return ret;
        },
        __wbg_getReader_9facd4f899beac89: function() { return handleError(function (arg0) {
            const ret = arg0.getReader();
            return ret;
        }, arguments); },
        __wbg_getWriter_5a3d7baaf32780c4: function() { return handleError(function (arg0) {
            const ret = arg0.getWriter();
            return ret;
        }, arguments); },
        __wbg_get_6cf5a4d4d8ad3c5a: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_b1f0ab13c737f856: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_done_a668aa62d81fad70: function(arg0) {
            const ret = arg0.done;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg_get_unchecked_363572bdd397d473: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_value_6c62a77c168d825a: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbg_get_with_ref_key_6412cf3094599694: function(arg0, arg1) {
            const ret = arg0[arg1];
            return ret;
        },
        __wbg_has_464f8b9416279d65: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.has(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_headers_2594464ff62969f3: function(arg0) {
            const ret = arg0.headers;
            return ret;
        },
        __wbg_instanceof_ArrayBuffer_d4ff01f8247925ae: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Response_6366a785e400039b: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Response;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_598adc0fef426aa8: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_5674713bb7b79043: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_isSafeInteger_8f51c743827d1ec5: function(arg0) {
            const ret = Number.isSafeInteger(arg0);
            return ret;
        },
        __wbg_iterator_22ddeb808cf55a6f: function() {
            const ret = Symbol.iterator;
            return ret;
        },
        __wbg_length_31bdaf014f5fbde2: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_4e1adc0d42e23620: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_new_0afe64b4dc16ab74: function() { return handleError(function () {
            const ret = new Headers();
            return ret;
        }, arguments); },
        __wbg_new_1da3429bc3c4541c: function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        },
        __wbg_new_4f1be85c9b3162d4: function() { return handleError(function () {
            const ret = new TransformStream();
            return ret;
        }, arguments); },
        __wbg_new_8d36e20aa758e411: function() {
            const ret = new Map();
            return ret;
        },
        __wbg_new_a32a1ab6c6655abe: function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_baa0a0207935dd43: function() { return handleError(function () {
            const ret = new AbortController();
            return ret;
        }, arguments); },
        __wbg_new_bebc3f4757acf305: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_from_slice_4ee02165f9de919e: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_typed_6f8b0d724fe26c07: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke___js_sys_3ebe6d640d24e171___Function_fn_wasm_bindgen_99813b3b1a8e014b___JsValue_____wasm_bindgen_99813b3b1a8e014b___sys__Undefined___js_sys_3ebe6d640d24e171___Function_fn_wasm_bindgen_99813b3b1a8e014b___JsValue_____wasm_bindgen_99813b3b1a8e014b___sys__Undefined_______true_(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_with_byte_offset_aede39235d71ca64: function(arg0, arg1) {
            const ret = new Uint8Array(arg0, arg1 >>> 0);
            return ret;
        },
        __wbg_new_with_byte_offset_and_length_492c969e8b5da8a4: function(arg0, arg1, arg2) {
            const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_new_with_into_underlying_source_fd904252f385f59c: function(arg0, arg1) {
            const ret = new ReadableStream(IntoUnderlyingSource.__wrap(arg0), arg1);
            return ret;
        },
        __wbg_new_with_str_and_init_2f31a77deda127fd: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
            return ret;
        }, arguments); },
        __wbg_next_95053e306b1c3aed: function(arg0) {
            const ret = arg0.next;
            return ret;
        },
        __wbg_next_f31ecb8646d2c605: function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments); },
        __wbg_parquetfile_new: function(arg0) {
            const ret = ParquetFile.__wrap(arg0);
            return ret;
        },
        __wbg_prototypesetcall_ae9f5e7459250748: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_queueMicrotask_85c90f6987555d65: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_queueMicrotask_f6a1fa10b81d1fc0: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_read_31091533ffadf971: function(arg0) {
            const ret = arg0.read();
            return ret;
        },
        __wbg_readable_dd742feaf61adcb9: function(arg0) {
            const ret = arg0.readable;
            return ret;
        },
        __wbg_ready_196967f79af47b0d: function(arg0) {
            const ret = arg0.ready;
            return ret;
        },
        __wbg_recordbatch_new: function(arg0) {
            const ret = RecordBatch.__wrap(arg0);
            return ret;
        },
        __wbg_recordbatch_unwrap: function(arg0) {
            const ret = RecordBatch.__unwrap(arg0);
            return ret;
        },
        __wbg_releaseLock_1538945f5f183d9f: function(arg0) {
            arg0.releaseLock();
        },
        __wbg_releaseLock_508d9818266235f2: function(arg0) {
            arg0.releaseLock();
        },
        __wbg_resolve_35ec7e0c6af4c82c: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_respond_83a71686e927ca32: function() { return handleError(function (arg0, arg1) {
            arg0.respond(arg1 >>> 0);
        }, arguments); },
        __wbg_rowgroupmetadata_new: function(arg0) {
            const ret = RowGroupMetaData.__wrap(arg0);
            return ret;
        },
        __wbg_setTimeout_b4a9096784635514: function(arg0, arg1) {
            const ret = setTimeout(arg0, arg1);
            return ret;
        },
        __wbg_set_5f2ad37e5e02dc7b: function(arg0, arg1, arg2) {
            arg0.set(getArrayU8FromWasm0(arg1, arg2));
        },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_set_bf6dde4923b9b059: function(arg0, arg1, arg2) {
            const ret = arg0.set(arg1, arg2);
            return ret;
        },
        __wbg_set_body_f39cee72c74a5b02: function(arg0, arg1) {
            arg0.body = arg1;
        },
        __wbg_set_cache_6e8c35a5ed76edb1: function(arg0, arg1) {
            arg0.cache = __wbindgen_enum_RequestCache[arg1];
        },
        __wbg_set_credentials_bf1d3e014213a571: function(arg0, arg1) {
            arg0.credentials = __wbindgen_enum_RequestCredentials[arg1];
        },
        __wbg_set_headers_31d373f68f28bf76: function(arg0, arg1) {
            arg0.headers = arg1;
        },
        __wbg_set_high_water_mark_089e3476522036ad: function(arg0, arg1) {
            arg0.highWaterMark = arg1;
        },
        __wbg_set_method_82e6c3c083da0734: function(arg0, arg1, arg2) {
            arg0.method = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_mode_f7e56ed768d0ade0: function(arg0, arg1) {
            arg0.mode = __wbindgen_enum_RequestMode[arg1];
        },
        __wbg_set_referrer_13cf56bbccbb2ceb: function(arg0, arg1, arg2) {
            arg0.referrer = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_referrer_policy_dac1caa6e937479a: function(arg0, arg1) {
            arg0.referrerPolicy = __wbindgen_enum_ReferrerPolicy[arg1];
        },
        __wbg_set_signal_f4b32f40f19786f4: function(arg0, arg1) {
            arg0.signal = arg1;
        },
        __wbg_signal_45367c6c2255877a: function(arg0) {
            const ret = arg0.signal;
            return ret;
        },
        __wbg_size_338f1717fbf84c4e: function(arg0) {
            const ret = arg0.size;
            return ret;
        },
        __wbg_slice_49f10e038e37aae3: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.slice(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_static_accessor_GLOBAL_8eb4cd83130a11a0: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_1e7044f654e934db: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_d8b50611246a6d92: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_fd0bc376bf0f8b42: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_status_88ccc72fe7bea621: function(arg0) {
            const ret = arg0.status;
            return ret;
        },
        __wbg_table_new: function(arg0) {
            const ret = Table.__wrap(arg0);
            return ret;
        },
        __wbg_then_7a850dae4493f353: function(arg0, arg1, arg2) {
            const ret = arg0.then(arg1, arg2);
            return ret;
        },
        __wbg_then_b830475380919203: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbg_toString_794a30e85c994f2a: function(arg0) {
            const ret = arg0.toString();
            return ret;
        },
        __wbg_url_f1948b0d7f881e02: function(arg0, arg1) {
            const ret = arg1.url;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_value_c227f843d21da141: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbg_view_d8c7b26e4d4650f1: function(arg0) {
            const ret = arg0.view;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_writable_bf33d3f9fb228429: function(arg0) {
            const ret = arg0.writable;
            return ret;
        },
        __wbg_write_d32d19927af3f942: function(arg0, arg1) {
            const ret = arg0.write(arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 303, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke___wasm_bindgen_99813b3b1a8e014b___JsValue______true_);
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 4444, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke___wasm_bindgen_99813b3b1a8e014b___JsValue__core_ed718c3d60ebd546___result__Result_____wasm_bindgen_99813b3b1a8e014b___JsError___true_);
            return ret;
        },
        __wbindgen_generic_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [], shim_idx: 370, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke_______true_);
            return ret;
        },
        __wbindgen_generic_0000000000000004: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000005: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000006: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./parquet_wasm_bg.js": import0,
    };
}

function wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke_______true_(arg0, arg1) {
    wasm.wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke_______true_(arg0, arg1);
}

function wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke___wasm_bindgen_99813b3b1a8e014b___JsValue______true_(arg0, arg1, arg2) {
    wasm.wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke___wasm_bindgen_99813b3b1a8e014b___JsValue______true_(arg0, arg1, arg2);
}

function wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke___wasm_bindgen_99813b3b1a8e014b___JsValue__core_ed718c3d60ebd546___result__Result_____wasm_bindgen_99813b3b1a8e014b___JsError___true_(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke___wasm_bindgen_99813b3b1a8e014b___JsValue__core_ed718c3d60ebd546___result__Result_____wasm_bindgen_99813b3b1a8e014b___JsError___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke___js_sys_3ebe6d640d24e171___Function_fn_wasm_bindgen_99813b3b1a8e014b___JsValue_____wasm_bindgen_99813b3b1a8e014b___sys__Undefined___js_sys_3ebe6d640d24e171___Function_fn_wasm_bindgen_99813b3b1a8e014b___JsValue_____wasm_bindgen_99813b3b1a8e014b___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen_99813b3b1a8e014b___convert__closures_____invoke___js_sys_3ebe6d640d24e171___Function_fn_wasm_bindgen_99813b3b1a8e014b___JsValue_____wasm_bindgen_99813b3b1a8e014b___sys__Undefined___js_sys_3ebe6d640d24e171___Function_fn_wasm_bindgen_99813b3b1a8e014b___JsValue_____wasm_bindgen_99813b3b1a8e014b___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_ReadableStreamType = ["bytes"];


const __wbindgen_enum_ReferrerPolicy = ["", "no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin", "unsafe-url", "same-origin", "strict-origin", "strict-origin-when-cross-origin"];


const __wbindgen_enum_RequestCache = ["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"];


const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];


const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];
const ColumnChunkMetaDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_columnchunkmetadata_free(ptr, 1));
const FFIDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ffidata_free(ptr, 1));
const FFISchemaFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ffischema_free(ptr, 1));
const FFIStreamFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ffistream_free(ptr, 1));
const FileMetaDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_filemetadata_free(ptr, 1));
const IntoUnderlyingByteSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingbytesource_free(ptr, 1));
const IntoUnderlyingSinkFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingsink_free(ptr, 1));
const IntoUnderlyingSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_intounderlyingsource_free(ptr, 1));
const ParquetFileFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_parquetfile_free(ptr, 1));
const ParquetMetaDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_parquetmetadata_free(ptr, 1));
const RecordBatchFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_recordbatch_free(ptr, 1));
const RowGroupMetaDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rowgroupmetadata_free(ptr, 1));
const SchemaFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_schema_free(ptr, 1));
const TableFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_table_free(ptr, 1));
const WriterPropertiesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_writerproperties_free(ptr, 1));
const WriterPropertiesBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_writerpropertiesbuilder_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_destroy_closure(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('parquet_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
