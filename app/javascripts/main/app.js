/* jshint esversion: 6 */

var eApp = require('electron').remote;
var fs = require('fs');
var path = require('path');
var hashFiles = require('hash-files');
var jsonfile = require('jsonfile');
var file = require('file');
var upath = require('upath');
var NodeRSA = require('node-rsa');
var validator = require('is-my-json-valid');

const {
  dialog
} = require('electron').remote;

var app = new Vue({
  el: '#app',
  data: {
    clipped: true,
    drawer: true,
    miniVariant: true,
    title: 'Quick FIV',
    route: 'Home',
    successMessage: '',
    successFlag: false,
    errorMessage: '',
    errorFlag: false,
    infoMessage: '',
    infoFlag: false,
    modeOfOperation: 'Unsecure',
    items: [{
        icon: 'home',
        title: 'Home',
      },
      {
        icon: 'settings',
        title: 'Settings',
      }
    ],
    search: '',
    headers: [{
        text: 'Filename',
        value: 'name'
      },
      {
        text: 'Status',
        value: 'status'
      }
    ],
    queue: [],
    selectedDir: 'Select Directory',
    mode: '',
    checkedHashes: 'sha1',
    algorithms: {
      md5: false,
      sha1: false,
      sha256: false,
      sha512: false
    }
  },
  methods: {
    selectDir: function() {

      var SelectFolder;

      this.infoFlag = false;
      this.errorFlag = false;
      this.successFlag = false;

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

      var files = getFiles(this.selectedDir);

      if (files.length == 0) {
        alert('This directory does not contains any files');
        return;
      }

      if (fs.existsSync(path.resolve(app.selectedDir, 'QuickFIV.json'))) {
        mode = 'Verify';
        this.infoFlag = true;
        this.infoMessage = 'QuickFIV hash exists. Starting verification. Please Wait.';
      } else {
        mode = 'Generate';
        this.infoFlag = true;
        this.infoMessage = 'QuickFIV hash does not exists. Starting hash Generation. Please Wait';
      }

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

      var hashArr = [];

      if (mode == 'Generate') {
        if (this.modeOfOperation === 'Unsecure') {
          hashArr = getHashes(app.queue);
          saveJSON(hashArr, path.resolve(app.selectedDir, 'QuickFIV.json'));
        } else if (this.modeOfOperation === 'twoPublic') {
          var keyExists = confirm('I you have a key pair already press OK. Press Cancel to generate a new key pair');
          var private = '';
          var public = '';

          if (keyExists) {
            var privatePath = dialog.showOpenDialog({
              title: "Select Your Private Key",
              properties: ["openFile"]
            });

            var publicPath = dialog.showOpenDialog({
              title: "Select Reciever's Public Key",
              properties: ["openFile"]
            });

            hashArr = getHashes(app.queue);
            encryptHash(hashArr, privatePath[0], publicPath[0]);
          } else {
            var privateFile = dialog.showSaveDialog({
              title: "Save Your Private Key",
              defaultPath: path.resolve('..', 'Private.qfv')
            });

            var publicFile = dialog.showSaveDialog({
              title: "Save Your Public Key",
              defaultPath: path.resolve('..', 'Public.qfv')
            });

            var publicFileE = dialog.showOpenDialog({
              title: "Select Reciever's Public Key",
              properties: ["openFile"]
            });

            generateKey(privateFile, publicFile);

            hashArr = getHashes(app.queue);
            encryptHash(hashArr, privateFile, publicFileE[0]);
          }
        }

        app.infoFlag = false;
        app.successFlag = true;
        app.successMessage = 'QuickFIV file created!';
      } else {
        var raw = fs.readFileSync(path.resolve(app.selectedDir, 'QuickFIV.json'));

        if (isValidJSON(raw)) {
          var verifyArr = readJSON(path.resolve(app.selectedDir, 'QuickFIV.json'));
          getAlgorithms(verifyArr);
          hashArr = getHashes(app.queue);
          verifyHashes(verifyArr);
        } else {
          var decryptFlag = confirm('Hashes are either corrupted or encrypted. Continue to decrypt?');

          if (decryptFlag) {
            var privatePathD = dialog.showOpenDialog({
              title: "Select Your Private Key",
              properties: ["openFile"]
            });

            var publicPathD = dialog.showOpenDialog({
              title: "Select Sender's Public Key",
              properties: ["openFile"]
            });

            var verifyArrD = decryptHash(path.resolve(app.selectedDir, 'QuickFIV.json'), privatePathD[0], publicPathD[0]);
            getAlgorithms(verifyArrD);
            hashArr = getHashes(app.queue);
            verifyHashes(verifyArrD);
          } else {
            return;
          }
        }
      }
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
    // console.log(queue[i].path);

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
      if (upath.normalize(app.queue[i].name) == upath.normalize(arr[j].file)) {
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

  if (perfectFlag) {
    app.infoFlag = false;
    app.successFlag = true;
    app.successMessage = "All files OK!";
  } else {
    app.infoFlag = false;
    app.errorFlag = true;
    app.errorMessage = 'Issue(s) detected!';
  }
}

function setAlgorithms() {
  if (app.checkedHashes == 'md5') {
    app.algorithms.md5 = true;
  }

  if (app.checkedHashes == 'sha1') {
    app.algorithms.sha1 = true;
  }

  if (app.checkedHashes == 'sha256') {
    app.algorithms.sha256 = true;
  }

  if (app.checkedHashes == 'sha512') {
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

function encryptHash(hashArr, privatePath, publicPath) {
  var public = fs.readFileSync(publicPath);
  var private = fs.readFileSync(privatePath);

  var privateKey = new NodeRSA();
  var publicKey = new NodeRSA();

  privateKey.importKey(private, "private");
  publicKey.importKey(public, "public");

  var enc = privateKey.encryptPrivate(hashArr);
  enc = publicKey.encrypt(enc);

  fs.writeFileSync(path.resolve(app.selectedDir, 'QuickFIV.json'), enc);
}

function decryptHash(hashPath, privatePath, publicPath) {
  var public = fs.readFileSync(publicPath);
  var private = fs.readFileSync(privatePath);

  var privateKey = new NodeRSA();
  var publicKey = new NodeRSA();

  privateKey.importKey(private, "private");
  publicKey.importKey(public, "public");

  var data = fs.readFileSync(hashPath);

  var dec = privateKey.decrypt(data);
  dec = publicKey.decryptPublic(dec, 'json');

  return dec;
}

function isValidJSON(data) {

  var arr;

  try {
    arr = JSON.parse(data);
  } catch (err) {
    return false;
  }

  var schema = {
    required: true,
    type: 'object',
    properties: {
      file: {
        required: true,
        type: 'string'
      },
      md5: {
        required: true,
        type: 'string'
      },
      sha1: {
        required: true,
        type: 'string'
      },
      sha256: {
        required: true,
        type: 'string'
      },
      sha512: {
        required: true,
        type: 'string'
      }
    }
  };

  var validate = validator(schema, {
    verbose: true
  });

  for (var i = 0; i < arr.length; i++) {
    if (!(validate(arr[i]))) {
      return false;
    }
  }

  return true;
}

function generateKey(privatePath, publicPath) {
  var key = new NodeRSA({
    b: 512
  });

  var public = key.exportKey("public");
  var private = key.exportKey("private");

  fs.writeFileSync(publicPath, public);
  fs.writeFileSync(privatePath, private);
}
