import * as Project from "../project"
import fs from "fs/promises"
import { download } from "./download"
import { RoomList } from "../schema/room"
import ora from "ora"
const MAPDB_FILE = "mapdb.json"
const MAPDB_FILE_ABSOLUTE = Project.asset(MAPDB_FILE)

export async function isDownloaded () {
  return fs.exists(MAPDB_FILE_ABSOLUTE)
}

export async function load () : Promise<Array<{id: string}>> {
  return await Project.readJSON(MAPDB_FILE)
}

export async function validate () {
  if (!await isDownloaded()) await download()
  const spinner = ora()
  spinner.start("validating mapdb...")
  const rooms = await load()
  const then = performance.now()
  const db =  await RoomList.parseAsync(rooms)
  spinner.succeed(`validated ${rooms.length} rooms in ${performance.now() - then}ms`)
}