/* jshint esversion: 6 */

var app = require('electron').remote;
var fs = require('fs');
var path = require('path');
// var sqlite3 = require('sqlite3').verbose();

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

            console.log(dir);

            this.selectedDir = dir[0];

            var files = fs.readdirSync(dir[0]);

            for (var i = 0; i < files.length; i++) {
                //console.log(files[i]);
                //console.log(fs.lstatSync(files[i]).isDirectory());
                var location = path.resolve(dir[0], files[i]);

                if (fs.lstatSync(location).isFile()) {
                    this.queue.push({
                        name: files[i],
                        status: 'Pending'
                    });
                }
            }
        }
    }
});