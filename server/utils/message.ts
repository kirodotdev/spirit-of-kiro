export function formatMessage(messageType, params?: any) {
  const outgoing = {
    type: messageType,
    body: params
  };
  const body = JSON.stringify(outgoing);

  if (messageType != 'pong') { 
    console.log(`< ${messageType} - ${body.length}`);
  }
  return body;
}