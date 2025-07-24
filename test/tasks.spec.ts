import { expect, test, beforeAll, afterAll } from "bun:test"
import * as Tasks from "../src/tasks"
import { Dragonrealms, Gemstone, Project } from "../src/project"
import * as fs from "node:fs/promises"
import * as path from "path"
import ora from "ora"
import type { Room, ValidRoom } from "../src/room/room"

test("tasks can download gemstone mapdb from ffng repo", async ()=> {
  await Tasks.download({project: Gemstone})
})

test("tasks can download dragonrealms mapdb from ffng repo", async ()=> {
  await Tasks.download({project: Dragonrealms})
})

test("tasks can validate gemstone mapdb json file", async ()=> {
  await Tasks.validateMapdb({filePath: Gemstone.route("/map.json")})
})

test("tasks can validate dragonrealms mapdb json file", async ()=> {
  await Tasks.validateMapdb({filePath: Dragonrealms.route("/map.json")})
})

test("tasks can build mapdb from git directory", async () => {
  const testDir = "/tmp/test-reconstruct"
  const outputFile = "/tmp/test-reconstructed.json"

  try {
    // Clean up any existing test data
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.rm(outputFile, { force: true })

    // Create test git directory structure with sample room files
    await fs.mkdir(path.join(testDir, "rooms", "123"), { recursive: true })
    await fs.mkdir(path.join(testDir, "rooms", "456"), { recursive: true })

    // Create sample room files in GitRoom format
    const room123 = {
      checksum: "abc123",
      room: {
        id: 123,
        title: ["Test Room 1"],
        description: ["A test room for unit testing."],
        climate: "temperate",
        terrain: "path",
        wayto: {},
        timeto: {},
        image: "",
        image_coords: [],
        tags: [],
        check_location: false,
        location: "test"
      }
    }

    const room456 = {
      checksum: "def456",
      room: {
        id: 456,
        title: ["Test Room 2"],
        description: ["Another test room."],
        climate: "temperate",
        terrain: "path",
        wayto: { "123": "north" },
        timeto: { "123": 0.2 },
        image: "",
        image_coords: [],
        tags: [],
        check_location: false,
        location: "test"
      }
    }

    await fs.writeFile(
      path.join(testDir, "rooms", "123", "room.json"),
      JSON.stringify(room123, null, 2)
    )

    await fs.writeFile(
      path.join(testDir, "rooms", "456", "room.json"),
      JSON.stringify(room456, null, 2)
    )

    // Test the reconstruct function
    const project = new Project({ world: "gs" })
    const spinner = ora()

    const results = await Tasks.build({
      project,
      spinner,
      gitDir: testDir,
      outputFile,
      userland: false
    })

    // Verify results
    expect(results.roomsProcessed).toBe(2)
    expect(results.errors.length).toBe(0)

    // Verify the output file was created and has correct content
    const reconstructedContent = await fs.readFile(outputFile, 'utf-8')
    const reconstructedRooms = JSON.parse(reconstructedContent) as ValidRoom[]

    expect(Array.isArray(reconstructedRooms)).toBe(true)
    expect(reconstructedRooms.length).toBe(2)

    // Find rooms by ID and verify content
    const room123Result = reconstructedRooms.find(r => r.id === 123)
    const room456Result = reconstructedRooms.find(r => r.id === 456)

    expect(room123Result).toBeDefined()
    expect(room456Result).toBeDefined()
    if (room123Result) {
      expect(room123Result.title).toEqual(["Test Room 1"])
    }
    if (room456Result) {
      expect(room456Result.wayto["123"]).toBe("north")
    }

  } finally {
    // Clean up test files
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.rm(outputFile, { force: true })
  }
})