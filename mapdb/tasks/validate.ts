import * as Project from "../project"
import fs from "fs/promises"
import { download } from "./download"
import { RoomList } from "../schema/room"

const DEFAULT_MAPDB_URL = "https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json"
const MAPDB_FILE = "mapdb.json"
const MAPDB_FILE_ABSOLUTE = Project.asset(MAPDB_FILE)

export async function isDownloaded () {
  return fs.exists(MAPDB_FILE_ABSOLUTE)
}

export async function load () : Promise<Array<{id: string}>> {
  return await Project.readJSON(MAPDB_FILE)
}

export async function validate () {
  if (!await isDownloaded()) await download({url: DEFAULT_MAPDB_URL})
  const rooms = await load()
  const then = performance.now()
  const db =  await RoomList.parseAsync(rooms)
  console.log("validated %s rooms in %sms", rooms.length, performance.now() - then)
}