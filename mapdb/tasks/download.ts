import ora from "ora"
import * as Project from "../project"
const DEFAULT_MAPDB_URL = "https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json"

type DownloadOpts = {
  url? : string;
}

export async function download (opts? : DownloadOpts) {
  const url = (opts || {}).url || DEFAULT_MAPDB_URL
  const spinner = ora()
  spinner.start(`downloading ${url}...`)
  try {
    await Project.setup()
    const db = await fetch(url)
    if (!db.ok) {
      throw new Error(`error fetching > status=${db.statusText} ${url}`)
    }
    const {location, write, stats} = await Project.write("mapdb.json", await db.text())
    const mb = (stats.size / Math.pow(2, 20)).toFixed(2)
    spinner.succeed(`mapdb of ${mb}mb successfully downloaded to ${location}`)
  } catch (err : any) {
    spinner.fail(err.message)
  }
}