import { stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
const require = createRequire(import.meta.url);
async function isDirectory(cwd, path) {
  return (
    stat(join(cwd, path))
      .then(result => result.isDirectory())
      // Catches the error for if path does not exist (code: ENOENT)
      .catch(() => false)
  );
}

// eslint-disable-next-line @typescript-eslint/ban-types
function isFunction(input) {
  return typeof input === 'function';
}

function getFilter(options) {
  if (!options.filter) {
    return /.*/;
  }

  if (Object.prototype.toString.call(options.filter) !== '[object RegExp]') {
    console.warn(
      `Plugin "esbuild-plugin-file-path-extensions": Options.filter must be a RegExp object, but gets an '${typeof options.filter}' type. \nThis request will match ANY file!`
    );
    return /.*/;
  }

  return options.filter ?? /.*/;
}

let builtins = null;

async function isBuiltin(path) {
  if (builtins === null) {
    builtins = (await import('node:module')).builtinModules;
  }

  return !path.startsWith('.') && (path.startsWith('node:') || builtins.includes(path));
}

async function getIsEsm(build, options) {
  if (typeof options.esm === 'undefined') {
    return build.initialOptions.define?.TSUP_FORMAT === '"esm"' || build.initialOptions.format === 'esm';
  }

  if (typeof options.esm === 'boolean') {
    return options.esm;
  }

  return isFunction(options.esm) ? options.esm(build.initialOptions) : options.esm;
}

async function getEsmExtension(build, options) {
  if (typeof options.esmExtension === 'undefined') {
    return 'mjs';
  }

  if (typeof options.esmExtension === 'string') {
    return options.esmExtension;
  }

  return isFunction(options.esmExtension) ? options.esmExtension(build.initialOptions) : options.esmExtension;
}

async function getCjsExtension(build, options) {
  if (typeof options.cjsExtension === 'undefined') {
    return 'cjs';
  }

  if (typeof options.cjsExtension === 'string') {
    return options.cjsExtension;
  }

  return isFunction(options.cjsExtension) ? options.cjsExtension(build.initialOptions) : options.cjsExtension;
}

function pathExtIsJsLikeExtension(path) {
  const ext = extname(path);

  if (
    // Regular extensions
    ext === '.js' ||
    ext === '.cjs' ||
    ext === '.mjs' ||
    // TypeScript extensions
    ext === '.ts' ||
    ext === '.cts' ||
    ext === '.mts' ||
    // JSX JavaScript extensions
    ext === 'jsx' ||
    ext === '.cjsx' ||
    ext === '.mjsx' ||
    // JSX TypeScript extensions
    ext === '.tsx' ||
    ext === '.ctsx' ||
    ext === '.mtsx' ||
    // CSS extensions
    ext === '.css'
  ) {
    return true;
  }

  return false;
}

async function handleResolve(args, build, options) {
  if (args.kind === 'import-statement') {
    const isEsm = await getIsEsm(build, options);
    const esmExtension = await getEsmExtension(build, options);
    const cjsExtension = await getCjsExtension(build, options);
    // console.log(args.path);
    // console.log(isEsm);
    if (typeof isEsm !== 'boolean') {
      throw new TypeError(`isEsm must be a boolean, received ${typeof isEsm} (${isEsm})`);
    }

    if (typeof cjsExtension !== 'string') {
      throw new TypeError(`cjsExtension must be a string, received ${typeof cjsExtension} (${cjsExtension})`);
    }

    if (typeof esmExtension !== 'string') {
      throw new TypeError(`esmExtension must be a string, received ${typeof esmExtension} (${esmExtension})`);
    }

    if (args.importer) {
      const pathAlreadyHasExt = pathExtIsJsLikeExtension(args.path);
      const pathIsBuiltin = build.initialOptions.platform === 'node' && (await isBuiltin(args.path));

      if (!pathAlreadyHasExt && !pathIsBuiltin) {
        let { path } = args;
        console.log(args.importer);
        console.log(path);
        console.log('resolve-------------------');
        try {
          require.resolve(path);
          return {
            path: path,
            external: true,
            namespace: options.namespace,
          };
        } catch (e) {}
        // If the import path refers to a directory it most likely actually refers to a
        // `index.*` file in said directory due to Node's module resolution
        if (await isDirectory(args.resolveDir, path)) {
          // This uses `/` instead of `path.join` here because `join` removes potential "./" prefixes
          path = `${path}/index`;
        }

        return {
          path: `${path}.${isEsm ? esmExtension : cjsExtension}`,
          external: true,
          namespace: options.namespace,
        };
      }
    }
  }

  return undefined;
}

export const esbuildPluginFilePathExtensions = (
  options = {
    filter: /.*/,
    cjsExtension: 'cjs',
    esmExtension: 'mjs',
  }
) => {
  const filter = getFilter(options);
  const { namespace } = options;

  return {
    name: 'esbuild-plugin-file-path-extensions',
    setup(build) {
      build.onResolve({ filter, namespace }, args => handleResolve(args, build, options));
    },
  };
};

/**
 * The [esbuild-plugin-file-path-extensions](https://github.com/favware/esbuild-plugin-file-path-extensions/#readme) version
 * that you are currently using.
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const version = '[VI]{{inject}}[/VI]';
