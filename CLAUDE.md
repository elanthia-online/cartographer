# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

This project uses **Bun** as the JavaScript runtime and package manager. The codebase is written in TypeScript with ESNext modules.

### Key Commands

- `bun run mapdb download` - Download mapdb JSON file to local tmp directory
- `bun run mapdb download --dr` - Download DragonRealms mapdb (default is GemStone)
- `bun run mapdb validate` - Validate mapdb in local tmp directory
- `bun run mapdb validate --dr` - Validate DragonRealms mapdb
- `bun run mapdb git` - Generate git-friendly mapdb output on filesystem
- `bun run mapdb git --dr` - Generate git-friendly DragonRealms mapdb
- `bun test` - Run test suite

### CLI Tool

The project provides a CLI tool accessible via `./mapdb/cli.ts` that supports:
- `download` (alias: `dl`) - Downloads map data from remote sources
- `validate` (alias: `v`) - Validates map data structure and content
- `git` - Outputs filesystem-friendly version for git tracking

## Architecture Overview

This is a **MapDB cartographer** for Elanthia Online game worlds, specifically supporting **GemStone** and **DragonRealms**.

### Core Components

**Project Management (`mapdb/project.ts`)**
- `Project` class handles file operations and configuration
- Pre-configured instances: `Gemstone` and `Dragonrealms` 
- Uses OS temp directory structure: `/tmp/cartograph/{world}/`
- Manages remote map data URLs from GitHub repositories

**Room System (`mapdb/room/`)**
- `Room` class represents individual map rooms with validation
- Includes state tracking (Missing, Stale, Ok) and checksum-based change detection
- `StringProc` handles string processing separate from room definitions
- Rooms are stored as individual JSON files in `/rooms/{id}/room.json`

**Task System (`mapdb/tasks/`)**
- `download.ts` - Fetches map data from remote sources
- `validate.ts` - Validates room data using Zod schemas
- `git.ts` - Converts mapdb to git-trackable format

**Validation (`mapdb/validators/`)**
- Zod-based validators for room, climate, and terrain data
- Ensures data integrity and type safety

### Data Flow

1. **Download**: Fetches JSON map data from GitHub repositories
2. **Validate**: Parses and validates room data against schemas
3. **Git**: Converts to individual room files with checksums for version control

### Remote Data Sources

- **GemStone**: `https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json`
- **DragonRealms**: `https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/dr_map/dr_map.json`

## Project Goals

The project aims to:
- Create git history for MapDB data
- Enable direct import from `;repository` 
- Separate StringProc from Room definitions
- Build CI/CD pipeline for MapDB
- Provide MapDB tooling
- Create `;go2` utility using tarball from this repository
- Develop bot for pulling/merging MapDB changes

## Development Notes

- Uses Bun-specific file operations (`Bun.file`, `Bun.write`)
- TypeScript with strict mode enabled
- Validation errors use `zod-validation-error` for better error messages
- CLI uses `commander` for argument parsing and `ora` for progress spinners
- Testing with Bun's built-in test runner

## Userland StringProc Architecture

### Current Implementation (Phase 1)

The cartographer now supports a "userland" build format designed for `cartographer.lic` consumption that solves dijkstra pathfinding errors caused by StringProc file path references.

**Build Commands:**
- `bun run src/cartographer.ts build --userland -i <git-dir> -o <output-dir>` - Builds userland format
- `bun run src/cartographer.ts build -i <git-dir> -o <output-file>` - Builds standard format

**Current Format (Phase 1):**
```json
{
  "wayto": {
    "200": ";e Cartographer.evaluate_script('wayto/room-100-to-200.rb')"
  },
  "timeto": {
    "200": ";e Cartographer.evaluate_script('timeto/room-100-to-200.rb')"
  }
}
```

**Directory Structure:**
```
version/
├── mapdb.json                    # With Cartographer.evaluate_script() refs
└── stringprocs/
    ├── wayto/
    │   └── room-100-to-200.rb   # Unique per from-room + to-room
    └── timeto/
        └── room-100-to-200.rb
```

### Future Reusable StringProcs (Phase 2)

**Vision for parameterized, reusable StringProcs:**

**Enhanced Format (Future):**
```json
{
  "wayto": {
    "tavern": ";e Cartographer.load('common/table.rb'); Cartographer.call(:table, 'Cat\\'s Paw')"
  }
}
```

**Enhanced Directory Structure:**
```
stringprocs/
├── wayto/
│   ├── common/
│   │   ├── table.rb          # Reusable table interaction logic
│   │   ├── door.rb           # Reusable door logic  
│   │   └── teleport.rb       # Reusable teleport logic
│   └── specific/
│       └── room-789-special.rb  # Room-specific unique logic
└── timeto/
    ├── common/
    │   └── variable-timing.rb
    └── specific/
        └── room-456-complex.rb
```

**Proposed DSL in common/table.rb:**
```ruby
Cartographer.wayto(:table) do |table_name|
  fput "go #{table_name} table" if /inviting you|invites you/.match?(
    dothistimeout("go #{table_name} table", 25, /You (?:and your group )?head over to|waves.*you.*(?:invites|inviting) you(?: and your group)? to (?:join|come sit at)/)
  )
end

Cartographer.timeto(:table) do |table_name|
  0.2  # or complex logic based on table_name
end
```

### Implementation Phases

1. **Phase 1 (Current)**: `room-X-to-Y.rb` format for all StringProcs - maintains uniqueness
2. **Phase 2 (Future)**: Identify common patterns through duplicate analysis
3. **Phase 3 (Future)**: Implement parameterized DSL and migrate common patterns to `common/`

### Benefits of This Architecture

- ✅ **Fixes dijkstra pathfinding errors** - No more String+ exceptions
- ✅ **Maintains uniqueness** - Each from-room + to-room combination is isolated  
- ✅ **Enables future deduplication** - Path to reusable, parameterized StringProcs
- ✅ **Backward compatibility** - cartographer.lic can handle both current and future formats
- ✅ **Progressive enhancement** - Can gradually move from specific to reusable patterns