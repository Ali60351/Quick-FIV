/* jshint esversion: 6 */

var eApp = require('electron').remote;
var fs = require('fs');
var path = require('path');
var hashFiles = require('hash-files');
var jsonfile = require('jsonfile');
var file = require('file');

const {
    dialog
} = require('electron').remote;

var app = new Vue({
    el: '#app',
    data: {
        queue: [],
        selectedDir: 'Select Directory'
    },
    methods: {
        selectDir: function () {

            var SelectFolder;

            var dir = dialog.showOpenDialog({
                title: "Select a folder",
                properties: ["openDirectory"]
            });

            this.selectedDir = dir[0];

            var files = getFiles(this.selectedDir);

            for (var i = 0; i < files.length; i++) {
                this.queue.push({
                    name: files[i].split(this.selectedDir)[1],
                    status: 'pending',
                    path: files[i]
                });
            }

            setTimeout(function () {
                var hashArr = getHashes(app.queue);
                saveJSON(hashArr, path.resolve(app.selectedDir, 'QuickFIV.json'));
            }, 100);
        }
    }
});

function getFiles(selection) {
    var directories = [];
    var filepaths = [];
    var call;

    file.walkSync(selection, (callback) => {
        directories.push(callback);
    });

    for (var i = 0; i < directories.length; i++) {
        var files = fs.readdirSync(directories[i]);

        for (var j = 0; j < files.length; j++) {
            var location = path.resolve(directories[i], files[j]);

            if (fs.lstatSync(location).isFile()) {
                filepaths.push(location);
            }
        }
    }

    return filepaths;
}

function getHashes(queue) {
    var hashes = [];

    for (var i = 0; i < queue.length; i++) {
        console.log(queue[i].path);
        var md5 = hashFiles.sync({
            files: [queue[i].path],
            algorithm: 'md5',
            noGlob: true
        });
        console.log(md5);
        var sha1 = hashFiles.sync({
            files: [queue[i].path],
            algorithm: 'sha1',
            noGlob: true
        });
        console.log(sha1);
        var sha256 = hashFiles.sync({
            files: [queue[i].path],
            algorithm: 'sha256',
            noGlob: true
        });
        console.log(sha256);
        var sha512 = hashFiles.sync({
            files: [queue[i].path],
            algorithm: 'sha512',
            noGlob: true
        });
        console.log(sha512);

        hashes.push({
            file: queue[i].name,
            md5: md5,
            sha1: sha1,
            sha256: sha256,
            sha512: sha512
        });

        queue[i].status = 'done';
    }

    return hashes;
}

function saveJSON(hashArr, location) {
    fs.writeFileSync(location);
    jsonfile.writeFileSync(location, hashArr, { spaces: 2 });
}

// var arr = getFiles('D:\\Music\\C91\\Ambient\\Moon-Tone - Downtime Sessions - Toho Ambient');
// var arr2 = getHashes(arr);
// console.log(arr2);

// var file = 'data.json';
// fs.writeFileSync(file);
// jsonfile.writeFileSync(file, arr2, {spaces: 2});