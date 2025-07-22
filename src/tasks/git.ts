import type { Ora } from "ora";
import {type Project} from "../project"
import { State, Room } from "../room/room";
import { download } from "./download";
import { validateMapdb } from "./validate-mapdb"

/**
 * Tracks the results of git operations performed on rooms
 * @typedef {Object} Operations
 * @property {number} updated - Count of rooms that were updated
 * @property {number} skipped - Count of rooms that were skipped (no changes needed)
 * @property {number} created - Count of rooms that were newly created
 * @property {Array<{err: string, file: string}>} errors - List of errors encountered during operations
 */
type Operations = {
  updated: number;
  skipped: number;
  created: number;
  errors: Array<{err: string, file: string}>;
}

/**
 * Configuration for seeding room data
 * @interface SeedConfig
 * @property {Project} project - Project instance containing room configuration
 */
export interface SeedConfig {
  project: Project;
  spinner: Ora;
}

/**
 * Main function to handle git operations for rooms
 * Downloads map data if needed, validates rooms, and performs necessary updates
 * @param {SeedConfig} config - Configuration object for the operation
 * @returns {Promise<Operations>} Results of all operations performed
 */
export async function git (config : SeedConfig) {
  if (!await(config.project.exists("/map.json"))) {
    await download(config)
  }

  // Set up git output directory if specified
  if (config.project.outputDir) {
    await config.project.gitSetup()
  }

  const {errors: validationErrors, rooms} = await validateMapdb({filePath: config.project.route("/map.json")})
  const operations: Operations = {
    updated: 0,
    skipped: 0,
    created: 0,
    errors: [...validationErrors.map(e => ({
      err: e.error,
      file: `rooms/${e.id}/room.json`
    }))]
  }

  for (const room of rooms) {
    await upsert(room, config.project, operations)
    const progress = operations.updated + operations.skipped + operations.created + operations.errors.length
    config.spinner.text = `completed room ${progress} of ${rooms.length} {errors=${operations.errors.length}, skipped=${operations.skipped}, created=${operations.created}} [${Math.round((progress/rooms.length) * 100)}%]`
  }
  // Process all queued string procedures in batch
  const batchErrors = await Room.processBatchedStringProcs(config.project, (current, total, batchNum, totalBatches) => {
    if (totalBatches === 1) {
      const percentage = Math.round((current / total) * 100)
      config.spinner.text = `Processing ${total} Ruby string procedures... [${percentage}%]`
    } else {
      const percentage = Math.round((current / total) * 100)
      config.spinner.text = `Processing Ruby string procedures (batch ${batchNum}/${totalBatches}) - ${current}/${total} files [${percentage}%]`
    }
  })
  operations.errors.push(...batchErrors)

  return operations
}

/**
 * Updates or creates a room based on its current state
 * @param {Room} room - Room instance to process
 * @param {Project} project - Project instance containing configuration
 * @param {Operations} operations - Tracking object for operation results
 * @returns {Promise<void>}
 */
async function upsert (room : Room, project : Project, operations : Operations) {
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