import stringify from "safe-stable-stringify"
import crypto from "crypto"
import { RoomValidator } from "../validators/room"

export class Room {
  static validate (data : unknown) {
    const validated = RoomValidator.parse(data)
    return new Room(validated)
  }

  readonly checksum: string;
  constructor (readonly validated : ReturnType<typeof RoomValidator.parse>) {
    this.checksum = crypto.createHash("md5").update(stringify(this.validated)).digest("hex")
  }

  toJSON () {
    this.validated.wayto
  }
}