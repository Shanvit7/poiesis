import { SUPERMEMORY_API_KEY, SUPERMEMORY_BASE_URL } from "@/constants"
import Supermemory from "supermemory"

export const memoryClient = new Supermemory({
  apiKey: SUPERMEMORY_API_KEY,
  baseURL: SUPERMEMORY_BASE_URL,
})
