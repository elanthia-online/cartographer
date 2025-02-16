import { expect, test } from "bun:test";
import * as Tasks from "../mapdb/tasks"
import { KnownMaps } from "../mapdb/tasks/download";

test("tasks can download gemstone mapdb from ffng repo", async ()=> {
  await Tasks.download({url: KnownMaps.GS, to: "gemstone.json"})
})

test("tasks can download dragonrealms mapdb from ffng repo", async ()=> {
  await Tasks.download({url: KnownMaps.DR, to: "dragonrealms.json"})
})

test("tasks can validate gemstone mapdb json file", async ()=> {
  await Tasks.validate("gemstone.json")
})

test("tasks can validate gemstone mapdb json file", async ()=> {
  await Tasks.validate("dragonrealms.json")
})