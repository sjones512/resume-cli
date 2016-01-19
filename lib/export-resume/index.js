var themeServer = process.env.THEME_SERVER || 'http://themes.jsonresume.org/theme/';
var registryServer = process.env.REGISTRY_SERVER || 'http://registry.jsonresume.org';
var request = require('superagent');
var http = require('http');
var fs = require('fs');
var path = require('path');
var read = require('read');
var spinner = require("char-spinner");
var menu = require('./menu');
var chalk = require('chalk');

var SUPPORTED_FILE_FORMATS = ["html", "pdf"];

module.exports = function exportResume(resumeJson, fileName, program, callback) {
  var theme = program.theme;

  var theme_path
  var local = false
  try{
    if(path.isAbsolute(theme)){
      theme_path = theme
    }else{
      theme_path = path.resolve(process.cwd(), theme)
    }
    require.resolve(theme_path)
    theme = theme_path
    local = true
  }catch(e){
    console.log(e);
    local = false;
  }

  console.log("Local: " + local)

  local = local || program.local

  if (!fileName) {
    read({
      prompt: "Provide a file name: ",
      default: 'resume'
    }, function(er, fileName) {
      if (er) return console.log();
      var fileName = fileName;
      fileNameAndFormat = getFileNameAndFormat(fileName, program.format);
      var fileFormatToUse = fileNameAndFormat.fileFormatToUse;
      fileName = fileNameAndFormat.fileName;

      menu.extension(fileFormatToUse, function(format) {
        if (format === '.html') {
          if(!local){
            sendExportRequest(resumeJson, fileName, theme, format, function() {
              callback(null, fileName, format);
            });
          }else {
            exportlocal(resumeJson, fileName, theme, format, function(){
              callback(null, fileName, format);
            });
          }
        } else if (format === '.pdf') {
          if(!local){
            sendExportPDFRequest(resumeJson, fileName, theme, format, function() {
              callback(null, fileName, format);
            });
          }else{
            console.log("Not implemented");
          }
        }
      });
    });
  } else {
    var fileNameAndFormat = getFileNameAndFormat(fileName, program.format);
    fileName = fileNameAndFormat.fileName;
    var fileFormatToUse = fileNameAndFormat.fileFormatToUse;

    menu.extension(fileFormatToUse, function(format) {
      if (format === '.html') {
        if(!local){
          sendExportRequest(resumeJson, fileName, theme, format, function() {
            callback(null, fileName, format);
          });
        }else{
          exportlocal(resumeJson, fileName, theme, format, function(){
            callback(null, fileName, format);
          });
        }
      } else if (format === '.pdf') {
        if(!local){
          sendExportPDFRequest(resumeJson, fileName, theme, format, function() {
            callback(null, fileName, format);
          });
        }else{
          console.log("Not Implemented")
        }
      }
    });
  }
}

function extractFileFormat(fileName) {
  var dotPos = fileName.lastIndexOf('.');
  if (dotPos === -1) {
    return null;
  }
  return fileName.substring(dotPos + 1).toLowerCase();
}

function sendExportRequest(resumeJson, fileName, theme, format, callback) {
  spinner();
  request
    .post(themeServer + theme)
    .send({
      resume: resumeJson
    })
    .set('Accept', 'application/json')
    .end(function(err, response) {
      if (!response) {
        console.log(chalk.red('Unable to extablish connection to the theme server.'));
        console.log('Check your network connection');
        process.exit();
      }

      fs.writeFileSync(path.resolve(process.cwd(), fileName + format), response.text);
      callback();
    });
  return;
}

function exportlocal(resumeJson, fileName, theme, format, callback){
  spinner();

  console.log("Applying theme: " + theme)
  var tmp_theme = require(theme)
  fs.writeFileSync(path.resolve(process.cwd(), fileName + format), tmp_theme.render(resumeJson))
  callback()

}

function sendExportPDFRequest(resumeJson, fileName, theme, format, callback) {
  spinner();
  var stream = fs.createWriteStream(path.resolve(process.cwd(), fileName + format));
  var req = request
    .get(registryServer + '/pdf')
    .send({
      resume: resumeJson,
      theme: theme
    })
    .set('Accept', 'application/json');

  req.pipe(stream);
  stream.on('finish', function() {
    stream.close(callback);
  });
  return;
}

function getFileNameAndFormat(fileName, format) {
  var fileFormatFound = extractFileFormat(fileName);
  var fileFormatToUse = format;
  if (format && fileFormatFound && format === fileFormatFound) {
    fileName = fileName.substring(0, fileName.lastIndexOf('.'));
  } else if (fileFormatFound) {
    fileFormatToUse = fileFormatFound;
    fileName = fileName.substring(0, fileName.lastIndexOf('.'));
  }
  if (SUPPORTED_FILE_FORMATS.indexOf(fileFormatToUse) === -1) {
    fileFormatToUse = null;
  }
  return {
    fileName: fileName,
    fileFormatToUse: fileFormatToUse
  };
}
