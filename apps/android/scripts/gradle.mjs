import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const androidProject = path.resolve(scriptDirectory, "..", "android");
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const tasks = process.argv.slice(2);
if (!tasks.length) throw new Error("At least one Gradle task is required");

const command = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : gradle;
const commandArguments = process.platform === "win32" ? ["/d", "/s", "/c", gradle, ...tasks] : tasks;
const child = spawn(command, commandArguments, { cwd: androidProject, stdio: "inherit", shell: false });
child.once("error", error => { throw error; });
child.once("exit", code => { process.exitCode = code ?? 1; });
