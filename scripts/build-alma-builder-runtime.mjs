import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const outRoot = path.join(root, "dist", "builder-runtime");
const sourceRoots = ["lib", "workers"];

function walk(directory) {
  const entries = ts.sys.readDirectory(
    directory,
    [".ts"],
    undefined,
    undefined,
  );
  return entries.filter((file) => !file.endsWith(".d.ts"));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function outputPathFor(sourcePath) {
  const relative = path.relative(root, sourcePath).replace(/\.ts$/, ".js");
  return path.join(outRoot, relative);
}

function relativeImport(fromFile, targetWithoutExtension) {
  const fromDirectory = path.dirname(fromFile);
  let relative = toPosix(path.relative(fromDirectory, targetWithoutExtension));
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

function rewriteAliasRequires(input, outputFile) {
  return input
    .replace(/^require\(["']server-only["']\);\r?\n/m, "")
    .replace(/require\(["']@\/([^"']+)["']\)/g, (_match, aliasPath) => {
      const target = path.join(outRoot, `${aliasPath}.js`);
      return `require("${relativeImport(outputFile, target).replace(/\.js$/, "")}")`;
    });
}

function compileFile(sourcePath) {
  const source = readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      skipLibCheck: true,
      sourceMap: false,
    },
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length) {
    const message = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => root,
      getNewLine: () => "\n",
    });
    throw new Error(message);
  }
  const outputFile = outputPathFor(sourcePath);
  mkdirSync(path.dirname(outputFile), { recursive: true });
  writeFileSync(
    outputFile,
    rewriteAliasRequires(transpiled.outputText, outputFile),
  );
}

function assertNoAliasRequires() {
  const compiled = walk(outRoot);
  const offenders = compiled.filter((file) =>
    readFileSync(file, "utf8").includes('require("@/'),
  );
  if (offenders.length) {
    throw new Error(
      `Builder runtime contains unresolved aliases: ${offenders.join(", ")}`,
    );
  }
}

rmSync(outRoot, { force: true, recursive: true });
mkdirSync(outRoot, { recursive: true });

for (const sourceRoot of sourceRoots) {
  const absoluteRoot = path.join(root, sourceRoot);
  if (!existsSync(absoluteRoot)) {
    throw new Error(`Missing Builder runtime source root: ${sourceRoot}`);
  }
  for (const file of walk(absoluteRoot)) {
    compileFile(file);
  }
}

assertNoAliasRequires();

console.log(
  JSON.stringify({
    ok: true,
    code: "ALMA_BUILDER_RUNTIME_BUILD_READY",
    outDir: toPosix(path.relative(root, outRoot)),
  }),
);
