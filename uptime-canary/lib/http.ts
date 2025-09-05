export function jsonError(message: string, status: number = 500) {
  return Response.json(
    { error: message },
    { status }
  )
}
