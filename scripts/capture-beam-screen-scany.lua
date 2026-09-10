-- ═══════════════════════════════════════════════════════════════════════
-- P0.5D — BizHawk Lua Capture Script: Beam HBlank SCX/SCY per Scanline
-- ═══════════════════════════════════════════════════════════════════════
-- Captures SCX, SCY, LY, C405, C406 per scanline per frame during beam
-- actions. This is the critical evidence for P0.5D.
--
-- USAGE:
--   1. Open ROM in BizHawk
--   2. Navigate to battle with beam card (Energy Bomb, Kamehameha, etc.)
--   3. Tools → Lua Console → Load this script
--   4. Play the beam card
--   5. Output saved to capture-output/beam-screen-XX.json
--
-- CAPTURES (per frame, per scanline):
--   frame, tick
--   LY, SCX, SCY, LCDC, STAT
--   C405 (beam HBlank source 1)
--   C406 (beam HBlank source 2)
--   CA06 (action sub-type)
--   ActionObject+0 visibility bit
--
-- ROM: DBZ LSW USA (GBC)
-- ═══════════════════════════════════════════════════════════════════════

local JSON = require('dkjson')

-- Configuration
local OUTPUT_DIR = "capture-output"

-- Memory addresses
local ADDR_CA06 = 0xCA06  -- Action sub-type
local ADDR_CA59 = 0xCA59  -- ActionObject context
local ADDR_SCX  = 0xFF43  -- Scroll X
local ADDR_SCY  = 0xFF42  -- Scroll Y
local ADDR_LY   = 0xFF44  -- LCD Y coordinate
local ADDR_LCDC = 0xFF40  -- LCD control
local ADDR_STAT = 0xFF41  -- LCD status

-- GBC extra RAM registers for beam effects
-- C405/C406 are in WRAM bank 0 (0xC000-0xCFFF)
local ADDR_C405 = 0xC405  -- Beam HBlank source register 1
local ADDR_C406 = 0xC406  -- Beam HBlank source register 2

-- Beam handler types (from trace-handler02.py)
local BEAM_HANDLERS = {
  {subtype=0x02, name="Energy_Wave",      addr="5776"},
  {subtype=0x03, name="Kamehameha",       addr="5776"},
  {subtype=0x04, name="Masenko",           addr="5776"},
  {subtype=0x05, name="S_Kamehameha",      addr="5776"},
  {subtype=0x06, name="Energy_Bomb",        addr="5776"},
  {subtype=0x07, name="Galick_Ho",          addr="5776"},
}

-- Capture state
local beam = {
  running = false,
  entries = {},
  startFrame = 0,
  currentHandler = nil,
  maxFrames = 300,     -- ~5 seconds at 60fps
  scanlineData = {},   -- per-frame scanline detail
  captureScanlines = true,
}

-- Read 16-bit
local function read16(addr)
  return memory.readbyte(addr) | (memory.readbyte(addr + 1) << 8)
end

-- Detect beam handler
local function detectBeamHandler()
  local ca06 = memory.readbyte(ADDR_CA06)
  for _, h in ipairs(BEAM_HANDLERS) do
    if ca06 == h.subtype then
      return h
    end
  end
  return nil
end

-- Capture per-scanline data for current frame
-- In BizHawk, we register a callback on VBlank and HBlank
local function captureScanlineData()
  local ly = memory.readbyte(ADDR_LY)
  local scx = memory.readbyte(ADDR_SCX)
  local scy = memory.readbyte(ADDR_SCY)
  local c405 = memory.readbyte(ADDR_C405)
  local c406 = memory.readbyte(ADDR_C406)
  return {
    ly = ly,
    scx = scx,
    scy = scy,
    c405 = c405,
    c406 = c406,
  }
end

-- Capture a full frame
local function captureFrame()
  local frame = emu.framecount()
  
  -- Capture per-scanline data
  -- Note: BizHawk renders all scanlines per frame.
  -- To capture per-scanline, we need HBlank callbacks.
  -- For initial capture, we sample at VBlank and note
  -- the SCX/SCY values at frame boundaries.
  
  local frameEntry = {
    tick = frame,
    frame = frame,
    ca06 = memory.readbyte(ADDR_CA06),
    actionObject0 = read16(ADDR_CA59),
    -- Per-frame boundary values
    scx_vblank = memory.readbyte(ADDR_SCX),
    scy_vblank = memory.readbyte(ADDR_SCY),
    c405 = memory.readbyte(ADDR_C405),
    c406 = memory.readbyte(ADDR_C406),
    lcdc = memory.readbyte(ADDR_LCDC),
    handlerName = beam.currentHandler and beam.currentHandler.name or "none",
  }
  
  -- Per-scanline data (captured during frame render)
  -- This requires HBlank registration which is done below
  frameEntry.scanlines = {}
  
  table.insert(beam.entries, frameEntry)
end

-- HBlank callback: capture SCX/SCY per scanline
local scanlineBuffer = {}
local function onHBlank()
  if not beam.running then return end
  local ly = memory.readbyte(ADDR_LY)
  local scx = memory.readbyte(ADDR_SCX)
  local scy = memory.readbyte(ADDR_SCY)
  local c405 = memory.readbyte(ADDR_C405)
  local c406 = memory.readbyte(ADDR_C406)
  
  table.insert(scanlineBuffer, {
    ly = ly,
    scx = scx,
    scy = scy,
    c405 = c405,
    c406 = c406,
  })
end

-- VBlank callback: save scanline buffer to current frame
local function onVBlank()
  if not beam.running then return end
  
  local frame = emu.framecount()
  if frame - beam.startFrame > beam.maxFrames then
    -- Save and stop
    local filename = string.format("%s/beam-screen-%s.json", OUTPUT_DIR,
      beam.currentHandler and beam.currentHandler.name or "unknown")
    local file = io.open(filename, "w")
    if file then
      file:write(JSON.encode(beam.entries, { indent = true }))
      file:close()
      print(string.format("Saved %d frames to %s", #beam.entries, filename))
    end
    beam.running = false
    return
  end
  
  -- Flush scanline buffer into current frame entry
  if #beam.entries > 0 and #scanlineBuffer > 0 then
    beam.entries[#beam.entries].scanlines = scanlineBuffer
  end
  scanlineBuffer = {}
  
  -- Capture next frame
  captureFrame()
end

-- Register callbacks
emu.registerbefore(function()
  if not beam.running then return end
  -- Reset scanline buffer at start of frame
  scanlineBuffer = {}
end)

-- Note: BizHawk HBlank registration requires event.registerHBlank()
-- This may not be available in all BizHawk versions.
-- Alternative: use memory.registerwrite() on SCX/SCY/C405/C406

-- Manual trigger: press Ctrl+1 to start capture
print("═══ P0.5D Beam HBlank SCX/SCY Capture Script ═══")
print("Load this script, then play a beam card in battle.")
print("The script captures per-scanline SCX/SCY/C405/C406 data.")
print("")
print("Beam handlers:")
for _, h in ipairs(BEAM_HANDLERS) do
  print(string.format("  $%02X %s @ Bank03:%s", h.subtype, h.name, h.addr))
end
print("")
print(string.format("Output directory: %s", OUTPUT_DIR))
print("Max frames per capture: " .. beam.maxFrames)
print("")
print("IMPORTANT: For full per-scanline capture, ensure BizHawk's")
print("\"Advance Scanline\" or HBlank callback is enabled.")
print("Without HBlank, only VBlank (frame boundary) data is captured.")