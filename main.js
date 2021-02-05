// Modules to control application life and create native browser window
const electron = require('electron')
const {app, BrowserWindow, ipcMain } = electron
const path = require('path')
const md5File = require('md5-file')
const fs = require('fs')
const https = require('https');
const http = require('http');
var net = require('net');
const WebSocket = require('ws');
var spawn = require('child_process').spawn;
var hostile = require('hostile');


process.on("uncaughtException", (err) => {
   app.exit()
});

let exePath = path.dirname (app.getPath ('exe'));

var mainWindow
function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 500,
    height: 500,
    transparent: true,
    frame:false,
    webPreferences: {
      devTools: false,
      preload: path.join(__dirname, 'preload.js'),
      icon: __dirname + './UI/img/favicon.ico',
      nodeIntegration: true
    }
  })

  // allows the window to show over a fullscreen window
  mainWindow.setVisibleOnAllWorkspaces(true);

  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


// Web comunication

var confirmedBy

ipcMain.on('loader', (event, arg) => {

  const webSocketsServerPort = 3579;
  const webSocketServer = require('websocket').server;

  const http = require('http');
  // Spinning the http server and the websocket server.
  const server = http.createServer();
  server.listen(webSocketsServerPort);
  const wsServer = new webSocketServer({
    httpServer: server
  });

  var confirmed = false
  wsServer.on('request', function(request) {
    const connection = request.accept(null, request.origin);
    event.reply('website-confirm', request.origin)
    confirmedBy = request.origin
  });

})


function downloadFile(filePath, url) {

  var filePathWithoutFilename = path.dirname(filePath)

  // Create path if doesnt exists
  if (!fs.existsSync(filePathWithoutFilename)){
      fs.mkdirSync(filePathWithoutFilename, { recursive: true });
  }

  const file = fs.createWriteStream(filePath);

  if(url.toString().search("https") !== -1) {
    const request = https.get(url, function(response) {
      response.pipe(file);
    });
  } else {
    const request = http.get(url, function(response) {
      response.pipe(file);
    });
  }
}

ipcMain.on('version-config', (event, arg) => {
  var fileCount = arg.length
  event.reply('set-total-files', fileCount)

  for (var i = 0; i < arg.length; i++) {

    var currentPath = path.resolve('.') + "\\"

    // Check file exists
    if (!fs.existsSync(currentPath + arg[i].path)) {
        event.reply('file-downloading', arg[i].name)
        downloadFile(currentPath + arg[i].path, confirmedBy + "/" + arg[i].url)
    } else {
      // Check file checksum
      if(arg[i].checksum !== md5File.sync(currentPath + arg[0].path)) {
        event.reply('file-downloading', arg[i].name)
        downloadFile(currentPath + arg[i].path, confirmedBy + "/" + arg[i].url)
      }

    }
    event.reply('checksum-step', arg[i].name)
  }

  // All files checked and updated!
  event.reply('files-updated', true)
})

ipcMain.on('open-menu', (event, arg) => {
  const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
  mainWindow.setSize(width, Math.round(Number(Number(height)  / 100 * 10)))
  mainWindow.setPosition(0, 0)
  mainWindow.loadURL(`${confirmedBy}/Menu&Main.fvx`)
})

// Injector communication
ipcMain.on('injector', (event, arg) => {
  if(arg === false ) app.exit(0);

  fs.access(`${exePath}/devcon.dll`, fs.F_OK, (err) => {
    if (err) {
      event.reply("injector", JSON.stringify({
        status: "injector_not_found"
      }))
      event.reply("injector", `${exePath}/devcon.dll`)
      return
    }

    var child  = spawn(`${exePath}/devcon.dll`, ["0x72", "0x20", "0x75", "0x20", "0x72", "0x65", "0x74", "0x61", "0x72", "0x64", "0x3f"]);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(data) {
        event.reply("injector", data)
    });

    child.on('close', function(code) {
        event.reply('injector', JSON.stringify({
          status: 'unknow_error'
        }))
    });

  })
})


// Internal communication
var HOST = '127.0.0.1';
var PORT = 17643;
var keepsock
var socket = net.createServer(function(sock) {
    keepsock = sock
    console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);

    sock.write('###################################_mt');

    sock.on('data', function(data) {
      keepws.send(data)
    });

   sock.on('close', function(data) {
     app.exit(0);
   });
 })

socket.listen(PORT, HOST);

// Web communication

var remoteWindows = []

var keepws
const wss = new WebSocket.Server({ port: 48484 });

wss.on('connection', function connection(ws) {

  keepws = ws
  console.log("[LOG] ", "Connected web client!");

  ws.on('message', function incoming(message) {

    var data = JSON.parse(message)

    switch (data.command) {
      case 'open-page':

        console.log("[LOG] Creating window: ", data.window_key);

        var windowAlreadyCreated = false

        for (var i = 0; i < remoteWindows.length; i++) {
          if(remoteWindows[i].window_key === data.window_key) {
            windowAlreadyCreated = true
          }
        }

        if(!windowAlreadyCreated) {
          const win = new BrowserWindow({
            width: 500,
            height: 500,
            alwaysOnTop: true,
            transparent: true,
            frame:false,
            resizable: true,
            webPreferences: {
              devTools: false,
              preload: path.join(__dirname, 'preload.js'),
              icon: __dirname + './UI/img/favicon.ico',
              nodeIntegration: true
            }
          })

          win.setVisibleOnAllWorkspaces(true);

          win.setAlwaysOnTop(true, 'screen-saver');

          win.loadURL(`${confirmedBy}/${data.path}`)

          remoteWindows.push({window_key: data.window_key, window: win})
        } else {
          for (var i = 0; i < remoteWindows.length; i++) {
            if(remoteWindows[i].window_key === data.window_key) {
              remoteWindows[i].window.restore()
            }
          }
          console.log("[LOG] ", "Window couldnt create, it was already created.");
        }

        break;

        case 'close-window':
          var windowKey = data.window_key

          console.log("[LOG] Closing window: ",windowKey);

          if(windowKey === "main-menu") {
            mainWindow.close()
          } else {

            for (var i = 0; i < remoteWindows.length; i++) {

              if(remoteWindows[i].window_key === windowKey) {

                try {
                  //remoteWindows[i].window.close()
                  remoteWindows[i].window.minimize();
                  //remoteWindows.splice(i, 1);
                } catch {}

              }

            }
          }

        break;

        case 'internal':

          if(data.data.command === 'inject-lua') {
            var script = data.data.data.lua_script
            var filename = `${exePath}\\swiftshader\\${makeid(15)}`

            fs.writeFile(filename, script, function (err) {
              if (!err){
                data.data.data.lua_script = filename
                message = JSON.stringify(data)
                keepsock.write(message)
              }
            });
          } else if(data.data.command === 'inject-js') {
            var script = data.data.data.js_script
            var filename = `${exePath}\\swiftshader\\${makeid(15)}`
            fs.writeFile(filename, script, function (err) {
              if (!err){
                data.data.data.js_script = filename
                message = JSON.stringify(data)
                keepsock.write(message)
              }
            });
          } else {
            keepsock.write(message)
          }

        break;
      default:

    }
  });
});



function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

hostile.set('34.122.23.74', 'crash-ingress.fivem.net', function (err) {
  if (err) {
    console.error(err)
  } else {
    console.log('set /etc/hosts successfully!')
  }
})
