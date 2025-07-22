import { expect, test } from "bun:test"
import * as Tasks from "../src/tasks"
import * as fs from "node:fs/promises"
import * as path from "path"

test("validateMapdb can validate a complete mapdb.json file", async () => {
  const testDir = "/tmp/test-validate-mapdb"
  const mapdbFile = path.join(testDir, "mapdb.json")
  
  try {
    // Clean up any existing test data
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.mkdir(testDir, { recursive: true })

    // Create a valid mapdb.json with multiple rooms
    const rooms = [
      {
        id: 100,
        title: ["Test Room 1"],
        description: ["First test room."],
        wayto: {},
        timeto: {}
      },
      {
        id: 200,
        title: ["Test Room 2"], 
        description: ["Second test room."],
        wayto: { "100": "south" },
        timeto: { "100": 0.3 }
      }
    ]

    await fs.writeFile(mapdbFile, JSON.stringify(rooms, null, 2))

    // Test validation
    const results = await Tasks.validateMapdb({
      filePath: mapdbFile
    })

    expect(results.rooms.length).toBe(2)
    expect(results.errors.length).toBe(0)

  } finally {
    // Clean up test files
    await fs.rm(testDir, { recursive: true, force: true })
  }
})

test("validateMapdb can detect invalid rooms in mapdb.json", async () => {
  const testDir = "/tmp/test-validate-mapdb-invalid"
  const mapdbFile = path.join(testDir, "invalid-mapdb.json")
  
  try {
    // Clean up any existing test data
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.mkdir(testDir, { recursive: true })

    // Create mapdb.json with valid and invalid rooms
    const rooms = [
      {
        id: 300,
        title: ["Valid Room"],
        wayto: {},
        timeto: {}
      },
      {
        id: "invalid", // Should be number
        title: ["Invalid Room"],
        // Missing wayto, timeto
      }
    ]

    await fs.writeFile(mapdbFile, JSON.stringify(rooms, null, 2))

    // Test validation
    const results = await Tasks.validateMapdb({
      filePath: mapdbFile
    })

    expect(results.rooms.length).toBe(1) // Only valid room
    expect(results.errors.length).toBe(1) // One invalid room
    expect(results.errors[0].id).toBe("invalid")
    expect(results.errors[0].error).toContain("Expected number, received string")

  } finally {
    // Clean up test files  
    await fs.rm(testDir, { recursive: true, force: true })
  }
})

test("validateMapdb throws error for non-array JSON", async () => {
  const testDir = "/tmp/test-validate-mapdb-invalid-format"
  const mapdbFile = path.join(testDir, "not-array.json")
  
  try {
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.mkdir(testDir, { recursive: true })

    // Create invalid JSON (object instead of array)
    const notAnArray = { rooms: [] }
    await fs.writeFile(mapdbFile, JSON.stringify(notAnArray, null, 2))

    // Test validation should throw error
    expect(async () => {
      await Tasks.validateMapdb({ filePath: mapdbFile })
    }).toThrow("Invalid mapdb.json format: expected an array of rooms")

  } finally {
    await fs.rm(testDir, { recursive: true, force: true })
  }
})