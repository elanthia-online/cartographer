import * as Project from "./project"
import ora from "ora"
import fs from "fs/promises"
import { RoomList } from "./schema/room"
import * as z from "zod"
const DEFAULT_MAPDB_URL = "https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json"
const MAPDB_FILE = "mapdb.json"
const MAPDB_FILE_ABSOLUTE = Project.asset(MAPDB_FILE)

export async function isDownloaded () {
  return fs.exists(MAPDB_FILE_ABSOLUTE)
}

export async function load () {
  return await Project.readJSON(MAPDB_FILE)
}

export async function download ({url}: {url: string}) {
  const spinner = ora()
  spinner.start(`downloading ${url}...`)
  try {
    await Project.setup()
    const db = await fetch(url)
    if (!db.ok) {
      throw new Error(`error fetching > status=${db.statusText} ${url}`)
    }
    const {location, write, stats} = await Project.write("mapdb.json", await db.text())
    const mb = (stats.size / Math.pow(2, 20)).toFixed(2)
    spinner.succeed(`mapdb of ${mb}mb successfully downloaded to ${location}`)
  } catch (err : any) {
    spinner.fail(err.message)
  }
}

export async function validate () {
  if (!await isDownloaded()) await download({url: DEFAULT_MAPDB_URL})
  const db =  await RoomList.parseAsync(await load())
  console.log(db.slice(0,10))
}