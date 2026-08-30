// repro.c — reproduce el patrón "array estático de punteros a función static"
// para aislar si el "table index out of bounds" es de Emscripten o de SameBoy.
typedef unsigned char uint8_t;
typedef unsigned short uint16_t;
typedef struct { int x; } gb_t;

typedef uint8_t read_function_t(gb_t *gb, uint16_t addr);

static uint8_t read_rom(gb_t *gb, uint16_t addr) { return (uint8_t)(addr & 0xFF); }
static uint8_t read_vram(gb_t *gb, uint16_t addr) { return (uint8_t)((addr >> 8) & 0xFF); }
static uint8_t read_ram(gb_t *gb, uint16_t addr) { return 0xAA; }

static read_function_t *const read_map[] = {
    read_rom, read_rom, read_vram, read_ram,
};

__attribute__((used)) uint8_t dispatch(uint16_t addr) {
    gb_t gb = {0};
    return read_map[(addr >> 12) & 3](&gb, addr);
}
