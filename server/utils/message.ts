export function formatMessage(messageType, params?: any) {
  const outgoing = {
    type: messageType,
    body: params
  };

  console.log("Server sent", outgoing)
  return JSON.stringify(outgoing)
}