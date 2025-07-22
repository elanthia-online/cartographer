import { expect, test, beforeAll, afterAll } from "bun:test"
import * as Tasks from "../src/tasks"
import * as fs from "node:fs/promises"
import * as path from "path"

test("validateFiles can validate valid room files", async () => {
  const testDir = "/tmp/test-validate-files"
  const validRoomFile = path.join(testDir, "valid-room.json")
  
  try {
    // Clean up any existing test data
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.mkdir(testDir, { recursive: true })

    // Create a valid room file in GitRoom format
    const validRoom = {
      checksum: "abc123",
      room: {
        id: 123,
        title: ["Test Room"],
        description: ["A test room for validation."],
        terrain: "rough",
        wayto: {},
        timeto: {},
        location: "test"
      }
    }

    await fs.writeFile(validRoomFile, JSON.stringify(validRoom, null, 2))

    // Test validation
    const results = await Tasks.validateFiles({
      files: [validRoomFile],
      json: false
    })

    expect(results.validFiles).toBe(1)
    expect(results.errors.length).toBe(0)
    expect(results.files).toEqual([validRoomFile])

  } finally {
    // Clean up test files
    await fs.rm(testDir, { recursive: true, force: true })
  }
})

test("validateFiles can detect invalid room files", async () => {
  const testDir = "/tmp/test-validate-files-invalid"
  const invalidRoomFile = path.join(testDir, "invalid-room.json")
  
  try {
    // Clean up any existing test data
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.mkdir(testDir, { recursive: true })

    // Create an invalid room file (missing required fields)
    const invalidRoom = {
      checksum: "abc123",
      room: {
        id: "invalid", // Should be number
        title: ["Test Room"],
        // Missing wayto, timeto (required fields)
      }
    }

    await fs.writeFile(invalidRoomFile, JSON.stringify(invalidRoom, null, 2))

    // Test validation
    const results = await Tasks.validateFiles({
      files: [invalidRoomFile],
      json: true
    })

    expect(results.validFiles).toBe(0)
    expect(results.errors.length).toBe(1)
    expect(results.errors[0].file).toBe(invalidRoomFile)
    expect(results.errors[0].id).toBe("invalid")
    expect(results.errors[0].error).toContain("Expected number, received string")

  } finally {
    // Clean up test files
    await fs.rm(testDir, { recursive: true, force: true })
  }
})

test("validateFiles can handle mixed valid and invalid files", async () => {
  const testDir = "/tmp/test-validate-files-mixed"
  const validFile = path.join(testDir, "valid.json")
  const invalidFile = path.join(testDir, "invalid.json")
  
  try {
    await fs.rm(testDir, { recursive: true, force: true })
    await fs.mkdir(testDir, { recursive: true })

    // Create valid room
    const validRoom = {
      checksum: "abc123",
      room: {
        id: 456,
        title: ["Valid Room"],
        description: ["A valid room."],
        wayto: {},
        timeto: {}
      }
    }

    // Create invalid room
    const invalidRoom = {
      room: {
        id: 789,
        // Missing wayto, timeto
      }
    }

    await fs.writeFile(validFile, JSON.stringify(validRoom, null, 2))
    await fs.writeFile(invalidFile, JSON.stringify(invalidRoom, null, 2))

    const results = await Tasks.validateFiles({
      files: [validFile, invalidFile],
      json: false
    })

    expect(results.validFiles).toBe(1)
    expect(results.errors.length).toBe(1)
    expect(results.files.length).toBe(2)

  } finally {
    await fs.rm(testDir, { recursive: true, force: true })
  }
})