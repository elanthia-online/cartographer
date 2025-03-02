import {Project} from "../project"

type DownloadConfig = {
  project : Project
}

export async function download (config : DownloadConfig) {
  const db = await fetch(config.project.remoteMap)
  if (!db.ok) {
    throw new Error(`error fetching > status=${db.statusText} ${config.project.remoteMap}`)
  }
  const bytes = await config.project.write("map.json", await db.text())
  const mb = (bytes / Math.pow(2, 20)).toFixed(2)
  return {url: config.project.remoteMap, mb}
}