// ─────────────────────────────────────────────────────────────────────────
// SHIM de compatibilidad.
// El contrato de traza vive ahora en el producto: src/battle/romTrace/.
// El tooling lo consume desde ahí (dirección correcta: tools → src), para que
// el frontend NO dependa de tools/rom-trace.
// ─────────────────────────────────────────────────────────────────────────
export * from '../../src/battle/romTrace/trace-schema';
