import { expect, test } from "bun:test"
import * as Tasks from "../mapdb/tasks"
import { Dragonrealms, Gemstone } from "../mapdb/project"

test("tasks can download gemstone mapdb from ffng repo", async ()=> {
  await Tasks.download({project: Gemstone})
})

test("tasks can download dragonrealms mapdb from ffng repo", async ()=> {
  await Tasks.download({project: Dragonrealms})
})

test("tasks can validate gemstone mapdb json file", async ()=> {
  await Tasks.validate({project: Gemstone})
})

test("tasks can validate dragonrealms mapdb json file", async ()=> {
  await Tasks.validate({project: Dragonrealms})
})