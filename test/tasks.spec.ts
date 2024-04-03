import { expect, test } from "bun:test";
import * as Tasks from "../mapdb/tasks"

test("tasks can download a mapdb from ffng repo", async ()=> {
  await Tasks.download()
})

test("tasks can validate a mapdb json file", async ()=> {
  await Tasks.validate()
})