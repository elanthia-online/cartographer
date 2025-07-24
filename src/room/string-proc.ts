import {$} from "bun"
import path from "path"
import type { ValidRoom } from "./room"
import type { Project } from "../project"

type SerializedProc =
  | string

export enum Kind {
  Wayto = "wayto",
  Timeto = "timeto",
}

export class StringProcBatch {
  private static _instance?: StringProcBatch
  private procs: StringProc[] = []
  private processing = false
  private readonly BATCH_SIZE = 500 // Process files in batches to avoid command line length limits

  static getInstance(): StringProcBatch {
    if (!StringProcBatch._instance) {
      StringProcBatch._instance = new StringProcBatch()
    }
    return StringProcBatch._instance
  }

  add(proc: StringProc) {
    this.procs.push(proc)
  }

  getBatchInfo() {
    const totalProcs = this.procs.length
    const totalBatches = Math.ceil(totalProcs / this.BATCH_SIZE)
    return { totalProcs, totalBatches, batchSize: this.BATCH_SIZE }
  }

  async processBatch(project: Project, onProgress?: (current: number, total: number, batchNum: number, totalBatches: number) => void) {
    console.log(`StringProcBatch.processBatch called with ${this.procs.length} procs queued`)
    if (this.processing || this.procs.length === 0) return []

    this.processing = true
    const errors: Array<{err: string, file: string}> = []
    const { totalProcs, totalBatches } = this.getBatchInfo()
    console.log(`Processing ${totalProcs} stringprocs in ${totalBatches} batches`)

    try {
      // Write all files first
      onProgress?.(0, totalProcs, 0, totalBatches)
      await Promise.all(this.procs.map(async proc => {
        await project.mkdirSafely(project.gitRoute(path.dirname(proc.location)))
        await project.gitWrite(proc.location, proc.ruby)
      }))

      // Process files in batches to avoid command line length limits
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIdx = batchIndex * this.BATCH_SIZE
        const endIdx = Math.min(startIdx + this.BATCH_SIZE, this.procs.length)
        const batchProcs = this.procs.slice(startIdx, endIdx)

        onProgress?.(startIdx, totalProcs, batchIndex + 1, totalBatches)

        const filePaths = batchProcs.map(proc => project.gitRoute(proc.location))
        const process = $`standardrb --fix-unsafely ${filePaths}`
        process.quiet()
        process.nothrow()
        const result = await process

        if (result.stdout.length) {
          const output = result.stdout.toString().replaceAll("../", "")
          // Parse standardrb output to associate errors with specific files
          const lines = output.split('\n').filter(line => line.trim())
          for (const line of lines) {
            const match = line.match(/^([^:]+):/)
            if (match) {
              const filePath = match[1]
              const proc = batchProcs.find(p => project.gitRoute(p.location) === filePath)
              if (proc) {
                errors.push({err: line, file: proc.location})
              }
            }
          }
        }
      }

      onProgress?.(totalProcs, totalProcs, totalBatches, totalBatches)
    } catch (error) {
      // If batch processing fails, fallback to individual processing
      for (let i = 0; i < this.procs.length; i++) {
        const proc = this.procs[i]
        onProgress?.(i + 1, totalProcs, 1, 1)
        const result = await proc.formatIndividual(project)
        if (result.err) {
          errors.push({err: result.err, file: result.file})
        }
      }
    } finally {
      this.procs = []
      this.processing = false
    }

    return errors
  }
}

export class StringProc {
  static isSerializedProc (source : unknown ) : source is SerializedProc {
    return typeof source == "string" && source.startsWith(";e")
  }

  static isFilePathReference (source : unknown ) : source is string {
    return typeof source == "string" && source.startsWith("/rooms/") && source.endsWith(".rb")
  }

  static async transformWayto (from : ValidRoom, userland = false, gitDir?: string, sourceMapdbPath?: string) {
    const procs: StringProc[] = []
    
    for (const [to, source] of Object.entries(from.wayto)) {
      if (StringProc.isSerializedProc(source)) {
        // Handle `;e` serialized procedures
        const proc = new StringProc(Kind.Wayto, source, from.id.toString(), to)
        from.wayto[to] = userland ? proc.cartographerReference : proc.location
        procs.push(proc)
      } else if (StringProc.isFilePathReference(source) && userland && gitDir) {
        // Convert file path references to Cartographer.evaluate_script() calls
        const proc = await StringProc.fromFilePath(Kind.Wayto, source, from.id.toString(), to, gitDir, sourceMapdbPath)
        if (proc) {
          from.wayto[to] = proc.cartographerReference
          procs.push(proc)
        }
        // If proc is null (file not found), leave the original reference unchanged
      }
    }
    
    return procs
  }

  static async transformTimeto (from : ValidRoom, userland = false, gitDir?: string, sourceMapdbPath?: string) {
    const procs: StringProc[] = []
    
    for (const [to, source] of Object.entries(from.timeto)) {
      if (StringProc.isSerializedProc(source)) {
        // Handle `;e` serialized procedures
        const proc = new StringProc(Kind.Timeto, source, from.id.toString(), to)
        from.timeto[to] = userland ? proc.cartographerReference : proc.location
        procs.push(proc)
      } else if (StringProc.isFilePathReference(source) && userland && gitDir) {
        // Convert file path references to Cartographer.evaluate_script() calls
        const proc = await StringProc.fromFilePath(Kind.Timeto, source, from.id.toString(), to, gitDir, sourceMapdbPath)
        if (proc) {
          from.timeto[to] = proc.cartographerReference
          procs.push(proc)
        }
        // If proc is null (file not found), leave the original reference unchanged
      }
    }
    
    return procs
  }

  static async transform (from: ValidRoom, userland = false, gitDir?: string, sourceMapdbPath?: string) {
    const waytoProcs = await this.transformWayto(from, userland, gitDir, sourceMapdbPath)
    const timetoProcs = await this.transformTimeto(from, userland, gitDir, sourceMapdbPath)
    return [...waytoProcs, ...timetoProcs]
  }

  static async fromFilePath(kind: Kind, filePath: string, fromRoom: string, toRoom: string, gitDir: string, sourceMapdbPath?: string): Promise<StringProc | null> {
    // Create a StringProc from an existing file path reference
    const proc = Object.create(StringProc.prototype) as StringProc
    
    try {
      // Load the Ruby content from the existing file
      const fullPath = path.join(gitDir, filePath)
      const ruby = await Bun.file(fullPath).text()
      
      Object.assign(proc, {
        kind,
        source: filePath, // Store original file path as source
        from: fromRoom,
        to: toRoom,
        ruby: ruby.trim(),
        location: filePath,
        dir: path.dirname(filePath),
        // Phase 1: Use room-X-to-Y.rb format for uniqueness
        userlandPath: `${kind}/room-${fromRoom}-to-${toRoom}.rb`,
        cartographerReference: `;e Cartographer.evaluate_script('${kind}/room-${fromRoom}-to-${toRoom}.rb')`
      })
      return proc
    } catch (error: any) {
      // File doesn't exist - try to recover from source mapdb.json
      if (error.code === 'ENOENT' && sourceMapdbPath) {
        const recovered = await StringProc.recoverFromSource(kind, fromRoom, toRoom, sourceMapdbPath)
        if (recovered) {
          return recovered
        }
        
        // Recovery failed - throw descriptive error
        throw new Error(`Missing StringProc file ${filePath} and could not recover from source mapdb. This indicates incomplete git conversion.`)
      } else if (error.code === 'ENOENT') {
        // No source mapdb provided, return null for graceful handling
        return null
      }
      throw error
    }
  }

  /**
   * Attempts to recover a missing StringProc by finding it in the source mapdb.json
   */
  static async recoverFromSource(kind: Kind, fromRoom: string, toRoom: string, sourceMapdbPath: string): Promise<StringProc | null> {
    try {
      // Load and parse the source mapdb.json
      const sourceContent = await Bun.file(sourceMapdbPath).text()
      const sourceRooms = JSON.parse(sourceContent)
      
      // Find the room by ID  
      const room = sourceRooms.find((r: any) => r.id.toString() === fromRoom)
      if (!room) {
        return null
      }
      
      // Look for the StringProc in the appropriate field
      const field = kind === Kind.Wayto ? 'wayto' : 'timeto'
      const source = room[field]?.[toRoom]
      
      if (StringProc.isSerializedProc(source)) {
        // Found it! Create a StringProc from the serialized source
        return new StringProc(kind, source, fromRoom, toRoom)
      }
      
      return null
    } catch (error) {
      // Recovery failed
      return null
    }
  }

  readonly ruby : string
  readonly location : string
  readonly dir : string
  readonly cartographerReference : string
  readonly userlandPath : string

  constructor (readonly kind: Kind, readonly source : SerializedProc, readonly from : string, readonly to : string) {
    this.ruby = source.slice(2).trim()
    this.dir = path.join("rooms", from, this.kind)
    // this should eventually be able to handle `/procs/reusable-example.rb`
    this.location = `/rooms/${from}/${this.kind}/stringproc-${this.to}.rb`
    // Phase 1: Use room-X-to-Y.rb format for uniqueness
    this.userlandPath = `${this.kind}/room-${this.from}-to-${this.to}.rb`
    this.cartographerReference = `;e Cartographer.evaluate_script('${this.userlandPath}')`
  }

  async format (project : Project) {
    // Add to batch processor instead of processing immediately
    StringProcBatch.getInstance().add(this)
    return {ok: true}
  }

  async formatIndividual (project : Project) {
    await project.mkdirSafely(project.gitRoute(path.dirname(this.location)))
    await project.gitWrite(this.location, this.ruby)

    const process = $`standardrb --fix-unsafely ${project.gitRoute(this.location)}`
    process.quiet()
    process.nothrow()
    const result = await process

    if (result.stdout.length) return {err: result.stdout.toString().replaceAll("../", ""), file: this.location}
    return {ok: true}
  }
}