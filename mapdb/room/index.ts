import type { RoomSchema } from "../schema/room"

export class Room {
  constructor (readonly validated : ReturnType<typeof RoomSchema.parse>) {

  }
}