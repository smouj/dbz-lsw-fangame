/*
 * sameboy_harness.c — thin C wrapper around the SameBoy CORE API for spike H0.
 *
 * Expone el contrato GbcCore (ver src/GbcCore.ts) a JS vía Emscripten.
 * No usa libretro. No usa internos de SameBoy; solo API pública:
 *   gb.h        (GB_init/GB_load_rom_from_buffer/GB_run_frame/GB_get_pixels_output/GB_get_direct_access)
 *   joypad.h    (GB_set_key_state)
 *   memory.h    (GB_read_memory/GB_write_memory)
 *   save_state.h(GB_get_save_state_size/GB_save_state_to_buffer/GB_load_state_from_buffer)
 *
 * H0: modelo GB_MODEL_CGB_E explícito. Boot ROM libre de SameBoy cargable opcionalmente
 * (nunca una boot ROM propietaria de Nintendo). Sin threads, sin audio.
 */

#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>

#include "gb.h"
#include "joypad.h"
#include "memory.h"
#include "save_state.h"
#include "display.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define HARNESS_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define HARNESS_EXPORT
#endif

#define H0_MODEL GB_MODEL_CGB_E
#define GB_SCREEN_PIXELS (160 * 144)

static GB_gameboy_t *g_gb = NULL;
/* Copia estable del framebuffer (SameBoy rota buffers internos). */
static uint32_t *g_pixels = NULL;

/* Empaqueta r,g,b → uint32 RGBA (A=0xFF en byte alto). En little-endian
 * (WASM) esto deja los bytes [R,G,B,A], que es justo el layout de ImageData. */
static uint32_t rgb_encode(GB_gameboy_t *gb, uint8_t r, uint8_t g, uint8_t b)
{
    (void)gb;
    return (uint32_t)r | ((uint32_t)g << 8) | ((uint32_t)b << 16) | 0xFF000000u;
}

/* ----------------------------- lifecycle ----------------------------- */

HARNESS_EXPORT int harness_init(void) {
    if (g_gb) return 0;
    g_gb = GB_init(GB_alloc(), H0_MODEL);
    if (!g_gb) return -1;
    /* IMPRESCINDIBLE: GB_convert_rgb15 SIEMPRE llama a rgb_encode_callback;
     * el frontend de SameBoy lo configura, el harness debe hacerlo o crashea
     * con un call_indirect nulo en el primer vblank. */
    GB_set_rgb_encode_callback(g_gb, rgb_encode);
    /* H0: colores crudos (sin emulación de curva LCD). Simplifica y evita pow(). */
    GB_set_color_correction_mode(g_gb, GB_COLOR_CORRECTION_DISABLED);
    if (!g_pixels) {
        g_pixels = (uint32_t *)malloc(sizeof(uint32_t) * GB_SCREEN_PIXELS);
        if (!g_pixels) { GB_free(g_gb); g_gb = NULL; return -2; }
    }
    return 0;
}

HARNESS_EXPORT void harness_free(void) {
    if (g_gb) { GB_free(g_gb); g_gb = NULL; }
    if (g_pixels) { free(g_pixels); g_pixels = NULL; }
}

/* ------------------------------- ROM --------------------------------- */

HARNESS_EXPORT int harness_load_rom(uint8_t *rom, size_t len) {
    if (!g_gb || !rom) return -1;
    GB_load_rom_from_buffer(g_gb, rom, len);
    return 0;
}

/* Boot ROM libre (SameBoy BootROMs/). Opcional; si no se carga, SameBoy
 * arranca en "fast boot" sin animación. */
HARNESS_EXPORT int harness_load_boot_rom(uint8_t *boot, size_t len) {
    if (!g_gb || !boot) return -1;
    GB_load_boot_rom_from_buffer(g_gb, boot, len);
    return 0;
}

/* ------------------------------- run --------------------------------- */

/* Avanza exactamente 1 frame GBC. Devuelve el tiempo emulado transcurrido (ns). */
HARNESS_EXPORT uint64_t harness_run_frame(void) {
    if (!g_gb) return 0;
    return GB_run_frame(g_gb);
}

/* ------------------------------ input -------------------------------- */

/* key: 0=RIGHT 1=LEFT 2=UP 3=DOWN 4=A 5=B 6=SELECT 7=START (GB_key_t) */
HARNESS_EXPORT void harness_set_key(int key, int pressed) {
    if (!g_gb) return;
    GB_set_key_state(g_gb, (GB_key_t)key, pressed ? true : false);
}

/* --------------------------- framebuffer ----------------------------- */

/* Copia el framebuffer actual a g_pixels y devuelve el puntero. */
HARNESS_EXPORT uint32_t *harness_get_pixels(void) {
    if (g_pixels) {
        const uint32_t *src = g_gb ? GB_get_pixels_output(g_gb) : NULL;
        if (src) memcpy(g_pixels, src, sizeof(uint32_t) * GB_SCREEN_PIXELS);
        else memset(g_pixels, 0, sizeof(uint32_t) * GB_SCREEN_PIXELS);
    }
    return g_pixels;
}

/* ------------------------ memoria (CPU-semántica) --------------------- */

HARNESS_EXPORT uint8_t harness_read8(uint16_t addr) {
    if (!g_gb) return 0;
    return GB_read_memory(g_gb, addr);
}

HARNESS_EXPORT uint8_t harness_safe_read8(uint16_t addr) {
    if (!g_gb) return 0;
    return GB_safe_read_memory(g_gb, addr);
}

/* Solo DEV/DEBUG/RESEARCH. Nunca gameplay en H0. */
HARNESS_EXPORT void harness_write8(uint16_t addr, uint8_t value) {
    if (!g_gb) return;
    GB_write_memory(g_gb, addr, value);
}

/* ---------------------- acceso directo (regiones) --------------------- */

/* access: GB_direct_access_t (ROM=0,RAM=1,CART_RAM=2,VRAM=3,HRAM=4,IO=5,
 *   BOOTROM=6,OAM=7,BGP=8,OBP=9,IE=10,ROM0=11).
 * Devuelve puntero; escribe *size y *bank. NULL si no disponible. */
HARNESS_EXPORT void *harness_direct_access(int access, size_t *size, uint16_t *bank) {
    if (!g_gb) { if (size) *size = 0; if (bank) *bank = 0; return NULL; }
    return GB_get_direct_access(g_gb, (GB_direct_access_t)access, size, bank);
}

/* ---------------------------- save-state ----------------------------- */

HARNESS_EXPORT size_t harness_save_state_size(void) {
    if (!g_gb) return 0;
    return GB_get_save_state_size(g_gb);
}

/* Escribe el save-state en out. Devuelve bytes escritos, o <0 en error. */
HARNESS_EXPORT int harness_save_state(uint8_t *out, size_t out_size) {
    if (!g_gb || !out) return -1;
    size_t need = GB_get_save_state_size(g_gb);
    if (out_size < need) return -2;
    GB_save_state_to_buffer(g_gb, out);
    return (int)need;
}

HARNESS_EXPORT int harness_load_state(uint8_t *buf, size_t len) {
    if (!g_gb || !buf) return -1;
    return GB_load_state_from_buffer(g_gb, buf, len);
}

/* ----------------------------- battery ------------------------------- */

HARNESS_EXPORT size_t harness_battery_size(void) {
    if (!g_gb) return 0;
    return GB_save_battery_size(g_gb);
}

HARNESS_EXPORT int harness_save_battery(uint8_t *out, size_t out_size) {
    if (!g_gb || !out) return -1;
    size_t need = GB_save_battery_size(g_gb);
    if (out_size < need) return -2;
    GB_save_battery_to_buffer(g_gb, out, need);
    return (int)need;
}

HARNESS_EXPORT int harness_load_battery(uint8_t *buf, size_t len) {
    if (!g_gb || !buf) return -1;
    GB_load_battery_from_buffer(g_gb, buf, len);
    return 0;
}
