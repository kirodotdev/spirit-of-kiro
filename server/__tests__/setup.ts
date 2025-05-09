import { serve } from "bun";
import { beforeAll, afterAll } from "bun:test";
import * as ServerSettings from '../server.js';
import { setupDatabase } from './util';

let Server: ReturnType<typeof serve>;

beforeAll(async () => {
  await setupDatabase();
  Server = serve(ServerSettings.default);
});

afterAll(() => {
  Server.stop();
});
