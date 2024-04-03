import os from "os"
import path from "path"
import fs from "fs/promises"

const PROJECT_FOLDER = path.join(os.tmpdir(), "cartograph")

export async function mkdirSafely (p : string) {
  try {
    await fs.mkdir(p)
    return true
  } catch (err : any) {
    if (err.errno == -17) return true
    throw err
  }
}

export function asset (file : string) {
  return path.join(PROJECT_FOLDER, file)
}

export async function readJSON (file : string) {
  const projectFile = asset(file)
  const buffer = await fs.readFile(projectFile)
  return JSON.parse(buffer.toString())
}

export async function setup () {
  await mkdirSafely(PROJECT_FOLDER)
}

export async function write (file : string, data : string) {
  const location = asset(file)
  const write = await fs.writeFile(location, data)
  return {location, write, stats: await fs.stat(location)}
}
