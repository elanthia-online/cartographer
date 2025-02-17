import {type Project} from "../project"
import { State, type GitRoom, type Room } from "../room/room";
import { download } from "./download";
import { validate } from "./validate"

export interface SeedConfig {
  project: Project;
}

export async function git (config : SeedConfig) {
  if (!await(config.project.exists("/map.json"))) {
    await download(config)
  }

  const {errors, rooms} = await validate(config)
  const operations = {
    valid: rooms.length,
    errored: errors.length,
    updated: 0,
    skipped: 0,
    created: 0,
  }

  for (const room of rooms.slice(0,3)) {
    await upsert(room, config.project, operations)
  }

  return operations
}

async function upsert (room : Room, project : Project, operations : {updated: number, skipped:number, created:number}) {
  switch (await room.getState(project)) {
    case State.Missing:
      await room.write(project)
      return operations.created++
    case State.Stale:
      await room.write(project)
      return operations.updated++
    case State.Ok:
      return operations.skipped++
  }
}