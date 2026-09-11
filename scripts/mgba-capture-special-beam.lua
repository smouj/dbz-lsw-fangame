-- ═══════════════════════════════════════════════════════════════════════
-- P0.5B+D — mGBA Lua Capture: Special Handler FSM + Beam SCX/SCY
-- ═══════════════════════════════════════════════════════════════════════
-- Captures scene/camera/visibility transitions for special handlers AND
-- per-frame SCX/SCY for beam handlers. Uses mGBA 0.10+ Lua API.
--
-- USAGE:
--   /usr/games/mgba /path/to/dbz-lsw-usa.gbc
--   Then in mGBA: Tools → Scripting → Load this file
--   OR: mgba -l lua /path/to/dbz-lsw-usa.gbc -- this_script.lua
--
-- OUTPUT: capture-output/trace-{special,beam}.json per action
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ Configuration ═══
local ROM_PATH = "/home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc"
local OUTPUT_DIR = "/home/local-user/.openclaw/workspace/dbz-lsw-fangame/capture-output"
local MAX_FRAMES = 600   -- ~10 seconds at 60fps
local CAPTURE_IDLE_FRAMES = 30  -- Capture 30 frames after action ends

-- ═══ Memory Map (GBC HRAM/WRAM) ═══
-- Action state
local ADDR_CA03 = 0xCA03  -- Action handler phase
local ADDR_CA06 = 0xCA06  -- Action sub-type / handler selector
local ADDR_CA53 = 0xCA53  -- Action result (0-4)

-- ActionObject state
local ADDR_AO0_VIS = 0xCA59  -- ActionObject+0 visibility (bit 7)
local ADDR_AO0_SLOT0_RES = 0xC3C6  -- ActionObject+4 slot 0 resource
local ADDR_AO0_SLOT1_RES = 0xC3C7  -- ActionObject+4 slot 1 resource

-- IO Registers
local ADDR_SCX  = 0xFF43  -- Scroll X
local ADDR_SCY  = 0xFF42  -- Scroll Y
local ADDR_LY   = 0xFF44  -- LCD Y coordinate
local ADDR_LCDC = 0xFF40  -- LCD Control

-- Beam HBlank registers (WRAM)
local ADDR_C405 = 0xC405  -- Beam HBlank source 1
local ADDR_C406 = 0xC406  -- Beam HBlank source 2

-- ═══ Special Handler Addresses (Bank03) ═══
local SPECIALS = {
  {subtype=0x08, name="Generic_Special", addr=0x5E67},
  {subtype=0x0B, name="Tail",             addr=0x61C5},
  {subtype=0x0C, name="Buu_Ball",         addr=0x62D4},
  {subtype=0x0D, name="Purple_Comet",      addr=0x5C04},
  {subtype=0x0E, name="Purple_Comet_Z",    addr=0x5D0C},
}

-- Missing specials (dispatch addresses from static analysis)
local MISSING_SPECIALS = {
  {subtype=0x0F, name="Big_Bang",         addrs={0x4A18, 0x64A3}},
  {subtype=0x12, name="Destructo_Disk",    addrs={0x64D3}},
  {subtype=0x16, name="S_Beam_Cannon",    addrs={0x5F33, 0x5CD0, 0x5DC2, 0x65BA}},
  {subtype=0x22, name="Spirit_Bomb",      addrs={0x6640}},
}

-- Beam handler sub-types (from trace-handler02.py)
local BEAM_HANDLERS = {
  {subtype=0x02, name="Energy_Wave"},
  {subtype=0x03, name="Kamehameha"},
  {subtype=0x04, name="Masenko"},
  {subtype=0x05, name="S_Kamehameha"},
  {subtype=0x06, name="Energy_Bomb"},
  {subtype=0x07, name="Galick_Ho"},
}

-- ═══ Capture State ═══
local state = {
  running = false,
  actionActive = false,
  entries = {},
  startFrame = 0,
  idleFrames = 0,
  currentHandler = nil,
  currentSubtype = nil,
  prevCA03 = 0,
  prevCA06 = 0,
  traceType = nil,  -- "special" or "beam"
}

-- ═══ Utility ═══
local function read8(addr)
  return emu:read8(addr)
end

local function read16(addr)
  return emu:read8(addr) | (emu:read8(addr + 1) << 8)
end

-- Detect which handler type is running
local function detectHandler()
  local ca06 = read8(ADDR_CA06)
  local ca03 = read8(ADDR_CA03)

  -- Check known special sub-types
  for _, spec in ipairs(SPECIALS) do
    if ca06 == spec.subtype then
      return "special", spec
    end
  end

  -- Check missing special sub-types
  for _, spec in ipairs(MISSING_SPECIALS) do
    if ca06 == spec.subtype then
      return "special", spec
    end
  end

  -- Check beam sub-types
  for _, beam in ipairs(BEAM_HANDLERS) do
    if ca06 == beam.subtype then
      return "beam", beam
    end
  end

  -- Check handler $08 generic special (sub-types $01-$47)
  if ca06 >= 0x01 and ca06 <= 0x47 then
    return "special", {subtype=ca06, name=string.format("Special_$%02X", ca06)}
  end

  return nil, nil
end

-- ═══ Frame Callback ═══
local function onFrame()
  local frame = emu:framecount()
  local ca03 = read8(ADDR_CA03)
  local ca06 = read8(ADDR_CA06)

  -- Detect action start (CA03 transitions from 0 to non-zero, or CA06 changes)
  if not state.running then
    if ca03 ~= 0 and ca06 ~= state.prevCA06 then
      -- Action started
      local handlerType, handler = detectHandler()
      if handlerType then
        state.running = true
        state.actionActive = true
        state.entries = {}
        state.startFrame = frame
        state.currentHandler = handler
        state.currentSubtype = handler.subtype
        state.traceType = handlerType
        state.idleFrames = 0
        console:log(string.format("[TRACE] START %s handler $%02X (%s) at frame %d",
          handlerType, handler.subtype, handler.name, frame))
      end
    end
  end

  if state.running then
    -- Capture frame data
    local entry = {
      frame = frame,
      tick = frame,
      ca03 = ca03,
      ca06 = ca06,
      ca53 = read8(ADDR_CA53),
      ao0_vis = read8(ADDR_AO0_VIS),
      slot0_res = read8(ADDR_AO0_SLOT0_RES),
      slot1_res = read8(ADDR_AO0_SLOT1_RES),
      scx = read8(ADDR_SCX),
      scy = read8(ADDR_SCY),
      ly = read8(ADDR_LY),
      lcdc = read8(ADDR_LCDC),
      c405 = read8(ADDR_C405),
      c406 = read8(ADDR_C406),
    }
    table.insert(state.entries, entry)

    -- Check for action end (CA03 returns to 0 or changes phase)
    if ca03 == 0 then
      state.idleFrames = state.idleFrames + 1
      if state.idleFrames >= CAPTURE_IDLE_FRAMES then
        -- Save trace
        state.running = false
        local filename = string.format("%s/trace-%s-$%02X-frame%d.json",
          OUTPUT_DIR, state.traceType, state.currentSubtype, state.startFrame)
        local file = io.open(filename, "w")
        if file then
          -- Manual JSON encoding (mGBA may not have dkjson)
          file:write("[\n")
          for i, e in ipairs(state.entries) do
            file:write(string.format(
              '  {"frame":%d,"tick":%d,"ca03":%d,"ca06":%d,"ca53":%d,' ..
              '"ao0_vis":%d,"slot0_res":%d,"slot1_res":%d,' ..
              '"scx":%d,"scy":%d,"ly":%d,"lcdc":%d,"c405":%d,"c406":%d}',
              e.frame, e.tick, e.ca03, e.ca06, e.ca53,
              e.ao0_vis, e.slot0_res, e.slot1_res,
              e.scx, e.scy, e.ly, e.lcdc, e.c405, e.c406
            ))
            if i < #state.entries then file:write(",\n") end
          end
          file:write("\n]\n")
          file:close()
          console:log(string.format("[TRACE] SAVED %d frames → %s", #state.entries, filename))
        else
          console:error(string.format("[TRACE] FAILED to write %s", filename))
        end
        state.entries = {}
      end
    else
      state.idleFrames = 0
    end

    -- Safety: max frames
    if frame - state.startFrame > MAX_FRAMES then
      state.running = false
      console:log(string.format("[TRACE] MAX_FRAMES reached, stopping capture"))
    end
  end

  state.prevCA03 = ca03
  state.prevCA06 = ca06
end

-- ═══ Startup ═══
local function onStart()
  console:log("═══ P0.5B+D Special Handler FSM + Beam SCX/SCY Capture ═══")
  console:log("mGBA Lua script for DBZ LSW (GBC)")
  console:log(string.format("ROM: %s", ROM_PATH))
  console:log(string.format("Output: %s", OUTPUT_DIR))
  console:log("")
  console:log("Special handlers:")
  for _, spec in ipairs(SPECIALS) do
    console:log(string.format("  $%02X %s @ Bank03:$%04X", spec.subtype, spec.name, spec.addr))
  end
  for _, spec in ipairs(MISSING_SPECIALS) do
    local addrs = ""
    for _, a in ipairs(spec.addrs) do addrs = addrs .. string.format("$%04X ", a) end
    console:log(string.format("  $%02X %s @ %s", spec.subtype, spec.name, addrs))
  end
  console:log("")
  console:log("Beam handlers:")
  for _, beam in ipairs(BEAM_HANDLERS) do
    console:log(string.format("  $%02X %s", beam.subtype, beam.name))
  end
  console:log("")
  console:log("Navigate to a battle and play a card action.")
  console:log("The script auto-detects the handler and captures frames.")
  console:log("Trace files saved on action completion.")
end

-- Register callbacks
callbacks:add("start", onStart)
callbacks:add("frame", onFrame)

-- Run startup immediately if emulator already loaded
onStart()