import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { build } from "./build"
import { Project } from "../project"
import * as fs from "node:fs/promises"
import * as path from "path"
import { tmpdir } from "os"
import ora from "ora"

describe("build task with StringProc recovery", () => {
  let testDir: string
  let gitDir: string
  let outputDir: string
  let sourceMapdbPath: string
  let project: Project

  beforeEach(async () => {
    // Create temporary test directories
    testDir = await fs.mkdtemp(path.join(tmpdir(), "build-test-"))
    gitDir = path.join(testDir, "git")
    outputDir = path.join(testDir, "output")
    sourceMapdbPath = path.join(testDir, "source-mapdb.json")
    
    await fs.mkdir(gitDir, { recursive: true })
    await fs.mkdir(outputDir, { recursive: true })

    project = new Project({ world: "gs" })
  })

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe("userland build with recovery", () => {
    test("successfully recovers missing StringProcs from source mapdb", async () => {
      // Create source mapdb with StringProcs
      const sourceMapdb = [
        {
          id: 382,
          title: ["[Empath Guild, Entrance]"],
          description: ["A guild entrance"],
          paths: ["Obvious paths: none"],
          location: "Wehnimer's Landing",
          climate: "temperate",
          terrain: "hard, flat",
          wayto: {
            "377": "go path",
            "19236": "go gates",
            "30708": ";e table = \"Healer\"; fput \"go table\""
          },
          timeto: {
            "377": 0.2,
            "19236": ";e Map[7].timeto['30714'].call;",
            "30708": 0.2
          },
          tags: ["empathguild"],
          uid: [651001]
        }
      ]
      await fs.writeFile(sourceMapdbPath, JSON.stringify(sourceMapdb))

      // Create git room with missing StringProc files (file path references)
      const gitRoom = {
        checksum: "test-checksum",
        room: {
          id: 382,
          title: ["[Empath Guild, Entrance]"],
          description: ["A guild entrance"],
          paths: ["Obvious paths: none"],
          location: "Wehnimer's Landing",
          climate: "temperate",
          terrain: "hard, flat",
          wayto: {
            "377": "go path",
            "19236": "go gates",
            "30708": "/rooms/382/wayto/stringproc-30708.rb"  // Missing file
          },
          timeto: {
            "377": 0.2,
            "19236": "/rooms/382/timeto/stringproc-19236.rb",  // Missing file
            "30708": 0.2
          },
          tags: ["empathguild"],
          uid: [651001]
        }
      }

      const roomDir = path.join(gitDir, "rooms", "382")
      await fs.mkdir(roomDir, { recursive: true })
      await fs.writeFile(path.join(roomDir, "room.json"), JSON.stringify(gitRoom, null, 2))

      // Run userland build with recovery
      const spinner = ora().start()
      const results = await build({
        project,
        spinner,
        gitDir,
        outputDir,
        userland: true,
        sourceMapdbPath
      })
      spinner.stop()

      // Verify build succeeded
      expect(results.roomsProcessed).toBe(1)
      expect(results.errors).toHaveLength(0)

      // Verify mapdb.json was created with Cartographer.evaluate_script references
      const mapdbPath = path.join(outputDir, "mapdb.json")
      expect(await fs.stat(mapdbPath)).toBeTruthy()
      
      const mapdbContent = JSON.parse(await fs.readFile(mapdbPath, "utf-8"))
      expect(mapdbContent).toHaveLength(1)
      
      const room = mapdbContent[0]
      expect(room.wayto["30708"]).toBe(";e Cartographer.evaluate_script('wayto/room-382-to-30708.rb')")
      expect(room.timeto["19236"]).toBe(";e Cartographer.evaluate_script('timeto/room-382-to-19236.rb')")

      // Verify StringProc files were created
      const waytoProcPath = path.join(outputDir, "stringprocs", "wayto", "room-382-to-30708.rb")
      const timetoProcPath = path.join(outputDir, "stringprocs", "timeto", "room-382-to-19236.rb")
      
      expect(await fs.stat(waytoProcPath)).toBeTruthy()
      expect(await fs.stat(timetoProcPath)).toBeTruthy()
      
      const waytoContent = await fs.readFile(waytoProcPath, "utf-8")
      const timetoContent = await fs.readFile(timetoProcPath, "utf-8")
      
      expect(waytoContent).toBe('table = "Healer"; fput "go table"')
      expect(timetoContent).toBe("Map[7].timeto['30714'].call;")
    })

    test("handles mix of existing files and recovered StringProcs", async () => {
      // Create source mapdb
      const sourceMapdb = [
        {
          id: 1,
          wayto: {
            "2": ";e puts 'recovered'",
            "3": ";e puts 'also recovered'"
          }
        }
      ]
      await fs.writeFile(sourceMapdbPath, JSON.stringify(sourceMapdb))

      // Create git room with one existing StringProc file and one missing
      const gitRoom = {
        checksum: "test-checksum",
        room: {
          id: 1,
          title: ["Test Room"],
          description: ["A test room"],
          paths: ["Obvious exits: north, south"],
          wayto: {
            "2": "/rooms/1/wayto/stringproc-2.rb",  // Missing - will be recovered
            "3": "/rooms/1/wayto/stringproc-3.rb"   // Will be created
          },
          timeto: {
            "2": 0.2,
            "3": 0.2
          }
        }
      }

      const roomDir = path.join(gitDir, "rooms", "1")
      const waytoDit = path.join(roomDir, "wayto")
      await fs.mkdir(waytoDit, { recursive: true })
      await fs.writeFile(path.join(roomDir, "room.json"), JSON.stringify(gitRoom, null, 2))
      
      // Create one existing StringProc file
      await fs.writeFile(path.join(waytoDit, "stringproc-3.rb"), "puts 'existing file'")

      // Run userland build
      const spinner = ora().start()
      const results = await build({
        project,
        spinner,
        gitDir,
        outputDir,
        userland: true,
        sourceMapdbPath
      })
      spinner.stop()

      // Verify both StringProcs were processed
      expect(results.roomsProcessed).toBe(1)
      expect(results.errors).toHaveLength(0)

      const recoveredPath = path.join(outputDir, "stringprocs", "wayto", "room-1-to-2.rb")
      const existingPath = path.join(outputDir, "stringprocs", "wayto", "room-1-to-3.rb")
      
      expect(await fs.readFile(recoveredPath, "utf-8")).toBe("puts 'recovered'")
      expect(await fs.readFile(existingPath, "utf-8")).toBe("puts 'existing file'")
    })

    test("reports error when recovery fails for missing StringProc", async () => {
      // Create source mapdb without the required StringProc
      const sourceMapdb = [
        {
          id: 382,
          wayto: {
            "377": "go path"  // Missing the StringProc we need
          }
        }
      ]
      await fs.writeFile(sourceMapdbPath, JSON.stringify(sourceMapdb))

      // Create git room with missing StringProc file
      const gitRoom = {
        checksum: "test-checksum",
        room: {
          id: 382,
          title: ["Test Room"],
          description: ["A test room"],
          paths: ["Obvious exits: none"],
          wayto: {
            "30708": "/rooms/382/wayto/stringproc-30708.rb"  // Missing and can't recover
          },
          timeto: {}
        }
      }

      const roomDir = path.join(gitDir, "rooms", "382")
      await fs.mkdir(roomDir, { recursive: true })
      await fs.writeFile(path.join(roomDir, "room.json"), JSON.stringify(gitRoom, null, 2))

      // Run userland build - should report error but not throw
      const spinner = ora().start()
      const results = await build({
        project,
        spinner,
        gitDir,
        outputDir,
        userland: true,
        sourceMapdbPath
      })
      spinner.stop()

      // Should complete with error reported
      expect(results.roomsProcessed).toBe(0)
      expect(results.errors).toHaveLength(1)
      expect(results.errors[0].err).toMatch(/Missing StringProc file.*could not recover from source mapdb/)
      expect(results.errors[0].file).toContain("rooms/382/room.json")
    })

    test("gracefully handles missing StringProcs when no source mapdb provided", async () => {
      // Create git room with missing StringProc file
      const gitRoom = {
        checksum: "test-checksum",
        room: {
          id: 382,
          title: ["Test Room"],
          description: ["A test room"],
          paths: ["Obvious exits: none"],
          wayto: {
            "377": "go path",
            "30708": "/rooms/382/wayto/stringproc-30708.rb"  // Missing file
          },
          timeto: {
            "377": 0.2
          }
        }
      }

      const roomDir = path.join(gitDir, "rooms", "382")
      await fs.mkdir(roomDir, { recursive: true })
      await fs.writeFile(path.join(roomDir, "room.json"), JSON.stringify(gitRoom, null, 2))

      // Run userland build without source mapdb
      const spinner = ora().start()
      const results = await build({
        project,
        spinner,
        gitDir,
        outputDir,
        userland: true
        // No sourceMapdbPath provided
      })
      spinner.stop()

      // Should complete but leave the file path reference unchanged
      expect(results.roomsProcessed).toBe(1)
      expect(results.errors).toHaveLength(0)

      const mapdbContent = JSON.parse(await fs.readFile(path.join(outputDir, "mapdb.json"), "utf-8"))
      const room = mapdbContent[0]
      
      // Should preserve original file path reference since no recovery was possible
      expect(room.wayto["30708"]).toBe("/rooms/382/wayto/stringproc-30708.rb")
    })
  })

  describe("standard build (non-userland)", () => {
    test("standard build ignores StringProc file path references", async () => {
      // Create git room with file path references
      const gitRoom = {
        checksum: "test-checksum",
        room: {
          id: 382,
          title: ["Test Room"],
          description: ["A test room"],
          paths: ["Obvious exits: none"],
          wayto: {
            "377": "go path",
            "30708": "/rooms/382/wayto/stringproc-30708.rb"
          },
          timeto: {
            "377": 0.2
          }
        }
      }

      const roomDir = path.join(gitDir, "rooms", "382")
      await fs.mkdir(roomDir, { recursive: true })
      await fs.writeFile(path.join(roomDir, "room.json"), JSON.stringify(gitRoom, null, 2))

      const outputFile = path.join(outputDir, "mapdb.json")

      // Run standard build
      const spinner = ora().start()
      const results = await build({
        project,
        spinner,
        gitDir,
        outputFile,
        userland: false
      })
      spinner.stop()

      // Should preserve file path references in standard build
      expect(results.roomsProcessed).toBe(1)
      expect(results.errors).toHaveLength(0)

      const mapdbContent = JSON.parse(await fs.readFile(outputFile, "utf-8"))
      expect(mapdbContent).toHaveLength(1)
      expect(mapdbContent[0].wayto["30708"]).toBe("/rooms/382/wayto/stringproc-30708.rb")
    })
  })
})