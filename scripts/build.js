#! /usr/bin/env node
const { spawn } = require("child_process");
const { lernaScopes } = require("./github.js");

const buildProcess = spawn("lerna", ["run", "build", "--scope", "basic", "--include-dependencies", ...lernaScopes], {
  stdio: "inherit",
});

buildProcess.on("close", (code) => {
  process.exit(code);
});
