(function inject(window) {

  // Base58 encoding/decoding
  // Originally written by Mike Hearn for BitcoinJ
  // Copyright (c) 2011 Google Inc
  // Ported to JavaScript by Stefan Thomas
  // Merged Buffer refactorings from base58-native by Stephen Pair
  // Copyright (c) 2013 BitPay Inc

  "use strict";

  var Base58 = {}

  Base58.alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  Base58.alphabetMap = {}

  for(var i = 0; i < Base58.alphabet.length; i++) {
    Base58.alphabetMap[Base58.alphabet.charAt(i)] = i
  }

  Base58.encode = function(buffer) {
    if (buffer.length === 0) return ''

    var i, j, digits = [0]
    for (i = 0; i < buffer.length; i++) {
      for (j = 0; j < digits.length; j++) digits[j] <<= 8
      digits[digits.length - 1] += buffer[i]

      var carry = 0
      for (j = digits.length - 1; j >= 0; j--){
        digits[j] += carry
        carry = (digits[j] / 58) | 0
        digits[j] %= 58
      }

      while (carry) {
        digits.unshift(carry)
        carry = (digits[0] / 58) | 0
        digits[0] %= 58
      }
    }

    // deal with leading zeros
    for (i = 0; i < buffer.length - 1 && buffer[i] == 0; i++) digits.unshift(0)

    return digits.map(function(digit) { return Base58.alphabet[digit] }).join('')
  }

  Base58.decode = function(string) {
    if (string.length === 0) return (new Uint8Array())

    var input = string.split('').map(function(c){
      return Base58.alphabetMap[c]
    })

    var i, j, bytes = [0]
    for (i = 0; i < input.length; i++) {
      for (j = 0; j < bytes.length; j++) bytes[j] *= 58
      bytes[bytes.length - 1] += input[i]

      var carry = 0
      for (j = bytes.length - 1; j >= 0; j--){
        bytes[j] += carry
        carry = bytes[j] >> 8
        bytes[j] &= 0xff
      }

      while (carry) {
        bytes.unshift(carry)
        carry = bytes[0] >> 8
        bytes[0] &= 0xff
      }
    }

    // deal with leading zeros
    for (i = 0; i < input.length - 1 && input[i] == 0; i++) bytes.unshift(0)
    return (new Uint8Array(bytes))
  }

  /***********
   * duniter-ui-cesium code
   */

  var openNewTab = window.openNewTab
  var mainWindow = window.mainWindow

  window.uiModules['duniter-ui-cesium'] = {
    menuIconClass: 'fa-suitcase',
    menuLabel: 'Cesium',
    menuOpen: openWallet
  }

  function openWallet(summary) {

    const local_host = summary.host.split(':')[0]; // We suppose IPv4 configuration
    const local_port = summary.host.split(':')[1];
    const local_sign_pk = Base58.decode(summary.pubkey);
    const local_sign_sk = Base58.decode(summary.seckey);

    const DEFAULT_CESIUM_SETTINGS = {
      "useRelative": true,
      "timeWarningExpire": 2592000,
      "useLocalStorage": true,
      "rememberMe": true,
      "plugins": {},
      "node": {
        "host": local_host,
        "port": local_port
      },
      "showUDHistory": true
    };

    var walletHeight = parseInt(localStorage.getItem('wallet_height')) || 1000;
    var walletWidth = parseInt(localStorage.getItem('wallet_width')) || 1400;

    openNewTab (window.location.origin + '/duniter-ui-cesium/cesium/index.html', {
      position: 'center',
      height: walletHeight,
      width: walletWidth,
      show: false
    }, function(win) {

      var settingsStr = win.window.localStorage.getItem('CESIUM_SETTINGS');
      var dataStr = win.window.localStorage.getItem('CESIUM_DATA');
      var settings = (settingsStr && JSON.parse(settingsStr));
      var data = (dataStr && JSON.parse(dataStr));
      var keyPairOK = data && data.keypair && data.keypair.signPk && data.keypair.signSk && true;
      if (keyPairOK) {
        data.keypair.signPk.length = local_sign_pk.length;
        data.keypair.signSk.length = local_sign_sk.length;
        keyPairOK = Base58.encode(Array.from(data.keypair.signPk)) === summary.pubkey
          && Base58.encode(Array.from(data.keypair.signSk)) === summary.seckey
          && data.pubkey === summary.pubkey;
      }
      if (!data
        || !keyPairOK
        || settings.node.host != local_host
        || settings.node.port != local_port) {
        settings = settings || DEFAULT_CESIUM_SETTINGS;
        data = data || {};
        console.debug('Configuring Cesium...');
        settings.node = {
          "host": local_host,
          "port": local_port
        };
        settings.plugins = {};
        settings.rememberMe = true;
        data.pubkey = summary.pubkey;
        data.keypair = {
          signPk: local_sign_pk,
          signSk: local_sign_sk
        };
        win.window.localStorage.setItem('CESIUM_SETTINGS', JSON.stringify(settings));
        win.window.localStorage.setItem('CESIUM_DATA', JSON.stringify(data));
        win.on('closed', function() {
          // Reopen the wallet
          setTimeout(openWallet, 1);
        });
        win.close();
      } else {
        // Cesium is correctly configured for the network part
        win.show();
        win.on('closed', function() {
          localStorage.setItem('wallet_height', win.window.innerHeight - 8); // Seems to always have 8 pixels more
          localStorage.setItem('wallet_width', win.window.innerWidth - 16); // Seems to always have 16 pixels more
          mainWindow.focus();
        });
      }
    });
  }

})(window);
