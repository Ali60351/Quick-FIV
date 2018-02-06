/* jshint esversion: 6 */

var eApp = require('electron').remote;
var fs = require('fs');
var path = require('path');
var hashFiles = require('hash-files');
var jsonfile = require('jsonfile');
var file = require('file');
var swal = require('sweetalert2');

const {
    dialog
} = require('electron').remote;

var app = new Vue({
    el: '#app',
    data: {
        queue: [],
        selectedDir: 'Select Directory',
        mode: '',
        checkedHashes: ['sha1'],
        algorithms: {
            md5: false,
            sha1: false,
            sha256: false,
            sha512: false
        }
    },
    methods: {
        selectDir: function () {

            var SelectFolder;

            var dir = dialog.showOpenDialog({
                title: "Select a folder",
                properties: ["openDirectory"]
            });

            if (dir == null) {
                return;
            } else {
                this.queue = [];
            }

            this.selectedDir = dir[0];

            if (fs.existsSync(path.resolve(app.selectedDir, 'QuickFIV.json'))) {
                mode = 'Verify';
                swal({
                    showConfirmButton: false,
                    animation: false,
                    text: 'QuickFIV hash exists. Starting verification. Please Wait.',
                    customClass: 'swal2-modal-custom'
                });
            } else {
                mode = 'Generate';
                swal({
                    showConfirmButton: false,
                    animation: false,
                    text: 'QuickFIV hash does not exists. Starting hash Generation. Please Wait',
                    customClass: 'swal2-modal-custom'
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
                if (mode == 'Generate') {
                    setAlgorithms();
                    var hashArr = getHashes(app.queue);

                    saveJSON(hashArr, path.resolve(app.selectedDir, 'QuickFIV.json'));

                    swal.close();
                    swal({
                        showConfirmButton: false,
                        type: 'success',
                        footer: '<p style="color: #333">QuickFIV file created!</p>'
                    });
                } else {
                    var verifyArr = readJSON(path.resolve(app.selectedDir, 'QuickFIV.json'));

                    getAlgorithms(verifyArr);
                    var hashArr = getHashes(app.queue);
                    
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

        var md5 = '';
        var sha1 = '';
        var sha256 = '';
        var sha512 = '';

        if (app.algorithms.md5 == true) {
            md5 = hashFiles.sync({
                files: [queue[i].path],
                algorithm: 'md5',
                noGlob: true
            });
        }

        if (app.algorithms.sha1 == true) {
            sha1 = hashFiles.sync({
                files: [queue[i].path],
                algorithm: 'sha1',
                noGlob: true
            });
        }

        if (app.algorithms.sha256 == true) {
            sha256 = hashFiles.sync({
                files: [queue[i].path],
                algorithm: 'sha256',
                noGlob: true
            });
        }

        if (app.algorithms.sha512 == true) {
            sha512 = hashFiles.sync({
                files: [queue[i].path],
                algorithm: 'sha512',
                noGlob: true
            });
        }

        hashes.push({
            file: queue[i].name,
            md5: md5,
            sha1: sha1,
            sha256: sha256,
            sha512: sha512
        });

        queue[i].status = 'hashed';
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
                app.queue[i].status = 'Verified';
            } else {
                app.queue[i].status = 'Corrupted';
                perfectFlag = false;
            }
        }
    }

    swal.close();

    if (perfectFlag) {
        swal({
            showConfirmButton: false,
            type: 'success',
            footer: '<p style="color: #333">All files OK!</p>'
        });
    } else {
        swal({
            showConfirmButton: false,
            type: 'warning',
            footer: '<p style="color: #333">Issue(s) detected!</p>'
        });
    }
}

function setAlgorithms() {
    if (app.checkedHashes.indexOf('md5') > -1) {
        app.algorithms.md5 = true;
    }

    if (app.checkedHashes.indexOf('sha1') > -1) {
        app.algorithms.sha1 = true;
    }

    if (app.checkedHashes.indexOf('sha256') > -1) {
        app.algorithms.sha256 = true;
    }

    if (app.checkedHashes.indexOf('sha512') > -1) {
        app.algorithms.sha512 = true;
    }
}

function getAlgorithms(inputArr) {
    if (inputArr[0].md5 != '') {
        app.algorithms.md5 = true;
    }

    if (inputArr[0].sha1 != '') {
        app.algorithms.sha1 = true;
    }

    if (inputArr[0].sha256 != '') {
        app.algorithms.sha256 = true;
    }

    if (inputArr[0].sha512 != '') {
        app.algorithms.sha512 = true;
    }
}