import os from "os"
import path from "path"
import fs from "fs/promises"
import { World } from "./world"

const TEMP_ROOT = path.join(os.tmpdir(), "cartograph")

export const KNOWN_MAPS = {
  GS: "https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json",
  DR: "https://raw.githubusercontent.com/FarFigNewGut/lich_repo_mirror/refs/heads/main/dr_map/dr_map.json",
}

export interface ProjectConfig {
  rootDir : string,
  world : World
}

export class Project {
  static Map = "map.json"
  readonly context : string;
  readonly rootDir : string;
  readonly world : string;
  readonly remoteMap : string;
  constructor (config : ProjectConfig) {
    this.rootDir = config.rootDir
    this.world   = config.world
    this.remoteMap = config.world == World.Dragonrealms ? KNOWN_MAPS.DR : KNOWN_MAPS.GS
    this.context = path.join(this.rootDir, this.world)
  }

  async mkdirSafely (p : string) {
    try {
      await fs.mkdir(p)
      return true
    } catch (err : any) {
      if (err.errno == -17) return true
      throw err
    }
  }

  asset (file : string) {
    return path.join(this.context, file)
  }

  map () {
    return this.asset(Project.Map)
  }

  async readJSON (file : string) {
    const projectFile = this.asset(file)
    const buffer = await fs.readFile(projectFile)
    return JSON.parse(buffer.toString())
  }

  async readMap () {
    return this.readJSON(Project.Map)
  }

  async writeMap (data : string) {
    return this.write(Project.Map, data)
  }

  async setup () {
    await this.mkdirSafely(this.rootDir)
    await this.mkdirSafely(this.context)
  }

  async write (file : string, data : string) {
    await this.setup()
    const location = this.asset(file)
    const write = await fs.writeFile(location, data)
    return {location, write, stats: await fs.stat(location)}
  }
}

export const GemstoneTemporary = new Project({
  rootDir: TEMP_ROOT,
  world: World.Gemstone
})
export const DragonrealmsTemporary = new Project({
  rootDir: TEMP_ROOT,
  world: World.Dragonrealms
})