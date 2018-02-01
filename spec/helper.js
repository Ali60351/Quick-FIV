var path = require('path');

module.exports = {
  appPath: function() {
    switch (process.platform) {
      case 'darwin':
        return path.join(__dirname, '..', '.tmp', 'mac', 'QuickFIV.app', 'Contents', 'MacOS', 'QuickFIV');
      case 'linux':
        return path.join(__dirname, '..', '.tmp', 'linux', 'QuickFIV');
      default:
        throw 'Unsupported platform';
    }
  }
};
