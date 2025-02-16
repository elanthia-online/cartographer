import { expect, test } from "bun:test"
import * as Tasks from "../mapdb/tasks"
import { DragonrealmsTemporary, GemstoneTemporary } from "../mapdb/project"

test("tasks can download gemstone mapdb from ffng repo", async ()=> {
  await Tasks.download({project: GemstoneTemporary})
})

test("tasks can download dragonrealms mapdb from ffng repo", async ()=> {
  await Tasks.download({project: DragonrealmsTemporary})
})

test("tasks can validate gemstone mapdb json file", async ()=> {
  await Tasks.validate({project: GemstoneTemporary})
})

test("tasks can validate dragonrealms mapdb json file", async ()=> {
  await Tasks.validate({project: DragonrealmsTemporary})
})