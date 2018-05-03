/**
 * BPM for Discord Installer
 * (c) 2015-2016 ByzantineFailure
 *
 * Code to resolve the correct install paths
 **/
"use strict";
var fs = require('fs-extra'),
    path = require('path'),
    _ = require('lodash'),
    OS = process.platform;

module.exports = {
    getPaths: getPaths,
};

function getPaths(sourceRoot, isPTB) {
    var discordPath = getDiscordPath(isPTB);
    return {
        discordExtract: path.join(discordPath, 'bpm_extract'),
        discordPack: path.join(discordPath, 'app.asar'),
        discordBackup: path.join(discordPath, 'app.asar.clean'),
        integrationSource: path.join(sourceRoot, 'integration.asar'),
        addonSource: path.join(sourceRoot, 'bpm.asar'),
        addonExtract: path.join(getAddonExtractPath(), 'bpm')
    };
}

function getAddonExtractPath() {
    switch(OS) {
        case 'win32':
            return path.join(process.env.APPDATA, 'discord');
        case 'darwin':
            return path.join(process.env.HOME, '/Library/Preferences/discord');
        default:
            throw new Error('Unsupported OS ' + OS);
    }
}

function getDiscordPath(isPTB) {
    switch(OS) {
        case 'win32':
            var localDataFolder = isPTB ? 'DiscordPTB' : 'Discord',
                discordFolder = path.join(process.env.LOCALAPPDATA, localDataFolder),
                contents = fs.readdirSync(discordFolder);
            //Consider this carefully, we may want to fail on a new version
            var folder = _(contents)
                .filter(file => file.indexOf('app-') > -1)
                //Sort by version number, multiple app version folders can exist
                .map(dir => {
                    var version = dir.split('-')[1];
                    var splitVersion = version.split('.');
                    return {
                        name: dir,
                        major: parseInt(splitVersion[0]),
                        minor: parseInt(splitVersion[1]),
                        bugfix: parseInt(splitVersion[2])
                    };
                })
                .sortBy(["major", "minor", "bugfix"])
                .last()
                .name;
            return path.join(discordFolder, folder, 'resources'); 
        case 'darwin':
            return '/Applications/Discord.app/Contents/Resources';
        default:
            throw new Error('Unsupported OS ' + OS);
    }
}

