-- ═══════════════════════════════════════════════════════════════════════
-- ROM LOTE 9 (§280/§290) — trace-action.lua: tracer dinámico de acción.
-- Compatible con BizHawk Lua API (emu:read8 / emu:frame / emu:getinfo).
--
-- USO (BizHawk): cargar este script en el emulador con la ROM cargada y
-- en el frame justo ANTES de confirmar la acción a trazar.
--
--   trace-action.lua <outDir> <name> <maxFrames> [side] [outcome]
--   ej: trace-action.lua "C:/traces" "tail_left_hit" 600 LEFT NORMAL_HIT
--
-- SALIDA (generated · immutable · nunca editar a mano):
--   <outDir>/<name>/capture.raw.json   → todos los frames (evidencia)
--   <outDir>/<name>/metadata.json      → identidad ROM + condiciones
-- El host (tools/rom-trace/ingest.ts) valida y deriva:
--   trace.full.json · trace.changes.json · summary.md
-- ═══════════════════════════════════════════════════════════════════════

local outDir = arg[1] or "traces"
local name = arg[2] or "capture"
local maxFrames = tonumber(arg[3]) or 600
local side = arg[4] or "LEFT"
local outcome = arg[5] or "NORMAL_HIT"

-- Metadatos de identidad (rellenar según tu ROM/herramienta — §278).
-- Si no conoces el SHA, pásalo en metadata.json al ingerir; el trace sin
-- SHA no podrá promocionar datos canónicos (validado en ingest).
local ROM_LABEL = "dbz-lsw-usa"
local ROM_SHA = "8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee"
local EMULATOR = "BizHawk"
local EMULATOR_VERSION = tostring(emu.getinfo and emu.getinfo().version or "unknown")
local TOOL_VERSION = "l9.1"

-- Direcciones (§280).
local ADDR = {
  C0A0 = 0xC0A0, CA01 = 0xCA01, CA02 = 0xCA02, CA03 = 0xCA03,
  CA04 = 0xCA04, CA06 = 0xCA06, CA7E = 0xCA7E, CB77 = 0xCB77,
  OBJ0 = 0xC3A0, OBJ1 = 0xC3B3, C3C6 = 0xC3C6, C3C7 = 0xC3C7,
  CA39 = 0xCA39, CA53 = 0xCA53,
  SCX = 0xFF43, SCY = 0xFF42, LCDC = 0xFF40, STAT = 0xFF41,
}

local function rd(a) return emu:read8(a) end

local function dumpObject(base)
  local parts = {}
  for i = 0, 0x12 do parts[#parts + 1] = string.format("%02X", rd(base + i)) end
  return table.concat(parts, " ")
end

local function frameSnapshot()
  return {
    frame = emu:getinfo().frame,
    battle = {
      C0A0 = rd(ADDR.C0A0), CA01 = rd(ADDR.CA01), CA02 = rd(ADDR.CA02),
      CA03 = rd(ADDR.CA03), CA04 = rd(ADDR.CA04), CA06 = rd(ADDR.CA06),
      CA7E = rd(ADDR.CA7E), CB77 = rd(ADDR.CB77), CA53 = rd(ADDR.CA53),
    },
    actionObjects = { dumpObject(ADDR.OBJ0), dumpObject(ADDR.OBJ1) },
    activeObject = rd(ADDR.C3C6),
    drawState = rd(ADDR.C3C7),
    drawOrderFlag = rd(ADDR.CA39),
    display = { scx = rd(ADDR.SCX), scy = rd(ADDR.SCY), lcdc = rd(ADDR.LCDC), stat = rd(ADDR.STAT) },
  }
end

-- ── escritura intermedia (raw + metadata) ──
local function ensureDir(p)
  -- BizHawk: crear directorio vía os.execute (Windows).
  os.execute('if not exist "' .. p .. '" mkdir "' .. p .. '"')
end

local function writeFile(path, content)
  local f = assert(io.open(path, "w"))
  f:write(content)
  f:close()
end

local frames = {}
local startFrame = emu:getinfo().frame
for i = 1, maxFrames do
  frames[#frames + 1] = frameSnapshot()
  emu:frame()
end
local endFrame = emu:getinfo().frame

ensureDir(outDir .. "/" .. name)
writeFile(outDir .. "/" .. name .. "/capture.raw.json", "{")
writeFile(outDir .. "/" .. name .. "/capture.raw.json",
  "{\n  \"frames\": [\n" ..
  table.concat(frames, ",\n") ..
  "\n  ]\n}\n")
writeFile(outDir .. "/" .. name .. "/metadata.json", string.format([[
{
  "source": {
    "romSha256": "%s",
    "romSize": 2097152,
    "romLabel": "%s",
    "emulator": "%s",
    "emulatorVersion": "%s",
    "traceToolVersion": "%s"
  },
  "attackerSide": "%s",
  "expectedOutcome": "%s",
  "firstFrame": %d,
  "lastFrame": %d,
  "notes": "RELLENAR: cardId, subtype, workerBank, workerAddress, attackerForm, defenderForm segun la accion capturada"
}
]], ROM_SHA, ROM_LABEL, EMULATOR, EMULATOR_VERSION, TOOL_VERSION, side, outcome, startFrame, endFrame))

print("TRACE_CAPTURED name=" .. name .. " frames=" .. #frames .. " (" .. startFrame .. ".." .. endFrame .. ")")
print("raw: " .. outDir .. "/" .. name .. "/capture.raw.json")
print("meta: " .. outDir .. "/" .. name .. "/metadata.json")
print("NEXT: ingerir con tools/rom-trace/ingest.ts (valida schema + SHA + deriva diff/FSM)")
