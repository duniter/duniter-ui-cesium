"use strict"

const fs = require('fs')
const path = require('path')

module.exports = {
  duniterUI: {
    
    inject: {
      menu: fs.readFileSync(path.join(__dirname, 'injection/menu.js'), 'utf8')
    },
    
    route: (app) => {

      app.get('/duniter-ui-cesium/cesium/*', (req, res) => {
        const subpath = req.url.replace('/duniter-ui-cesium/cesium/', '')
        const filestream = fs.createReadStream(path.join(__dirname, '/cesium/', subpath))
        filestream.pipe(res)
        filestream.on('error', (e) => {
          res.send(500).body(e)
        })
      })
    }
  }
}
