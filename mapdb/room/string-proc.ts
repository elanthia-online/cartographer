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
    await project.mkdirSafely(project.route(path.dirname(this.location)))
    await project.write(this.location, this.ruby)

    const process = $`standardrb --fix-unsafely ${project.route(this.location)}`
    process.quiet()
    process.nothrow()
    const result = await process


    if (result.stdout.length) return {err: result.stdout.toString().replaceAll("../", ""), file: this.location}
    return {ok: true}
  }
}