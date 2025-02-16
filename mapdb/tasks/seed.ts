import * as Project from "../project"

export enum Mode {
  Production,
  Test
}

export interface SeedOptions {
  mode: Mode;
  file: string;
  world: "gemstone" | "dragonrealms"
}

export function seed (options : SeedOptions) {

}