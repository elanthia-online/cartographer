import os from "os"
import path from "path"
import fs from "fs/promises"
import { World } from "./world"
import { mkdir } from "node:fs/promises"
import type { Room } from "./room/room"
import type { FileSystemRouter } from "bun"

export const Remote = {
  GS: "https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json",
  DR: "https://raw.githubusercontent.com/FarFigNewGut/lich_repo_mirror/refs/heads/main/dr_map/dr_map.json",
}

export enum Mode {
  Production,
  Develop
}

export interface ProjectConfig {
  world : World
}

export class Project {
  readonly world : string
  readonly remoteMap : string
  readonly mode : Mode
  constructor (config : ProjectConfig) {
    this.world = config.world
    this.remoteMap = config.world == World.Dragonrealms ? Remote.DR : Remote.GS
    this.mode = process.env.NODE_ENV == "production" ? Mode.Production : Mode.Develop
  }

  route (file : string) {
    return path.join(os.tmpdir(), "cartograph", this.world, file)
  }

  async exists (file : string) {
    return await fs.exists(this.route(file))
  }

  read (file : string) {
    return Bun.file(this.route(file))
  }

  async write (file : string, contents : string) {
    return Bun.write(this.route(file), contents)
  }

  async mkdirSafely (p : string) {
    try {
      await mkdir(p, {recursive: true})
      return true
    } catch (err : any) {
      if (err.errno == -17) return true
      throw err
    }
  }

  async setup () {
    await this.mkdirSafely(this.route("/rooms"))
  }
}

export const Gemstone = new Project({
  world: World.Gemstone
})
export const Dragonrealms = new Project({
  world: World.Dragonrealms
})