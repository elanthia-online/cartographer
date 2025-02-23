import {type Project} from "../project"
import { State, type GitRoom, type Room } from "../room/room";
import { download } from "./download";
import { validate } from "./validate"

type Operations = {
  updated: number;
  skipped:number;
  created:number;
  errors: Array<{err: string, file: string}>;
}

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
    errors: [],
    updated: 0,
    skipped: 0,
    created: 0,
  } as Operations

  for (const room of rooms) {
    await upsert(room, config.project, operations)
  }

  return operations
}

async function upsert (room : Room, project : Project, operations : Operations) {
  switch (await room.getState(project)) {
    case State.Missing:
      const create = await room.write(project)
      operations.errors.push(...create.errors)
      return operations.created++
    case State.Stale:
      const update = await room.write(project)
      operations.errors.push(...update.errors)
      return operations.updated++
    case State.Ok:
      return operations.skipped++
  }
}