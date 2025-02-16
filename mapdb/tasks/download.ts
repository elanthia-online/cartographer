import ora from "ora"
import * as Project from "../project"

export const KnownMaps = {
  GS: "https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json",
  DR: "https://raw.githubusercontent.com/FarFigNewGut/lich_repo_mirror/refs/heads/main/dr_map/dr_map.json",
}


type DownloadOpts = {
  url : string;
  to  : string,
}

export async function download (opts : DownloadOpts) {
  await Project.setup()
  const db = await fetch(opts.url)
  if (!db.ok) {
    throw new Error(`error fetching > status=${db.statusText} ${opts.url}`)
  }
  const {location, write, stats} = await Project.write(opts.to, await db.text())
  const mb = (stats.size / Math.pow(2, 20)).toFixed(2)
  return {url: opts.url, mb, location}
}