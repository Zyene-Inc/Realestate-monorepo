const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const sdkPath = resolve(
  __dirname,
  '../node_modules/@verdocs/js-sdk/dist/index.js',
);
const unsupportedCall = 'axiosRetry(this.api, { retries: 0 });';
const compatibleCall =
  '(axiosRetry.default ?? axiosRetry)(this.api, { retries: 0 });';
const source = readFileSync(sdkPath, 'utf8');

if (source.includes(compatibleCall)) {
  console.log('VERDOCS_SDK_COMPATIBILITY_PATCH_ALREADY_APPLIED');
} else if (source.includes(unsupportedCall)) {
  writeFileSync(sdkPath, source.replace(unsupportedCall, compatibleCall));
  console.log('VERDOCS_SDK_COMPATIBILITY_PATCH_APPLIED');
} else {
  throw new Error(
    'Unsupported @verdocs/js-sdk build: retry compatibility patch target was not found.',
  );
}
