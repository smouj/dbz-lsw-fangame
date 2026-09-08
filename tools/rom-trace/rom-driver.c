/* ═══════════════════════════════════════════════════════════════════════
 * ROM R3.1A — rom-driver.c: driver operativo mGBA (libmgba 0.10).
 *
 * Sustituye al CLI debugger para operaciones que exigen:
 *   - inyección de joypad (setKeys por frame)
 *   - pausa real entre comandos (write while paused → resume)
 *   - dump de framebuffer (verificación visual de UI)
 *   - savestates nombrados (tail_left_base reproducible)
 *
 * USO:
 *   rom-driver <rom.gbc> [battery.sav]
 *
 * Comandos por stdin (uno por línea, respuesta "OK <detalle>" o "ERR <motivo>"):
 *   frames N [KEYMASK]   → avanza N frames; si KEYMASK, mantiene esas teclas
 *   read ADDR N          → N bytes del bus CPU (hex)
 *   write ADDR VAL       → escribe 1 byte en el bus CPU
 *   state                → registros de batalla (C0A0 CA06 C3C6 CA53 …)
 *   savestate PATH       → guarda savestate nombrado (battery+RTC incluidos)
 *   loadstate PATH       → carga savestate nombrado
 *   savebatt PATH        → vuelca battery save actual a archivo
 *   shot PATH            → framebuffer → PPM P6 (160x144)
 *   trace PATH N         → captura N frames → JSON crudo (schema trace-action)
 *   quit
 *
 * KEYMASK (GB): A=0x01 B=0x02 SELECT=0x04 START=0x08 RIGHT=0x10
 *               LEFT=0x20 UP=0x40 DOWN=0x80
 *
 * Compilar:  gcc -O2 -o rom-driver rom-driver.c -lmgba -lm
 * ═══════════════════════════════════════════════════════════════════════ */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <fcntl.h>
#include <mgba/core/core.h>
#include <mgba-util/vfs.h>

#define SAVESTATE_SAVEDATA 0x01
#define SAVESTATE_RTC 0x02

static struct mCore* g_core = NULL;
static uint32_t g_fb[256 * 224];
static unsigned g_fb_w = 256, g_fb_h = 224;

static const uint16_t BATTLE_ADDRS[] = {
  0xC0A0, 0xCA01, 0xCA02, 0xCA03, 0xCA04, 0xCA06,
  0xCA7E, 0xCB77, 0xCA53,
};
static const char* BATTLE_NAMES[] = {
  "C0A0", "CA01", "CA02", "CA03", "CA04", "CA06",
  "CA7E", "CB77", "CA53",
};
#define N_BATTLE 9

/* Registros de animación por slot (R3): AnimationSlot 3B [bank,baseLo,baseHi]
 * en $CA0D+slot×3; graphics source 3B en $CA28+slot×3. Se capturan 8 slots. */
#define N_SLOTS 8

static uint8_t rd(uint32_t a) { return (uint8_t)g_core->busRead8(g_core, a); }

static void cmd_frames(int n, uint32_t keys) {
  for (int i = 0; i < n; i++) {
    g_core->setKeys(g_core, keys);
    g_core->runFrame(g_core);
  }
  printf("OK frames=%d\n", n);
  fflush(stdout);
}

static void cmd_read(uint32_t addr, int n) {
  printf("OK ");
  for (int i = 0; i < n; i++) printf("%02X%s", rd(addr + i), i + 1 < n ? " " : "");
  printf("\n");
  fflush(stdout);
}

static void cmd_write(uint32_t addr, uint8_t val) {
  g_core->busWrite8(g_core, addr, val);
  printf("OK wrote %02X @ %04X (readback %02X)\n", val, addr, rd(addr));
  fflush(stdout);
}

static void cmd_state(void) {
  printf("OK");
  for (int i = 0; i < N_BATTLE; i++)
    printf(" %s=%02X", BATTLE_NAMES[i], rd(BATTLE_ADDRS[i]));
  printf(" C3C6=%02X C3C7=%02X CA39=%02X SCX=%02X",
         rd(0xC3C6), rd(0xC3C7), rd(0xCA39), rd(0xFF43));
  printf(" C405=%02X C406=%02X C407=%02X C408=%02X C409=%02X C40A=%02X C2D0=%02X C2D1=%02X\n",
         rd(0xC405), rd(0xC406), rd(0xC407), rd(0xC408), rd(0xC409), rd(0xC40A), rd(0xC2D0), rd(0xC2D1));
  fflush(stdout);
}

static void cmd_savestate(const char* path) {
  struct VFile* vf = VFileOpen(path, O_WRONLY | O_CREAT | O_TRUNC);
  if (!vf) { printf("ERR open %s\n", path); fflush(stdout); return; }
  if (!mCoreSaveStateNamed(g_core, vf, SAVESTATE_SAVEDATA | SAVESTATE_RTC)) {
    printf("ERR savestate\n"); fflush(stdout); return;
  }
  printf("OK savestate %s\n", path);
  fflush(stdout);
}

static void cmd_loadstate(const char* path) {
  struct VFile* vf = VFileOpen(path, O_RDONLY);
  if (!vf) { printf("ERR open %s\n", path); fflush(stdout); return; }
  if (!mCoreLoadStateNamed(g_core, vf, 0)) {
    printf("ERR loadstate\n"); fflush(stdout); return;
  }
  printf("OK loadstate %s\n", path);
  fflush(stdout);
}

static void cmd_memdump(const char* path, uint32_t start, uint32_t len) {
  FILE* f = fopen(path, "w");
  if (!f) { printf("ERR open %s\n", path); fflush(stdout); return; }
  fprintf(f, "{\"base\":%u,\"bytes\":[", start);
  for (uint32_t i = 0; i < len; i++)
    fprintf(f, "%s%d", i ? "," : "", rd(start + i));
  fprintf(f, "]}\n");
  fclose(f);
  printf("OK memdump %s (%u bytes @ %04X)\n", path, len, start);
  fflush(stdout);
}

static void cmd_savebatt(const char* path) {
  void* sram = NULL;
  size_t sz = g_core->savedataClone(g_core, &sram);
  if (!sram) { printf("ERR no-savedata\n"); fflush(stdout); return; }
  FILE* f = fopen(path, "wb");
  if (!f) { printf("ERR open %s\n", path); fflush(stdout); free(sram); return; }
  fwrite(sram, 1, sz, f);
  fclose(f);
  free(sram);
  printf("OK savebatt %s (%zu bytes)\n", path, sz);
  fflush(stdout);
}

static void cmd_shot(const char* path) {
  FILE* f = fopen(path, "wb");
  if (!f) { printf("ERR open %s\n", path); fflush(stdout); return; }
  fprintf(f, "P6\n%u %u\n255\n", g_fb_w, g_fb_h);
  for (unsigned y = 0; y < g_fb_h; y++) {
    const uint32_t* row = g_fb + (y * g_fb_w);
    for (unsigned x = 0; x < g_fb_w; x++) {
      uint32_t c = row[x];
      uint8_t rgb[3] = { (uint8_t)(c & 0xFF), (uint8_t)((c >> 8) & 0xFF), (uint8_t)((c >> 16) & 0xFF) };
      fwrite(rgb, 1, 3, f);
    }
  }
  fclose(f);
  printf("OK shot %s (%ux%u)\n", path, g_fb_w, g_fb_h);
  fflush(stdout);
}

static void cmd_trace(const char* path, int n, const char* keyspec) {
  FILE* f = fopen(path, "w");
  if (!f) { printf("ERR open %s\n", path); fflush(stdout); return; }
  // keyspec: "frame:key[:hold],..." — key inyectada desde ESE frame durante `hold` frames
  int keyFrames[64], keyMasks[64], keyHolds[64], keyN = 0;
  if (keyspec && keyspec[0]) {
    char buf[256];
    snprintf(buf, sizeof(buf), "%s", keyspec);
    char* tok = strtok(buf, ",");
    while (tok && keyN < 64) {
      int kf = 0; unsigned int km = 0; int kh = 1;
      if (sscanf(tok, "%d:%x:%d", &kf, &km, &kh) >= 2) { keyFrames[keyN] = kf; keyMasks[keyN] = (uint32_t)km; keyHolds[keyN] = kh > 0 ? kh : 1; keyN++; }
      tok = strtok(NULL, ",");
    }
  }
  fprintf(f, "{\n  \"frames\": [\n");
  for (int i = 0; i < n; i++) {
    fprintf(f, "    {\"frame\": %d, \"battle\": {", i);
    for (int j = 0; j < N_BATTLE; j++)
      fprintf(f, "%s\"%s\": %d", j ? ", " : "", BATTLE_NAMES[j], rd(BATTLE_ADDRS[j]));
    fprintf(f, "}, \"actionObjects\": [");
    for (int o = 0; o < 2; o++) {
      uint32_t base = o == 0 ? 0xC3A0 : 0xC3B3;
      fprintf(f, "%s{\"bytes\": [", o ? ", " : "");
      for (int b = 0; b < 19; b++)
        fprintf(f, "%s%d", b ? ", " : "", rd(base + b));
      fprintf(f, "]}");
    }
    fprintf(f, "], \"activeObject\": %d, \"drawState\": %d, \"drawOrderFlag\": %d, \"display\": {\"scx\": %d, \"scy\": %d, \"lcdc\": %d, \"stat\": %d}, \"scroll\": {\"C405\": %d, \"C406\": %d, \"C407\": %d, \"C408\": %d, \"C409\": %d, \"C40A\": %d, \"C2D0\": %d, \"C2D1\": %d}, \"slots\": [",
            rd(0xC3C6), rd(0xC3C7), rd(0xCA39), rd(0xFF43), rd(0xFF42), rd(0xFF40), rd(0xFF41),
            rd(0xC405), rd(0xC406), rd(0xC407), rd(0xC408), rd(0xC409), rd(0xC40A), rd(0xC2D0), rd(0xC2D1));
    for (int o = 0; o < N_SLOTS; o++) {
      fprintf(f, "%s{\"anim\": [%d, %d, %d], \"gfx\": [%d, %d, %d]}", o ? ", " : "",
              rd(0xCA0D + o*3), rd(0xCA0D + o*3 + 1), rd(0xCA0D + o*3 + 2),
              rd(0xCA28 + o*3), rd(0xCA28 + o*3 + 1), rd(0xCA28 + o*3 + 2));
    }
    fprintf(f, "]}");
    if (i + 1 < n) fprintf(f, ",");
    fprintf(f, "\n");
    uint32_t keys = 0;
    for (int k = 0; k < keyN; k++) if (i >= keyFrames[k] && i < keyFrames[k] + keyHolds[k]) keys |= keyMasks[k];
    g_core->setKeys(g_core, keys);
    g_core->runFrame(g_core);
  }
  fprintf(f, "  ]\n}\n");
  fclose(f);
  printf("OK trace %s frames=%d\n", path, n);
  fflush(stdout);
}

int main(int argc, char** argv) {
  if (argc < 2) {
    fprintf(stderr, "uso: rom-driver <rom.gbc> [battery.sav]\n");
    return 2;
  }
  g_core = mCoreFind(argv[1]);
  if (!g_core) { fprintf(stderr, "ERR no core para %s\n", argv[1]); return 1; }
  if (!g_core->init(g_core)) { fprintf(stderr, "ERR init\n"); return 1; }
  mCoreInitConfig(g_core, "rom-driver");
  if (!mCoreLoadFile(g_core, argv[1])) { fprintf(stderr, "ERR loadROM\n"); return 1; }
  g_core->desiredVideoDimensions(g_core, &g_fb_w, &g_fb_h);
  g_core->setVideoBuffer(g_core, g_fb, g_fb_w);
  if (argc > 2 && argv[2][0]) {
    if (!mCoreLoadSaveFile(g_core, argv[2], false)) {
      fprintf(stderr, "WARN no battery save %s\n", argv[2]);
    }
  }
  g_core->reset(g_core);

  char line[1024];
  while (fgets(line, sizeof(line), stdin)) {
    char cmd[64], a[512], b[512], c[512];
    int n = sscanf(line, "%63s %511s %511s %511s", cmd, a, b, c);
    if (n < 1) continue;
    if (!strcmp(cmd, "quit")) break;
    else if (!strcmp(cmd, "frames") && n >= 2) {
      int f = atoi(a);
      uint32_t keys = n >= 3 ? (uint32_t)strtoul(b, NULL, 0) : 0;
      cmd_frames(f, keys);
    } else if (!strcmp(cmd, "read") && n >= 3) {
      cmd_read((uint32_t)strtoul(a, NULL, 0), atoi(b));
    } else if (!strcmp(cmd, "write") && n >= 3) {
      cmd_write((uint32_t)strtoul(a, NULL, 0), (uint8_t)strtoul(b, NULL, 0));
    } else if (!strcmp(cmd, "state")) {
      cmd_state();
    } else if (!strcmp(cmd, "savestate") && n >= 2) {
      cmd_savestate(a);
    } else if (!strcmp(cmd, "loadstate") && n >= 2) {
      cmd_loadstate(a);
    } else if (!strcmp(cmd, "memdump") && n >= 4) {
      cmd_memdump(a, (uint32_t)strtoul(b, NULL, 0), (uint32_t)strtoul(c, NULL, 0));
    } else if (!strcmp(cmd, "savebatt") && n >= 2) {
      cmd_savebatt(a);
    } else if (!strcmp(cmd, "shot") && n >= 2) {
      cmd_shot(a);
    } else if (!strcmp(cmd, "trace") && n >= 3) {
      cmd_trace(a, atoi(b), n >= 4 ? c : "");
    } else {
      printf("ERR unknown\n"); fflush(stdout);
    }
  }
  g_core->deinit(g_core);
  return 0;
}
