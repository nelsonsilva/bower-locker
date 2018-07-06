#!/usr/bin/env node
'use strict';

var fs = require('fs');
var bowerInfo = require('./bower-locker-common.js');
var jsonFormat = require('json-format');
/* using indent with spaces */
var formatConfig = {
    type: 'space',
    size: 2
};

/**
 * Function to lock `bower.json` with the components that currently exist within the `bower_components` directory
 * This is accomplished by:
 *   * Saving a copy of `bower.json` as `bower-locker.unlocked.json`
 *   * Getting a list of ALL flattened dependencies, current versions and commit ids within the `bower_components`
 *   * Load the `bower.json` into memory as a JS object for manipulation
 *   * Override the `dependencies` and `resolutions` blocks with values specific to the current versions
 *   * Save the updated (i.e., locked) `bower.json`
 * @param {Boolean} isVerbose Flag to indicate whether we should log verbosely or not
 */
function lock(isVerbose) {
    if (isVerbose) {
        console.log('Start locking ...');
    }

    // Load bower.json and make sure it is a locked bower.json file
    var bowerConfigStr = fs.readFileSync('bower.json', {encoding: 'utf8'});
    var bowerConfig = JSON.parse(bowerConfigStr);
    if (bowerConfig.bowerLocker) {
        console.warn('The bower.json is already a bower-locker generated file.\n' +
        "Please run 'bower-locker unlock' before re-running 'bower-locker lock'");
        process.exit(1);
    }

    // Load all dependencies from the bower_components folder
    var dependencies = bowerInfo.getAllDependencies();

    // Create new bower config from existing
    bowerConfig.bowerLocker = {lastUpdated: (new Date()).toISOString()};
    bowerConfig.dependencies = {};
    // Remove devDependency section to prevent version collision
    delete bowerConfig.devDependencies;

    dependencies.forEach(function(dep) {
        // NOTE: Use dirName as the dependency name as it is more accurate than .bower.json properties
        var name = dep.dirName;
        var version = dep.type === 'branch' ? dep.branch : dep.release;
        bowerConfig.dependencies[name] = dep.src + (version ? '#' + version: ""); // _source
        if(!bowerConfig.resolutions[name]) {
            bowerConfig.resolutions[name] = version ? version : "*";
        } else if (bowerConfig.resolutions[name] !== "*") {
            bowerConfig.resolutions[name] = version
        }
        if (isVerbose) {
            console.log('  %s (%s): %s', name, dep.release, dep.commit);
        }
    });
    // Create copy of original bower.json
    fs.writeFileSync('bower-locker.bower.json', bowerConfigStr, {encoding: 'utf8'});
    // Replace bower.json with 'locked' version
    fs.writeFileSync('bower.json', jsonFormat(bowerConfig, formatConfig), {encoding: 'utf8'});

    console.log('Locking completed.');
}

module.exports = lock;
