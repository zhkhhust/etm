/*
 * Copyright © 2018 EnTanMo Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the EnTanMo Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

var os = require("os");
var sandboxHelper = require('../utils/sandbox.js');
var slots = require('../utils/slots.js');
var Router = require('../utils/router.js');
var shell = require('../utils/shell.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.version, __private.osName, __private.port;

// Constructor
function System(cb, scope) {
  library = scope;
  self = this;
  self.__private = __private;

  __private.version = library.config.version;
  __private.port = library.config.port;
  __private.magic = library.config.magic;
  __private.osName = os.platform() + os.release();
  
  __private.attachApi();

  setImmediate(cb, null, self);
}

// Private methods
__private.attachApi = function () {
  var router = new Router();

  router.use(function (req, res, next) {
    if (modules) return next();
    res.status(500).send({ success: false, error: "Blockchain is loading" });
  });

  router.map(shared, {
    "get /": "getSystemInfo"
  });

  router.use(function (req, res, next) {
    res.status(500).send({ success: false, error: "API endpoint not found" });
  });

  library.network.app.use('/api/system', router);
  library.network.app.use(function (err, req, res, next) {
    if (!err) return next();
    library.logger.error(req.url, err.toString());
    res.status(500).send({ success: false, error: err.toString() });
  });
}


//Shared methods

shared.getSystemInfo = function (req, cb) {

  var lastBlock = modules.blocks.getLastBlock();
  var systemInfo = shell.getOsInfo();

  return cb(null, {
    os: os.platform() +"_"+ os.release(),    
    version: library.config.version,
    timestamp : Date.now(),

    lastBlock:{
      height: lastBlock.height,
      timestamp : slots.getRealTime(lastBlock.timestamp),
      behind: slots.getNextSlot() - (slots.getSlotNumber(lastBlock.timestamp) +1)
    },

    systemLoad:{
      cores : systemInfo.cpucore,
      loadAverage : systemInfo.loadavg,
      freeMem: systemInfo.memfreemb, 
      totalMem: systemInfo.memtotalmb
    }
  });  
}

// Private methods


// Public methods
System.prototype.getOS = function () {
  return __private.osName;
}

System.prototype.getVersion = function () {
  return __private.version;
}

System.prototype.getPort = function () {
  return __private.port;
}

System.prototype.getMagic = function () {
  return __private.magic;
}

System.prototype.sandboxApi = function (call, args, cb) {
  sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
System.prototype.onBind = function (scope) {
  modules = scope;
}

// Shared

// Export
module.exports = System;
