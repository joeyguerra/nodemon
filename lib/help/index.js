var fs = require('fs');
var path = require('path');
const os = require('os');

const hasFlag = (flag, argv = process.argv) => {
  const altPrefix = (flag.length === 1 ? '-' : '--');
  const prefix = flag.startsWith('-') ? '' : altPrefix;
  const pos = argv.indexOf(prefix + flag);
  const terminatorPos = argv.indexOf('--');
  return pos !== -1 && (terminatorPos === -1 ? true : pos < terminatorPos);
};

const supportsColor = (env = process.env)=>{
  let forceColor;
  if (hasFlag('no-color') ||
    hasFlag('no-colors') ||
    hasFlag('color=false')) {
    forceColor = false;
  } else if (hasFlag('color') ||
    hasFlag('colors') ||
    hasFlag('color=true') ||
    hasFlag('color=always')) {
    forceColor = true;
  }
  if ('FORCE_COLOR' in env) {
    forceColor = env.FORCE_COLOR.length === 0 || parseInt(env.FORCE_COLOR, 10) !== 0;
  }

  function translateLevel(level) {
    if (level === 0) {
      return false;
    }

    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }

  function levelOfColorStreamSupports(stream) {
    if (forceColor === false) {
      return 0;
    }

    if (hasFlag('color=16m') ||
      hasFlag('color=full') ||
      hasFlag('color=truecolor')) {
      return 3;
    }

    if (hasFlag('color=256')) {
      return 2;
    }

    if (stream && !stream.isTTY && forceColor !== true) {
      return 0;
    }

    const min = forceColor ? 1 : 0;

    if (process.platform === 'win32') {
      // Node.js 7.5.0 is the first version of Node.js to include a patch to
      // libuv that enables 256 color output on Windows. Anything earlier and it
      // won't work. However, here we target Node.js 8 at minimum as it is an LTS
      // release, and Node.js 7 is not. Windows 10 build 10586 is the first Windows
      // release that supports 256 colors. Windows 10 build 14931 is the first release
      // that supports 16m/TrueColor.
      const osRelease = os.release().split('.');
      if (
        Number(process.versions.node.split('.')[0]) >= 8 &&
        Number(osRelease[0]) >= 10 &&
        Number(osRelease[2]) >= 10586
      ) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }

      return 1;
    }

    if ('CI' in env) {
      if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI'].some(sign => sign in env) || env.CI_NAME === 'codeship') {
        return 1;
      }

      return min;
    }

    if ('TEAMCITY_VERSION' in env) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }

    if (env.COLORTERM === 'truecolor') {
      return 3;
    }

    if ('TERM_PROGRAM' in env) {
      const version = parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

      switch (env.TERM_PROGRAM) {
        case 'iTerm.app':
          return version >= 3 ? 3 : 2;
        case 'Apple_Terminal':
          return 2;
        // No default
      }
    }

    if (/-256(color)?$/i.test(env.TERM)) {
      return 2;
    }

    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
      return 1;
    }

    if ('COLORTERM' in env) {
      return 1;
    }

    if (env.TERM === 'dumb') {
      return min;
    }

    return min;
  }

  const getSupportLevel = stream => {
    const level = levelOfColorStreamSupports(stream);
    return translateLevel(level);
  };

  return {
    supportsColor: getSupportLevel,
    stdout: getSupportLevel(process.stdout),
    stderr: getSupportLevel(process.stderr)
  };

}
module.exports = help;

const highlight = supportsColor.stdout ? '\x1B[$1m' : '';

function help(item) {
  if (!item) {
    item = 'help';
  } else if (item === true) { // if used with -h or --help and no args
    item = 'help';
  }

  // cleanse the filename to only contain letters
  // aka: /\W/g but figured this was eaiser to read
  item = item.replace(/[^a-z]/gi, '');

  try {
    var dir = path.join(__dirname, '..', '..', 'doc', 'cli', item + '.txt');
    var body = fs.readFileSync(dir, 'utf8');
    return body.replace(/\\x1B\[(.)m/g, highlight);
  } catch (e) {
    return '"' + item + '" help can\'t be found';
  }
}
