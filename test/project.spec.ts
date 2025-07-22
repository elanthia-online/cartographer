import { test, expect } from "bun:test"
import { Gemstone } from "../src/project"

test("project can route correctly", async ()=> {
  expect(Gemstone.route("/rooms/123")).toBe("/tmp/cartograph/gs/rooms/123")
  expect(Gemstone.route("map.json")).toBe("/tmp/cartograph/gs/map.json")
})