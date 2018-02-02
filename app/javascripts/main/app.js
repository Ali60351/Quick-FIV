/* jshint esversion: 6 */

var eApp = require('electron').remote;
var fs = require('fs');
var path = require('path');
var hashFiles = require('hash-files');
var jsonfile = require('jsonfile');
var file = require('file');
var swal = require('sweetalert');

const {
    dialog
} = require('electron').remote;

var app = new Vue({
    el: '#app',
    data: {
        queue: [],
        selectedDir: 'Select Directory',
        mode: ''
    },
    methods: {
        selectDir: function () {

            var SelectFolder;

            var dir = dialog.showOpenDialog({
                title: "Select a folder",
                properties: ["openDirectory"]
            });

            if (this.selectedDir[0] == null) {
                return;
            }

            this.selectedDir = dir[0];

            if (fs.existsSync(path.resolve(app.selectedDir, 'QuickFIV.json'))) {
                mode = 'Verify';
                swal('QuickFIV hash exists. Starting verification. Please Wait.', {
                    button: false
                });
            } else {
                mode = 'Generate';
                swal('QuickFIV hash does not exists. Starting hash Generation. Please Wait', {
                    button: false
                });
            }

            var files = getFiles(this.selectedDir);

            for (var i = 0; i < files.length; i++) {
                this.queue.push({
                    name: files[i].split(this.selectedDir)[1],
                    status: 'pending',
                    path: files[i],
                    md5: '',
                    sha1: '',
                    sha256: '',
                    sha512: ''
                });
            }

            setTimeout(function () {
                var hashArr = getHashes(app.queue);

                if (mode == 'Generate') {
                    saveJSON(hashArr, path.resolve(app.selectedDir, 'QuickFIV.json'));
                } else {
                    var verifyArr = readJSON(path.resolve(app.selectedDir, 'QuickFIV.json'));
                    verifyHashes(verifyArr);
                }
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

            if (fs.lstatSync(location).isFile() && files[j] != 'QuickFIV.json') {
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
        queue[i].md5 = md5;
        queue[i].sha1 = sha1;
        queue[i].sha256 = sha256;
        queue[i].sha512 = sha512;
    }

    return hashes;
}

function saveJSON(hashArr, location) {
    fs.writeFileSync(location);
    jsonfile.writeFileSync(location, hashArr, {
        spaces: 2
    });
}

function readJSON(location) {
    var arr = jsonfile.readFileSync(location);
    return arr;
}

function verifyHashes(arr) {
    var perfectFlag = true;

    for (var i = 0; i < app.queue.length; i++) {
        var index = -1;

        for (var j = 0; j < arr.length && index == -1; j++) {
            if (app.queue[i].name == arr[j].file) {
                index = j;
            }
        }

        if (index == -1) {
            app.queue[i].status = 'Error';
            perfectFlag = false;
        } else {
            var integrityFlag = true;

            if (app.queue[i].md5 != arr[index].md5) {
                integrityFlag = false;
            }

            if (app.queue[i].sha1 != arr[index].sha1) {
                integrityFlag = false;
            }

            if (app.queue[i].sha256 != arr[index].sha256) {
                integrityFlag = false;
            }

            if (app.queue[i].sha512 != arr[index].sha512) {
                integrityFlag = false;
            }

            if (integrityFlag) {
                app.queue[i].status = 'OK';
            } else {
                app.queue[i].status = 'Corrupted';
                perfectFlag = false;
            }
        }
    }

    swal.close();

    if (perfectFlag) {
        swal({
            text: 'All files OK!',
            button: false,
            icon: 'success'
        });
    } else {
        swal({
            text: 'Issue(s) detected!',
            button: false,
            icon: 'warning'
        });
    }
}