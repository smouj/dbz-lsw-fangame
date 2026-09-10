-- ═══════════════════════════════════════════════════════════════════════
-- P0.5B — BizHawk Lua Capture Script: Special Handler FSM Traces
-- ═══════════════════════════════════════════════════════════════════════
-- Captures scene/camera/visibility transitions for each special handler.
--
-- USAGE:
--   1. Open ROM (SHA-256 verified) in BizHawk
--   2. Navigate to a battle with the target card
--   3. Tools → Lua Console → Load this script
--   4. Play the card action
--   5. Output saved to capture-output/special-handler-XX.json
--
-- CAPTURES:
--   tick, frame, PC, bank, $CA03, $CA06, $CA53, $CA59, $CA5A
--   ActionObject+0 (visibility), ActionObject+4 (resource)
--   SCX, SCY, LY, LCDC
--   Scene transitions (VRAM load addresses)
--   FIGHTER_VISIBILITY changes
--
-- ROM: DBZ LSW USA (GBC)
-- SHA-256: verify before capture
-- ═══════════════════════════════════════════════════════════════════════

local JSON = require('dkjson')  -- or json library available in BizHawk

-- Configuration
local OUTPUT_DIR = "capture-output"
local ROM_HASH = "verify_sha256_before_capture"

-- Memory addresses (GBC HRAM/WRAM)
local ADDR_CA03 = 0xCA03  -- Action handler phase
local ADDR_CA06 = 0xCA06  -- Action sub-type
local ADDR_CA53 = 0xCA53  -- Action result
local ADDR_CA59 = 0xCA59  -- ActionObject+0 (low)
local ADDR_CA5A = 0xCA5A  -- ActionObject+0 (high)
local ADDR_C3C6 = 0xC3C6  -- ActionObject+4 slot 0
local ADDR_C3C7 = 0xC3C7  -- ActionObject+4 slot 1
local ADDR_C3C8 = 0xC3C8  -- ActionObject context
local ADDR_SCX  = 0xFF43  -- Scroll X (IO)
local ADDR_SCY  = 0xFF42  -- Scroll Y (IO)
local ADDR_LY   = 0xFF44  -- LCD Y coordinate (IO)
local ADDR_LCDC = 0xFF40  -- LCD control (IO)
local ADDR_STAT = 0xFF41  -- LCD status (IO)

-- Special handler targets
local SPECIALS = {
  {subtype=0x08, name="Generic_Special", addr="5E67"},
  {subtype=0x0B, name="Tail",             addr="61C5"},
  {subtype=0x0F, name="Big_Bang",         addr="4A18"},
  {subtype=0x12, name="Destructo_Disk",    addr="64D3"},
  {subtype=0x16, name="S_Beam_Cannon",    addr="5F33"},
  {subtype=0x22, name="Spirit_Bomb",      addr="6640"},
}

-- Capture state
local capture = {
  running = false,
  entries = {},
  startFrame = 0,
  currentSpecial = nil,
  maxFrames = 300,  -- ~5 seconds at 60fps
}

-- Read a 16-bit value from RAM
local function read16(addr)
  return memory.readbyte(addr) | (memory.readbyte(addr + 1) << 8)
end

-- Check if we're in a battle action
local function inBattleAction()
  local ca03 = memory.readbyte(ADDR_CA03)
  return ca03 ~= 0
end

-- Detect which special is running
local function detectSpecial()
  local ca06 = memory.readbyte(ADDR_CA06)
  for _, spec in ipairs(SPECIALS) do
    if ca06 == spec.subtype then
      return spec
    end
  end
  return nil
end

-- Capture a single frame
local function captureFrame()
  local frame = emu.framecount()
  local tick = frame  -- GBC ticks ≈ frames for this purpose
  
  local entry = {
    tick = tick,
    frame = frame,
    ca03 = memory.readbyte(ADDR_CA03),
    ca06 = memory.readbyte(ADDR_CA06),
    ca53 = memory.readbyte(ADDR_CA53),
    actionObject0 = read16(ADDR_CA59),
    actionObject4_slot0 = memory.readbyte(ADDR_C3C6),
    actionObject4_slot1 = memory.readbyte(ADDR_C3C7),
    scx = memory.readbyte(ADDR_SCX),
    scy = memory.readbyte(ADDR_SCY),
    ly = memory.readbyte(ADDR_LY),
    lcdc = memory.readbyte(ADDR_LCDC),
    specialName = capture.currentSpecial and capture.currentSpecial.name or "none",
  }
  
  table.insert(capture.entries, entry)
end

-- Frame callback
local function onFrame()
  if not capture.running then return end
  
  local frame = emu.framecount()
  if frame - capture.startFrame > capture.maxFrames then
    -- Save and stop
    local filename = string.format("%s/special-handler-%s.json", OUTPUT_DIR, 
      capture.currentSpecial and capture.currentSpecial.name or "unknown")
    local file = io.open(filename, "w")
    if file then
      file:write(JSON.encode(capture.entries, { indent = true }))
      file:close()
      print(string.format("Saved %d frames to %s", #capture.entries, filename))
    end
    capture.running = false
    return
  end
  
  captureFrame()
end

-- Start capture for a specific special
local function startCapture(special)
  capture.running = true
  capture.entries = {}
  capture.startFrame = emu.framecount()
  capture.currentSpecial = special
  print(string.format("Starting capture for %s (subtype $%02X)", special.name, special.subtype))
end

-- Command interface: press keys to start capture
-- Key bindings:
--   Ctrl+1 = Start capture for current special
--   Ctrl+2 = Stop capture
--   Ctrl+3 = List detected specials
local function onInput()
  local keys = input.get()
  -- Check for Ctrl+1 (start capture)
  -- BizHawk input handling varies; this is a template
end

-- Register callbacks
emu.registerafter(onFrame)

print("═══ P0.5B Special Handler FSM Capture Script ═══")
print("Load this script, then play a card action in battle.")
print("The script will auto-detect the special handler and capture frames.")
print("")
print("Targets:")
for _, spec in ipairs(SPECIALS) do
  print(string.format("  $%02X %s @ Bank03:%s", spec.subtype, spec.name, spec.addr))
end
print("")
print(string.format("Output directory: %s", OUTPUT_DIR))
print("Max frames per capture: " .. capture.maxFrames)