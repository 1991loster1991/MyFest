export async function readApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  let result: unknown;

  try {
    result = JSON.parse(body);
  } catch {
    if (!response.ok) {
      throw new Error(`El servidor respondió con un error (HTTP ${response.status}). Intentá nuevamente más tarde.`);
    }
    throw new Error("El servidor devolvió una respuesta inválida. Intentá nuevamente.");
  }

  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
      ? result.error
      : `No se pudo completar la solicitud (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return result as T;
}
