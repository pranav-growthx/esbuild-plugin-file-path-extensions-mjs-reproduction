import * as esbuild from "esbuild";
import { glob } from "glob";
// import { esbuildPluginFilePathExtensions } from './test.mjs';
import { esbuildPluginFilePathExtensions } from "esbuild-plugin-file-path-extensions";
async function buildCJS() {
  console.log("Generating CommonJS build for node");
  const files = await glob("src/**/*{.ts,.tsx}", {
    ignore: ["node_modules/**", "lib/**/*.test.ts"],
  });
  return esbuild.build({
    entryPoints: files,
    bundle: false,
    platform: "node",
    outdir: "dist/cjs",
    format: "cjs",
  });
}

async function buildESM() {
  console.log("Generating ESM build");
  const files = await glob("src/**/*{.ts,.tsx}", {
    ignore: ["node_modules/**", "lib/**/*.test.ts"],
  });
  return esbuild.build({
    entryPoints: files,
    // bundle: false,
    // external: ['node_modules/*', '@emoji-mart/data'],
    // plugins: [],
    // mainFields: ['main', 'module'],
    platform: "node",
    outdir: "dist/esm",
    outExtension: { ".js": ".mjs" },
    format: "esm",
    bundle: true,
    plugins: [esbuildPluginFilePathExtensions()],
  });
}

await buildCJS();
await buildESM();
