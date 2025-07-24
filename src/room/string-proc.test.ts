import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { StringProc, Kind } from "./string-proc"
import * as fs from "node:fs/promises"
import * as path from "path"
import { tmpdir } from "os"

describe("StringProc", () => {
  let testDir: string
  let gitDir: string
  let sourceMapdbPath: string

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(tmpdir(), "stringproc-test-"))
    gitDir = path.join(testDir, "git")
    sourceMapdbPath = path.join(testDir, "source-mapdb.json")
    
    await fs.mkdir(gitDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe("isSerializedProc", () => {
    test("identifies serialized procedures correctly", () => {
      expect(StringProc.isSerializedProc(";e puts 'hello'")).toBe(true)
      expect(StringProc.isSerializedProc(";e table = \"test\"; fput \"go table\"")).toBe(true)
      expect(StringProc.isSerializedProc("go north")).toBe(false)
      expect(StringProc.isSerializedProc("/rooms/1/wayto/stringproc-2.rb")).toBe(false)
      expect(StringProc.isSerializedProc(null)).toBe(false)
      expect(StringProc.isSerializedProc(undefined)).toBe(false)
    })
  })

  describe("isFilePathReference", () => {
    test("identifies file path references correctly", () => {
      expect(StringProc.isFilePathReference("/rooms/1/wayto/stringproc-2.rb")).toBe(true)
      expect(StringProc.isFilePathReference("/rooms/382/timeto/stringproc-19236.rb")).toBe(true)
      expect(StringProc.isFilePathReference("go north")).toBe(false)
      expect(StringProc.isFilePathReference(";e puts 'hello'")).toBe(false)
      expect(StringProc.isFilePathReference(null)).toBe(false)
      expect(StringProc.isFilePathReference(undefined)).toBe(false)
    })
  })

  describe("fromFilePath", () => {
    test("loads StringProc from existing file", async () => {
      // Create test StringProc file
      const filePath = "/rooms/1/wayto/stringproc-2.rb"
      const fullPath = path.join(gitDir, filePath)
      const rubyContent = 'table = "test"; fput "go table"'
      
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, rubyContent)

      const proc = await StringProc.fromFilePath(Kind.Wayto, filePath, "1", "2", gitDir)
      
      expect(proc).not.toBeNull()
      expect(proc!.ruby).toBe(rubyContent)
      expect(proc!.from).toBe("1")
      expect(proc!.to).toBe("2")
      expect(proc!.kind).toBe(Kind.Wayto)
      expect(proc!.userlandPath).toBe("wayto/room-1-to-2.rb")
      expect(proc!.cartographerReference).toBe(";e Cartographer.evaluate_script('wayto/room-1-to-2.rb')")
    })

    test("returns null when file doesn't exist and no source provided", async () => {
      const filePath = "/rooms/1/wayto/nonexistent.rb"
      
      const proc = await StringProc.fromFilePath(Kind.Wayto, filePath, "1", "2", gitDir)
      
      expect(proc).toBeNull()
    })

    test("recovers from source mapdb when file doesn't exist", async () => {
      // Create source mapdb with StringProc
      const sourceMapdb = [
        {
          id: 382,
          wayto: {
            "30708": ";e table = \"test\"; fput \"go table\""
          }
        }
      ]
      await fs.writeFile(sourceMapdbPath, JSON.stringify(sourceMapdb))

      const filePath = "/rooms/382/wayto/stringproc-30708.rb"
      
      const proc = await StringProc.fromFilePath(Kind.Wayto, filePath, "382", "30708", gitDir, sourceMapdbPath)
      
      expect(proc).not.toBeNull()
      expect(proc!.ruby).toBe('table = "test"; fput "go table"')
      expect(proc!.from).toBe("382")
      expect(proc!.to).toBe("30708")
      expect(proc!.kind).toBe(Kind.Wayto)
      expect(proc!.userlandPath).toBe("wayto/room-382-to-30708.rb")
      expect(proc!.cartographerReference).toBe(";e Cartographer.evaluate_script('wayto/room-382-to-30708.rb')")
    })

    test("throws error when recovery fails", async () => {
      // Create source mapdb without the StringProc
      const sourceMapdb = [
        {
          id: 382,
          wayto: {
            "other": "go north"
          }
        }
      ]
      await fs.writeFile(sourceMapdbPath, JSON.stringify(sourceMapdb))

      const filePath = "/rooms/382/wayto/stringproc-30708.rb"
      
      await expect(
        StringProc.fromFilePath(Kind.Wayto, filePath, "382", "30708", gitDir, sourceMapdbPath)
      ).rejects.toThrow(/Missing StringProc file.*could not recover from source mapdb/)
    })
  })

  describe("recoverFromSource", () => {
    beforeEach(async () => {
      // Create comprehensive source mapdb
      const sourceMapdb = [
        {
          id: 382,
          wayto: {
            "30708": ";e table = \"Healer\"; fput \"go table\"",
            "377": "go path"
          },
          timeto: {
            "19236": ";e Map[7].timeto['30714'].call;",
            "377": 0.2
          }
        },
        {
          id: 599,
          wayto: {
            "26809": ";e table = \"Quartz Wolf\"; fput \"go #{table} table\" if dothistimeout(\"go #{table} table\", 25, /You (?:and your group )?head over to|waves.*you.*(?:invites|inviting) you(?: and your group)? to (?:join|come sit at)/) =~ /inviting you|invites you/",
            "600": "northeast"
          }
        }
      ]
      await fs.writeFile(sourceMapdbPath, JSON.stringify(sourceMapdb))
    })

    test("recovers wayto StringProc successfully", async () => {
      const proc = await StringProc.recoverFromSource(Kind.Wayto, "382", "30708", sourceMapdbPath)
      
      expect(proc).not.toBeNull()
      expect(proc!.ruby).toBe('table = "Healer"; fput "go table"')
      expect(proc!.from).toBe("382")
      expect(proc!.to).toBe("30708")
      expect(proc!.kind).toBe(Kind.Wayto)
    })

    test("recovers timeto StringProc successfully", async () => {
      const proc = await StringProc.recoverFromSource(Kind.Timeto, "382", "19236", sourceMapdbPath)
      
      expect(proc).not.toBeNull()
      expect(proc!.ruby).toBe("Map[7].timeto['30714'].call;")
      expect(proc!.from).toBe("382")
      expect(proc!.to).toBe("19236")
      expect(proc!.kind).toBe(Kind.Timeto)
    })

    test("recovers complex StringProc with long script", async () => {
      const proc = await StringProc.recoverFromSource(Kind.Wayto, "599", "26809", sourceMapdbPath)
      
      expect(proc).not.toBeNull()
      expect(proc!.ruby).toContain('table = "Quartz Wolf"')
      expect(proc!.ruby).toContain("dothistimeout")
      expect(proc!.from).toBe("599")
      expect(proc!.to).toBe("26809")
    })

    test("returns null when room not found", async () => {
      const proc = await StringProc.recoverFromSource(Kind.Wayto, "999", "1", sourceMapdbPath)
      
      expect(proc).toBeNull()
    })

    test("returns null when StringProc not found in room", async () => {
      const proc = await StringProc.recoverFromSource(Kind.Wayto, "382", "999", sourceMapdbPath)
      
      expect(proc).toBeNull()
    })

    test("returns null when target is not a StringProc", async () => {
      const proc = await StringProc.recoverFromSource(Kind.Wayto, "382", "377", sourceMapdbPath)
      
      expect(proc).toBeNull()
    })

    test("returns null when source file doesn't exist", async () => {
      const proc = await StringProc.recoverFromSource(Kind.Wayto, "382", "30708", "/nonexistent/path.json")
      
      expect(proc).toBeNull()
    })

    test("returns null when source file is invalid JSON", async () => {
      await fs.writeFile(sourceMapdbPath, "invalid json")
      
      const proc = await StringProc.recoverFromSource(Kind.Wayto, "382", "30708", sourceMapdbPath)
      
      expect(proc).toBeNull()
    })
  })

  describe("constructor", () => {
    test("creates StringProc with correct Phase 1 userland format", () => {
      const proc = new StringProc(Kind.Wayto, ";e puts 'test'", "123", "456")
      
      expect(proc.ruby).toBe("puts 'test'")
      expect(proc.from).toBe("123")
      expect(proc.to).toBe("456")
      expect(proc.kind).toBe(Kind.Wayto)
      expect(proc.location).toBe("/rooms/123/wayto/stringproc-456.rb")
      expect(proc.userlandPath).toBe("wayto/room-123-to-456.rb")
      expect(proc.cartographerReference).toBe(";e Cartographer.evaluate_script('wayto/room-123-to-456.rb')")
    })

    test("handles timeto StringProcs correctly", () => {
      const proc = new StringProc(Kind.Timeto, ";e Map[1].timeto['2'].call", "1", "2")
      
      expect(proc.ruby).toBe("Map[1].timeto['2'].call")
      expect(proc.kind).toBe(Kind.Timeto)
      expect(proc.location).toBe("/rooms/1/timeto/stringproc-2.rb")
      expect(proc.userlandPath).toBe("timeto/room-1-to-2.rb")
      expect(proc.cartographerReference).toBe(";e Cartographer.evaluate_script('timeto/room-1-to-2.rb')")
    })

    test("trims whitespace from ruby content", () => {
      const proc = new StringProc(Kind.Wayto, ";e   puts 'test'   ", "1", "2")
      
      expect(proc.ruby).toBe("puts 'test'")
    })
  })
})