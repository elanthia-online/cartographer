import * as Project from "../project"
import { RoomList } from "../schema/room"
import ora from "ora"
import type { ZodIssue } from "zod"


export async function load (file : string) : Promise<Array<{id: string}>> {
  return await Project.readJSON(file)
}

export async function validate (file : string) {
  const db = Project.asset(file)
  const spinner = ora()
  spinner.start(`validating mapdb at ${db}...`)
  const rooms = await load(file)
  const then = performance.now()
  const result =  await RoomList.safeParseAsync(rooms)
  const runtime = performance.now() - then
  if (result.success) {
    return spinner.succeed(`validated ${rooms.length} rooms in ${runtime}ms`)
  }

  spinner.fail(`found ${result.error.errors.length} errors in ${file}`)
  const errorTable = Object.fromEntries(result.error.errors.map(err => [err.path.join("."), err.message]))
  console.table(errorTable)
  throw new Error(`${file} is invalid`)
}