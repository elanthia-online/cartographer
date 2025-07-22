import os from "os"
import path from "path"
import fs from "fs/promises"
import { World } from "./world"
import { mkdir } from "node:fs/promises"
import type { Room } from "./room/room"
import type { FileSystemRouter } from "bun"

/**
 * Remote map data URLs for different game worlds
 */
export const Remote = {
  /** Gemstone map data URL */
  GS: "https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json",
  /** Dragonrealms map data URL */
  DR: "https://raw.githubusercontent.com/FarFigNewGut/lich_repo_mirror/refs/heads/main/dr_map/dr_map.json",
}

/**
 * Application running mode
 */
export enum Mode {
  Production,
  Develop
}

/**
 * Configuration interface for Project initialization
 */
export interface ProjectConfig {
  world: World
  outputDir?: string
}

/**
 * Project class for managing game world data and file operations
 */
export class Project {
  readonly world: World
  readonly remoteMap: string
  readonly mode: Mode
  readonly outputDir?: string

  /**
   * Creates a new Project instance
   * @param config - Project configuration containing the world type and optional output directory
   */
  constructor(config: ProjectConfig) {
    this.world = config.world
    this.remoteMap = config.world == "dr" ? Remote.DR : Remote.GS
    this.mode = process.env.NODE_ENV == "production" ? Mode.Production : Mode.Develop
    this.outputDir = config.outputDir
  }

  /**
   * Generates a file path within the project's temporary directory
   * @param file - Relative file path
   * @returns Absolute path to the file
   */
  route(file: string) {
    return path.join(os.tmpdir(), "cartograph", this.world, file)
  }

  /**
   * Generates a file path within the project's output directory (for git-compatible files)
   * @param file - Relative file path
   * @returns Absolute path to the file in output directory
   */
  gitRoute(file: string) {
    if (this.outputDir) {
      return path.join(this.outputDir, file)
    }
    return this.route(file)
  }

  /**
   * Checks if a file exists in the project directory
   * @param file - Relative file path
   * @returns Promise resolving to boolean indicating file existence
   */
  async exists(file: string) {
    return await fs.exists(this.route(file))
  }

  /**
   * Checks if a file exists in the git output directory
   * @param file - Relative file path
   * @returns Promise resolving to boolean indicating file existence
   */
  async gitExists(file: string) {
    return await fs.exists(this.gitRoute(file))
  }

  /**
   * Creates a file reader for the specified file
   * @param file - Relative file path
   * @returns Bun.File instance for reading
   */
  read(file: string) {
    return Bun.file(this.route(file))
  }

  /**
   * Creates a file reader for the specified file in git output directory
   * @param file - Relative file path
   * @returns Bun.File instance for reading
   */
  gitRead(file: string) {
    return Bun.file(this.gitRoute(file))
  }

  /**
   * Writes content to a file in the project directory
   * @param file - Relative file path
   * @param contents - String content to write
   * @returns Promise resolving when write is complete
   */
  async write(file: string, contents: string) {
    return Bun.write(this.route(file), contents)
  }

  /**
   * Writes content to a file in the git output directory
   * @param file - Relative file path
   * @param contents - String content to write
   * @returns Promise resolving when write is complete
   */
  async gitWrite(file: string, contents: string) {
    return Bun.write(this.gitRoute(file), contents)
  }

  /**
   * Creates a directory safely, handling existing directory cases
   * @param p - Directory path to create
   * @returns Promise resolving to true if directory exists or was created
   */
  async mkdirSafely(p: string) {
    try {
      await mkdir(p, {recursive: true})
      return true
    } catch (err : any) {
      if (err.errno == -17) return true
      throw err
    }
  }

  /**
   * Sets up initial project directory structure
   * @returns Promise resolving when setup is complete
   */
  async setup() {
    await this.mkdirSafely(this.route("/rooms"))
  }

  /**
   * Sets up git output directory structure
   * @returns Promise resolving when setup is complete
   */
  async gitSetup() {
    await this.mkdirSafely(this.gitRoute("/rooms"))
  }
}

/**
 * Pre-configured Project instance for Gemstone world
 */
export const Gemstone = new Project({
  world: "gs"
})

/**
 * Pre-configured Project instance for Dragonrealms world
 */
export const Dragonrealms = new Project({
  world: "dr"
})