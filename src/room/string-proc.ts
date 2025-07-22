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
    if (this.processing || this.procs.length === 0) return []

    this.processing = true
    const errors: Array<{err: string, file: string}> = []
    const { totalProcs, totalBatches } = this.getBatchInfo()

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

  static transformWayto (from : ValidRoom) {
    return Object.entries(from.wayto).flatMap(([to, source])=> {
      if (!StringProc.isSerializedProc(source)) return []
      const proc = new StringProc(Kind.Wayto, source, from.id.toString(), to)
      from.wayto[to] = proc.location
      return [proc]
    })
  }

  static transformTimeto (from : ValidRoom) {
    return Object.entries(from.timeto).flatMap(([to, source])=> {
      if (!StringProc.isSerializedProc(source)) return []
      const proc = new StringProc(Kind.Timeto, source, from.id.toString(), to)
      from.timeto[to] = proc.location
      return [proc]
    })
  }

  static transform (from: ValidRoom) {
    return [...this.transformWayto(from), ...this.transformTimeto(from)]
  }

  readonly ruby : string
  readonly location : string
  readonly dir : string

  constructor (readonly kind: Kind, readonly source : SerializedProc, readonly from : string, readonly to : string) {
    this.ruby = source.slice(2).trim()
    this.dir = path.join("rooms", from, this.kind)
    // this should eventually be able to handle `/procs/reusable-example.rb`
    this.location = `/rooms/${from}/${this.kind}/stringproc-${this.to}.rb`
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