const { ipcRenderer } = require('electron')
const fetch = require('node-fetch');
const $ = require( "jquery" );

var confirmedBy
var totalFiles
var userInformation = {
  clientId: "Fetching"
}

function advanceProgressBar(process) {
  var processVal = document.querySelector('.pageLoader .processVal').style.width;
  var processValInt = processVal.replace("%", "")
  if(processValInt < 100) {
    document.querySelector('.pageLoader .processVal').style.width = ((Number(processValInt) + process) + "%").toString()
  }
}

function changeStatus(text) {
  document.getElementById('status').innerHTML = text
}

function confirmedFromWebsite() {
  advanceProgressBar(2)
  changeStatus("Connected to website, checking updates...")

  // Get config of current update
  fetch(`${confirmedBy}/version`)
    .then(res => res.json())
    .then(json => {
      ipcRenderer.send('version-config', json)
    })
    .catch(err => {
      changeStatus("Could not get information from the server,\nplease check your internet connection.")
    });

}

ipcRenderer.send('loader', 'online')

ipcRenderer.on('website-confirm', (event, arg) => {
  confirmedBy = arg
  confirmedFromWebsite()
})

ipcRenderer.on('checksum-step', (event, arg) => {
  advanceProgressBar(100/totalFiles)
  changeStatus("The file currently being checked: " + arg)
})

ipcRenderer.on('file-downloading', (event, arg) => {
  advanceProgressBar(100/totalFiles)
  changeStatus("The file currently updating: " + arg)
})

ipcRenderer.on('set-total-files', (event, arg) => {
  totalFiles = arg
})

ipcRenderer.on('files-updated', (event, arg) => {
  changeStatus("We're going to hack there")
  setTimeout(function() {
    ipcRenderer.send('injector', true)
  },3000);
})

ipcRenderer.on('injector', (event, arg) => {
  arg = JSON.parse(arg)
  var status = arg.status
  switch (status) {
    case 'injector_not_found':
      changeStatus(`Some files are missing.<br>Please restart FiveX`)
      break;
    case 'client_id_found':
      userInformation.clientId = arg.data.client_id
      changeStatus(`Authenticating for <span class='client-id'>${userInformation.clientId}</span>`)
      break;
    case 'fivem_already_works':
      changeStatus(`You cannot start FiveX after FiveM.`)
      break;
    case 'waiting_fivem':
      changeStatus(`Waiting for FiveM...`)
      break;
    case 'fivem_found':
      changeStatus(`FiveM found. FiveX injecting itself to process...`)
      break;
    case 'injected':
      changeStatus(`Injected!`)
      ipcRenderer.send('open-menu', true)
      break;
    case 'you_fagger':
      changeStatus(`FUCK YOU FAGGER!`)
      break;
    case 'login_successfull':
      changeStatus(`Successfully logged in.`)
      break;
    case 'auth_failed':
      changeStatus(`Auth failed. Your client id: <span class='client-id'>${userInformation.clientId}</span>`)
      break;
    case 'unknow_error':
      changeStatus(`An error occurred that we could not understand. Please restart FiveX.`)
      break;
    case 'launcher_twice':
      changeStatus(`FiveX has been turned on twice. Please start it only once.`)
      break;
    default:
      console.log(arg)
  }
})
