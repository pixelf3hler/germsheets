/** 
 *  @file creates a namespace for germSheets
 *  @version 1.0.2
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author <max@pixelf3hler.de>
 *  @license license.txt
 *  The MIT License
 *
 *  @todo   enforce correct execution order when processing style declarations (i can't remember exactly what i meant..but i think it refers to the output)
 *          ✓ enable variables to store methods and expressions, so that they can be fetched at the same time as variables and mixins (optional, but could pick up some speed)
 *          ✓ implement inline-skeletons called 'ribs' token: <+
 *          port to nodejs?
 *          ✓ add support for variables in expressions
 */
(function(window, undefined) {
   var // default config
   defaults = {
      destructionPolicy: "immediately",
      cachePolicy: "never", // "output" | "always"
      cacheType: "localStorage", // i also wrote a wrapper for indexedDB..but haven't implemented it yet
      colorOutputFormat: "likeInput", // "rgb" | "rgba" | "hex" ..also unimplemented
      enableLogging: false,
      // set true to load external scripts
      // in a separate thread..defaults to false
      // TODO: fix worker..just tried it and it crashed for some reason
      useWorker: false,
      // base url for xhr
      baseUrl: ""
   }
   
   /**
    *  @private
    *  naive object merge. should be sufficient since it's only used on the config object,
    *  which has string[, number] and boolean type properties.
    */
   
   function _merge(obj1, obj2) {
      for(p in obj2) {
         if(obj1.hasOwnProperty(p))
            obj1[p] = obj2[p]
      }
      return obj1
   }
   /**
    * @property {object} config - germSheets default config
    * @property {string} version - the current code version
    * @property {array} nodes - stores instances of germSheets.GermNode
    * @property {object} token - a hash of tokens used for parsing gss source code
    * @property {object} fn - stores function definitions that are loaded at runtime.
    */
   var germSheets = {}
   
   /**
    * @type {object}
    * @public
    **/
   germSheets.config = null
   
   /**
    * @type {string}
    * @public
    */
   germSheets.clientId = ""
   
   // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
   germSheets.createUid = function() { 
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8)
          return v.toString(16)
      })
   }
   
   
   /**
    * @param {object} [config] - an optional configuration object. note that germSheets doesn't have to be called directly in order to work
    * 
    */
   germSheets.configure = function(config) {
      germSheets.config = config ? _merge(defaults, config) : defaults
      
      if(!(germSheets.config.cacheType in window)) {
         // disable caching if cacheType isn't supported
         germSheets.config.cachePolicy = "never"
      }
   }
   
   /**
    * 1.0.1 - changes in parsing / de-serializing
    * 1.0.2 - added rib elements and fixed some bugs
    **/
   germSheets.version = "1.0.2"
   
   /**
    * 
    */
   germSheets.nodes = []
   
   
   /**
    * 
    * @todo identify and remove unused tokens
    **/
   germSheets.token = {
      BANG: "!",
      VAR: "$",
      SEMICOLON: ";",
      TILDE: "~",
      //END_MIX_DECL: "}",
      //END_MIX_CALL: ";",
      PLUS: "+",
      //END_SKEL: ";",
      EQ: "=",
      PAR_OPEN: "(",
      PAR_CLOSE: ")",
      CURLY_OPEN: "{",
      CURLY_CLOSE: "}",
      SQUARE_OPEN: "[",
      SQUARE_CLOSE: "]",
      LT: "<",
      MINUS: "-",
      FWD_SLASH: "/",
      ASTERISK: "*",
      //COML: "/",
      //COML2: "/",
      INLINE_THRU: "`",
      DOT: ".",
      COLON: ":",
      HASH: "#",
      CSSEL: /^[a-z\-]/,
      CSSPROP: /^[\w\-]/,
      OP: /[\+\-\/\*%=\?\)]/,
      //END_CSS: "}",
      SPACE: String.fromCharCode(0x20),
      DEL: String.fromCharCode(0x7F), // unicode u+007F => http://www.fileformat.gssInfo/gssInfo/unicode/char/7f/index.htm
      // null byte to terminate 
      NUL: String.fromCharCode(0x0),
      LF: String.fromCharCode(0x0A),  //"\\u000A" => \n 10 decimal
      CR: String.fromCharCode(0x0D),//"\\u000D" =>   \r 13 decimal
      RETURN: String.fromCharCode(0x21B5)
   }
   
   germSheets.stats = {
      startTime: "",
      startDate: null,
      executionTime: "",
      endTime: "",
      startTimer: function() {
         germSheets.stats.startDate = new Date()
         germSheets.stats.startTime = germSheets.stats.startDate.getTime()
         
         germSheets.config.enableLogging && console.log("germSheets start execution on " + germSheets.stats.startDate.toLocaleString())
         
      },
      stopTimer: function() {
         germSheets.stats.endTime = new Date().getTime()
         germSheets.stats.executionTime = ((germSheets.stats.endTime - germSheets.stats.startTime) / 1000).toString() + "s"
         
         germSheets.config.enableLogging && console.log("germSheets completed in " + germSheets.stats.executionTime)
         
         return germSheets.stats.executionTime
      }
   }
   
   germSheets.fn = {}
   
   // expose germSheets
   window.germSheets = window.gss = germSheets
   
})(window)