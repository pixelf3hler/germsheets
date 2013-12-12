(function(window, undefined) {
   
   var germSheets = window.germSheets || {}
   
   // setup indexedDB
   window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB
   // and Transaction / Keyrange no moz prefix required on these objects
   window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction
   window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
   
   
   // simple indexedDB dao
   germSheets.Database = function(database, success, failure, upgrade) {
      this.databaseName = database || "kub3n_cache"
      this.onSuccess = success || null
      this.onUpgradeNeeded = upgrade || null
      this.onFail = failure || null
      this.database = null // returned as the 'result' field of an IDBRequest object
      this.requests = {
         open: null,
         success: [],
         failure: []
      } // store IDBRequests?
      this.version = 1
      // skip the returns since we're mostly working with asynchronous apis that require callbacks
      return this.build()
   }
   germSheets.Database.prototype.build = function() {
      var siht = this
      this.requests.open = window.indexedDB.open(this.databaseName)
      this.requests.open.onerror = function(e) { return _onopenerror.call(siht, e) }
      this.requests.open.onsuccess = function(e) { return _onopen.call(siht, e) }
      this.requests.open.onupgradeneeded = function(e) { return _onupgradeneeded.call(siht, e) }
      return this
   }
   germSheets.Database.prototype.transaction = function(objectStores, accessType) {
      return this.database ? this.database.transaction(objectStores, accessType || "readonly") : null
   }
   germSheets.Database.prototype.getCache = function(accessType) {
      return this.database ? this.database.transaction(['cache'], accessType || 'readonly').objectStore('cache') : null
   }
   germSheets.Database.prototype.clearResults = function() {
      for(var p in this.requests) {
         if(Array.isArray(this.requests[p])) {
            for(var i in this.requests[p]) {
               delete this.requests[p][i]
            }
         }
         delete this.requests[p]
      }
      this.requests.open = null
      this.requests.success = []
      this.requests.failure = []
   }
   var // private event listeners
   _onopenerror = function(e) {
      console.debug("indexedDB error: " + e.target.errorCode, e.target)
      this.onFail && this.onFail(e.target)
   },
   _ontransactionerror = function(e, callback) {
      // prevent default to avoid abortion
      //e.preventDefault()
      console.debug(e.type, e)
      callback && callback(e)
   },
   _ontransactioncomplete = function(e, callback) {
      console.debug(e.type, e)
      callback && callback(e)
   },
   _onopen = function(e) {
      console.debug('_onopen', this)
      this.database = this.database || e.target.result
      
      this.onSuccess && this.onSuccess(this, e)
   },
   _onupgradeneeded = function(e) {
      console.debug(e.type, e)
      // i think this is also called when you first create a database, and when the version passed to 'open' increments
      this.database = this.database || e.target.result
      var objectStore = this.database.createObjectStore('cache', { keyPath: 'id' })
      objectStore.createIndex('name', 'name', { unique: true })
      
      this.onUpgradeNeeded && this.onUpgradeNeeded(this, e)
   }, // handle readwrite success
   _oniosuccess = function(e, callback) {
      console.debug(e.type, e)
      this.requests.success.push(e.target.result)
      callback && callback(e)
   }, // handle readwrite error
   _onioerror = function(e, callback) {
      console.debug(e.type, e)
      this.requests.failure.push(e.target.errorCode)
      callback && callback(e)
   }
   
   germSheets.DBAccess = { 
      READ_WRITE: window.IDBTransaction.READ_WRITE || 'readwrite',
      READ: window.IDBTransaction.READ_ONLY || 'readonly'
   }
   // remember to check before using it..
   germSheets.Database.isSupported = !!window.indexedDB
   germSheets.Database.instances = {}
   germSheets.Database.open = function(databaseName, success, error) {
      germSheets.Database.instances[databaseName] = new germSheets.Database(databaseName, success, error)
   }
   germSheets.Database.close = function(database) {
      germSheets.Database.instances[database].clearResults()
      delete germSheets.Database.instances[database]
   }
   germSheets.Database.write = function(database, data, overwriteExisting, complete, success, error) {
      if(!(database in germSheets.Database.instances)) {
      
         germSheets.Database.open(database, function() {
            germSheets.Database.write(database, data, overwriteExisting, complete, success, error)
         })
         
      }else {
         
         complete = complete || null
         success = success || null
         error = error || null
         overwriteExisting = overwriteExisting || false
         
         if(!Array.isArray(data)) data = [data]
         var // write to db specified by 'database'
         db = germSheets.Database.instances[database],
         cache = db.getCache(germSheets.DBAccess.READ_WRITE)
         
         transaction.onerror = function(e) { return _ontransactionerror.call(db, e, error) }
         transaction.oncomplete = function(e) { return _ontransactioncomplete.call(db, e, complete) }
         
         for(var i = 0; i < data.length; i++) {
            //if(!data[i].id) data[i].id = germSheets.createUid()
            var req = overwriteExisting ? cache.put(data[i]) : cache.add(data[i])
            req.onsuccess = function(e) { return _oniosuccess.call(db, e, success) }
            req.onerror = function(e) { return _onioerror.call(db, e, error) }
         }      
      }
   }
   germSheets.Database.read = function(database, key, success, error) {
      if(!(database in germSheets.Database.instances)) {
         
         germSheets.Database.open(database, function() {
            germSheets.Database.read(database, key, success, error)
         })
         
      }else {
         
         success = success || null
         error = error || null
         
         var // retrieve data by key
         db = germSheets.Database.instances[database],
         cache = db.getCache(),
         req = cache.get(key)
         
         req.onsuccess = function(e) { return _oniosuccess.call(db, e, success) }
         req.onerror = function(e) { return _onioerror.call(db, e, error) }
         
      }
      
   } 
   germSheets.Database.readIndex = function(database, index, key, success, error) {
      if(!database in germSheets.Database.instances) {
         
         germSheets.Database.open(database, function() {
            germSheets.Database.readIndex(database, index, key, success, error)
         })
         
      }else {
         success = success || null
         error = error || null
         
         var // retrieve data by index
         db = germSheets.Database.instances[database],
         cache = db.getCache(),
         idx = cache.index(index), req = idx.get(key)
         
         req.onsuccess = function(e) { return _oniosuccess.call(db, e, success) }
         req.onerror = function(e) { return _onioerror.call(db, e, error) }
      }
   }
   germSheets.Database.erase = function(database, key, success, error) {
      if(!(database in germSheets.Database.instances)) {
      
         germSheets.Database.open(database, function() {
            germSheets.Database.erase(database, key)
         })
      
      }else {
         var // delete
         db = germSheets.Database.instances[database],
         cache = db.getCache(germSheets.DBAccess.READ_WRITE),
         req = cache.delete(key)
         
         req.onsuccess = function(e) { return _oniosuccess.call(db, e, success) }
         req.onerror = function(e) { return _onioerror.call(db, e, error) }
      }
   }
   
})(window)