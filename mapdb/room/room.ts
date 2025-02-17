import stringify from "safe-stable-stringify"
import * as fs from "node:fs/promises"
import crypto from "crypto"
import { RoomValidator } from "../validators/room"
import { StringProc } from "./string-proc"
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

export class Room {
  static validate (data : unknown) {
    const validated = RoomValidator.parse(data)
    return new Room(validated)
  }
  readonly input : string;
  readonly checksum: string;
  readonly file: string;
  readonly stringprocs: StringProc[]

  _state? : State
  constructor (readonly validated : ValidRoom) {
    this.input = stringify(this.validated)
    this.checksum = crypto.createHash("md5").update(this.input).digest("hex")
    this.file = `/rooms/${this.validated.id}/room.json`
    this.stringprocs = StringProc.transform(validated)
  }

  async getState (project: Project) : Promise<State> {
    if (this._state) return this._state
    const exists = await project.exists(this.file)
    if (!exists) {
      this._state = State.Missing
      return this._state
    }
    const disk = await project.read(this.file).json() as GitRoom
    this._state = disk.checksum == this.checksum
      ? State.Ok
      : State.Stale
    return this._state
  }

  toGit () : GitRoom {
    return {checksum: this.checksum, room: this.validated}
  }

  toString () {
    return JSON.stringify(this.toGit(), null, 2)
  }

  async write (project : Project) {
    await project.write(this.file, this.toString())
    for (const proc of this.stringprocs) {
      await proc.format(project)
    }
  }
}