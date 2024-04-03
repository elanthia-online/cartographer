#!/usr/bin/env bun
import { program } from "commander"
import * as Tasks from "./tasks"

program.command("download")
  .alias("dl")
  .option("--url <url>", "the url to download a mapdb json file from", "https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json")
  .description("download a mapdb json file to your local tmp dir")
  .action(Tasks.download)

program.command("validate")
  .alias("v")
  .description("validate a mapdb in the local tmp dir")
  .action(Tasks.validate)

program.parse()