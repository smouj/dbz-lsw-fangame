# DBZ LSW sprite naming policy — V7 project aligned

Baseline: `smouj/dbz-lsw-fangame@4b9f38353c1be64427deb17f7fad83b5cdbd7aec`.

## 1. Canonical source names
The corrected source pack keeps **zero-padded numeric names** (`001.png`, `002.png`, …) inside each character/form. This is intentional and matches the current importer architecture: the canonical pack is the pixel/crop source of truth, while semantic pose labels come from the FIXED `00_manifest/animations.json` bridge.

Renaming these source files directly to `idle`, `punch`, `kick`, etc. would be a semantic guess and can silently assign a correct sprite to the wrong action.

## 2. Runtime semantic filenames
After `scripts/import-v6-sprites.py`, runtime files follow:

`<runtime_dir>_<semantic_family>_<NN>.png`

Base families: `idle`, `move_front`, `move_back`, `guard`, `attack_fwd`, `attack_ud`, `hurt`, `beam_charge`, `beam_fire`.

At commit `4b9f383`, `scripts/add-composite-poses.py` rebuilds the current composite actions: `punch_right`, `punch_left`, `kick_right`, `knockback_back`, `knockback_up`, `knockback_down`, `beam_guard`, `evade`, `gather_power`, `power_up`, plus optional `beam_ray` / `beam_ray_tip` when their PNGs physically exist.

Important V6.1 convention: `move_front = move_front_00 + move_front_01` and `move_back = move_back_00 + move_back_01`; the old `idle + step` convention is no longer authoritative.

See `PROJECT_RUNTIME_POSE_CONTRACT.json` for the exact current contract.
