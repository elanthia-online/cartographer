import path from "path"

export class StringProc {
  static hasPrefix (source : string) {
    return source.startsWith(";e")
  }

  readonly ruby : string

  constructor (readonly source : string, readonly from : string, readonly to : string) {
    if (!StringProc.hasPrefix(source)) {
      throw new Error(`invalid StringProc\nsource=${source}`)
    }

    this.ruby = source.slice(source.indexOf(";e"))
  }

  location () {
    return path.join(this.from, this.to, "proc.rb")
  }
}