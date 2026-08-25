# AnimationResource Physical Completion

This matrix separates decoded ROM resources from Fighter physical resources promoted into the certified 48-form corpus.

Renderable resources: 6/66
Frame-stream-only resources: 8
Handler-dependent resources: 18
Dynamic-pending resources: 5
Unreferenced resources: 1

| Resource | Consumers | Sequences | Frames | Physical linkage | Profiles rendered | Physical IDs | Frame instances | Status | Blocking reason |
| -------- | --------: | --------: | -----: | ---------------- | ----------------: | -----------: | --------------: | ------ | --------------- |
| `0x00` | 1 | 2 | 14 | `FULL` | 44 | 175 | 669 | `RENDERABLE` | — |
| `0x01` | 1 | 2 | 12 | `FRAME_STREAM_ONLY` | 0 | 0 | 0 | `FRAME_STREAM_ONLY` | Frame stream is decoded, but this resource has not been promoted through metasprite/graphics/profile rendering invariants yet. |
| `0x02` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `GRAPHICS_PENDING` | Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet. |
| `0x03` | 4 | 6 | 48 | `FULL` | 26 | 253 | 1260 | `RENDERABLE` | — |
| `0x04` | 1 | 2 | 14 | `FULL` | 8 | 32 | 154 | `RENDERABLE` | — |
| `0x05` | 1 | 2 | 16 | `FULL` | 3 | 15 | 64 | `RENDERABLE` | — |
| `0x06` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `GRAPHICS_PENDING` | Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet. |
| `0x07` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x08` | 1 | 1 | 8 | `FULL` | 1 | 4 | 8 | `RENDERABLE` | — |
| `0x09` | 1 | 2 | 16 | `FRAME_STREAM_ONLY` | 0 | 0 | 0 | `FRAME_STREAM_ONLY` | Frame stream is decoded, but this resource has not been promoted through metasprite/graphics/profile rendering invariants yet. |
| `0x0a` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x0b` | 1 | 1 | 7 | `FRAME_STREAM_ONLY` | 0 | 0 | 0 | `FRAME_STREAM_ONLY` | Frame stream is decoded, but this resource has not been promoted through metasprite/graphics/profile rendering invariants yet. |
| `0x0c` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x0d` | 0 | 0 | 0 | `NONE` | 0 | 0 | 0 | `UNREFERENCED` | AnimationResource slot exists in the ROM bank layout, but no card in the 125-card table consumes it. |
| `0x0e` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x0f` | 1 | 2 | 16 | `FRAME_STREAM_ONLY` | 0 | 0 | 0 | `FRAME_STREAM_ONLY` | Frame stream is decoded, but this resource has not been promoted through metasprite/graphics/profile rendering invariants yet. |
| `0x10` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x11` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x12` | 2 | 4 | 36 | `FULL` | 5 | 25 | 216 | `RENDERABLE` | — |
| `0x13` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x14` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x15` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x16` | 1 | 2 | 16 | `FRAME_STREAM_ONLY` | 0 | 0 | 0 | `FRAME_STREAM_ONLY` | Frame stream is decoded, but this resource has not been promoted through metasprite/graphics/profile rendering invariants yet. |
| `0x17` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x18` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x19` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `GRAPHICS_PENDING` | Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet. |
| `0x1a` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x1b` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x1c` | 2 | 0 | 0 | `NONE` | 0 | 0 | 0 | `DYNAMIC_PENDING` | Special/multi-actor handler owns sequence and slot selection at runtime; static card fields preserve the resource id but cannot close actor binding alone. |
| `0x1d` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x1e` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `GRAPHICS_PENDING` | Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet. |
| `0x1f` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x20` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x21` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x22` | 1 | 1 | 10 | `FRAME_STREAM_ONLY` | 0 | 0 | 0 | `FRAME_STREAM_ONLY` | Frame stream is decoded, but this resource has not been promoted through metasprite/graphics/profile rendering invariants yet. |
| `0x23` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `HANDLER_DEPENDENT` | Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete. |
| `0x24` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table. |
| `0x25` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table. |
| `0x26` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table. |
| `0x27` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table. |
| `0x28` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table. |
| `0x29` | 1 | 0 | 0 | `NONE` | 0 | 0 | 0 | `DYNAMIC_PENDING` | Special/multi-actor handler owns sequence and slot selection at runtime; static card fields preserve the resource id but cannot close actor binding alone. |
| `0x2a` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table. |
| `0x2b` | 1 | 0 | 0 | `NONE` | 0 | 0 | 0 | `DYNAMIC_PENDING` | Special handler owns the sequence branch at runtime; static card fields preserve the resource id but do not prove the selected sequence. |
| `0x2c` | 1 | 2 | 62 | `FRAME_STREAM_ONLY` | 0 | 0 | 0 | `FRAME_STREAM_ONLY` | Frame stream is decoded, but this resource has not been promoted through metasprite/graphics/profile rendering invariants yet. |
| `0x2d` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x2e` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x2f` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x30` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x31` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x32` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x33` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x34` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x35` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x36` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x37` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x38` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x39` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x3a` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x3b` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x3c` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x3d` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x3e` | 1 | 0 | 0 | `PARTIAL` | 0 | 0 | 0 | `METASPRITE_PENDING` | Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet. |
| `0x3f` | 1 | 2 | 26 | `FRAME_STREAM_ONLY` | 0 | 0 | 0 | `FRAME_STREAM_ONLY` | Frame stream is decoded, but this resource has not been promoted through metasprite/graphics/profile rendering invariants yet. |
| `0x40` | 1 | 0 | 0 | `NONE` | 0 | 0 | 0 | `DYNAMIC_PENDING` | Special/multi-actor handler owns sequence and slot selection at runtime; static card fields preserve the resource id but cannot close actor binding alone. |
| `0x41` | 1 | 0 | 0 | `NONE` | 0 | 0 | 0 | `DYNAMIC_PENDING` | Special handler owns the sequence branch at runtime; static card fields preserve the resource id but do not prove the selected sequence. |
