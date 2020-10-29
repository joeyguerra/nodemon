/*global describe, it, beforeEach */

var nodemon = require('../../lib/');
var path = require('path');
var dir = path.resolve(__dirname, '..', 'fixtures', 'events');
var appjs = path.resolve(dir, 'env.js');

describe('listeners clean up', function () {
  function conf() {
    return {
      script: appjs,
      verbose: true,
      stdout: false,
      noReset: true,
      ext: 'js',
      env: {
        PORT: 0,
        USER: 'nodemon',
      },
    };
  }

  beforeEach(function (done) {
    nodemon.reset(done);
  });

  it('should be able to re-run in required mode, many times, and not leak' +
    'listeners', async (done) => {

      var toRun = '01234567890123456789'.split('').map(n => {
        return async function (done) {
          nodemon(conf());
          nodemon.on('start', function () {
            nodemon.on('exit', function () {
              nodemon.reset(done);
            });
          });
        };
      });
      toRun.push(async function () {
        done();
      });
      for await (let f of toRun){
        f();
      }
    });
});
