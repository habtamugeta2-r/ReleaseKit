import process from "node:process";
import { spawn } from "node:child_process";
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const appDirectory = process.cwd();
const standaloneDirectory = resolve(appDirectory, ".next/standalone/apps/web");
const standaloneNextDirectory = resolve(standaloneDirectory, ".next");

await mkdir(standaloneNextDirectory, { recursive: true });
await cp(
  resolve(appDirectory, ".next/static"),
  resolve(standaloneNextDirectory, "static"),
  { recursive: true },
);

const publicDirectory = resolve(appDirectory, "public");
if (existsSync(publicDirectory)) {
  await cp(publicDirectory, resolve(standaloneDirectory, "public"), {
    recursive: true,
  });
}

const server = spawn(
  process.execPath,
  [resolve(standaloneDirectory, "server.js")],
  {
    cwd: standaloneDirectory,
    env: process.env,
    stdio: "inherit",
  },
);
let startupFailed = false;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("error", (error) => {
  startupFailed = true;
  process.stderr.write(
    `Failed to start the standalone Next.js server.\n${error.stack ?? error.message}\n`,
  );
  process.exitCode = 1;
});

server.on("exit", (code, signal) => {
  process.exitCode = startupFailed ? 1 : (code ?? (signal ? 1 : 0));
});
