import stringify from "safe-stable-stringify"
import * as fs from "node:fs/promises"
import crypto from "crypto"
import { RoomValidator } from "../validators/room"
import { StringProc, StringProcBatch } from "./string-proc"
import type { Project } from "../project"

export enum State {
  Missing,
  Stale,
  Ok,
}

export type ValidRoom =
  | ReturnType<typeof RoomValidator.parse>

export type TransformedRoom =
  | ValidRoom

export interface GitRoom {
  room: TransformedRoom
  checksum: string
}

/**
 * Represents a room in the map database with validation, state tracking, and persistence capabilities.
 */
export class Room {
  /**
   * Validates raw room data and creates a new Room instance
   * @param data Unknown data to validate as a room
   * @param userland Whether to use userland format for cartographer compatibility
   * @returns A new validated Room instance
   */
  static validate (data : unknown, userland = false) {
    const validated = RoomValidator.parse(data)
    return new Room(validated, userland)
  }

  /** Stringified version of the validated room data */
  readonly input : string;
  /** MD5 hash of the input string for change detection */
  readonly checksum: string;
  /** File path where this room is stored */
  readonly file: string;
  /** Collection of string processors for this room */
  readonly stringprocs: StringProc[]

  /** Current state of the room (Missing, Stale, or Ok) */
  _state? : State

  /**
   * Creates a new Room instance from validated room data
   * @param validated The validated room data
   * @param userland Whether to use userland format for cartographer compatibility
   */
  constructor (readonly validated : ValidRoom, userland = false) {
    this.input = stringify(this.validated)
    this.checksum = crypto.createHash("md5").update(this.input).digest("hex")
    this.file = `/rooms/${this.validated.id}/room.json`
    this.stringprocs = StringProc.transform(validated, userland)
  }

  /**
   * Gets the current state of the room by comparing with disk
   * @param project The project context
   * @returns The room's state (Missing, Stale, or Ok)
   */
  async getState (project: Project) : Promise<State> {
    if (this._state) return this._state
    const exists = await project.gitExists(this.file)
    if (!exists) {
      this._state = State.Missing
      return this._state
    }
    const disk = await project.gitRead(this.file).json() as GitRoom
    this._state = disk.checksum == this.checksum
      ? State.Ok
      : State.Stale
    return this._state
  }

  /**
   * Converts the room to a git-friendly format
   * @returns Room data with checksum for git storage
   */
  toGit () : GitRoom {
    return {checksum: this.checksum, room: this.validated}
  }

  /**
   * Converts the room to a JSON string
   * @returns Formatted JSON string of the room
   */
  toString () {
    return JSON.stringify(this.toGit(), null, 2)
  }

  /**
   * Writes the room to disk and queues string procedures for batch processing
   * @param project The project context
   * @returns Object containing any formatting errors
   */
  async write (project : Project) {
    await project.gitWrite(this.file, this.toString())
    // Queue string procedures for batch processing
    for (const proc of this.stringprocs) {
      await proc.format(project)
    }
    return {errors: []}
  }

  /**
   * Static method to process all queued string procedures in batch
   * @param project The project context
   * @param onProgress Optional progress callback
   * @returns Array of errors from batch processing
   */
  static async processBatchedStringProcs(project: Project, onProgress?: (current: number, total: number, batchNum: number, totalBatches: number) => void) {
    return await StringProcBatch.getInstance().processBatch(project, onProgress)
  }
}