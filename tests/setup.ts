// Node 20 não tem WebSocket nativo — stub para o RealtimeClient do Supabase
// (os testes não ligam a nada real).
// @ts-expect-error stub
globalThis.WebSocket = class {
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
};
