//goog.provide('germSheets')

/** 
 *  @file creates a namespace for germSheets
 *  @version 1.0.1
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author Max Burow <max@pixelf3hler.de>
 *  @license license.txt
 *  The MIT License
 *
 *  @todo   enforce correct execution order when processing style declarations
 *          enable variables to store methods and expressions, so that they can be fetched at the same time as variables and mixins (optional, but could pick up some speed)
 *          
 */
(function(window, undefined) {
   var 
   defaults = {
      destructionPolicy: "immediately",
      cachePolicy: "never",
      enableLogging: true,
      /* 0: fatal
         1: error
         2: warn
         3: info
         4: debug */
      logLevel: 4,
      ajax: {
         useXHR: true,
         baseUrl: ""
      }
   }
   
   /**
    * @param {object} [config] - an optional configuration object. note that germSheets doesn't have to be called directly in order to work
    * @property {object} config - germSheets default config
    * @property {string} version - the current code version
    * @property {array} nodes - stores instances of germSheets.GermNode
    * @property {object} token - a hash of tokens used for parsing gss source code
    */
   function germSheets(config) {
      germSheets.config = config ? defaults.slice(config) : defaults
      
      _toggleLogging(germSheets.config.enableLogging)
      
   }
   
   /**
    * @type {object}
    * @public
    **/
   germSheets.config = null
   
   /**
    * 1.0.1 - changes in parsing / de-serializing
    * 
    **/
   germSheets.version = "1.0.1"
   
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
      END_VAR: ";",
      MIX: "~",
      END_MIX_DECL: "}",
      END_MIX_CALL: ";",
      SKEL: "+",
      END_SKEL: ";",
      EQ: "=",
      PAR_OPEN: "(",
      PAR_CLOSE: ")",
      CURLY_OPEN: "{",
      CURLY_CLOSE: "}",
      SQUARE_OPEN: "[",
      SQUARE_CLOSE: "]",
      METH: "<",
      METH2: "-",
      COMB: "/",
      COMB2: "*",
      COML: "/",
      COML2: "/",
      INLINE_THRU: "`",
      CSSCLASS: ".",
      COLON: ":",
      CSSID: "#",
      CSSEL: new RegExp("^[a-z\-]"),
      CSSPROP: new RegExp("^[\w\-]"),
      END_CSS: "}",
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
         
         gssLog("germSheets start execution on " + germSheets.stats.startDate.toLocaleString())
         
      },
      stopTimer: function() {
         germSheets.stats.endTime = new Date().getTime()
         germSheets.stats.executionTime = ((germSheets.stats.endTime - germSheets.stats.startTime) / 1000).toString() + "s"
         
         gssLog("germSheets completed in " + germSheets.stats.executionTime)
         
         return germSheets.stats.executionTime
      }
   }
   
   germSheets.fn = {}
   
   function _toggleLogging(toggle) {
      if(toggle) {
         window.gssFatal = function(err) {
            throw new Error(err)
         }
         
         window.gssLog = function() {
            return germSheets.config.enableLogging ? console && console.log && console.log.apply(window.console, arguments) : false
         }
         
         window.gssError = function() {
            return (germSheets.config.enableLogging && 0 < germSheets.config.logLevel) ? console && console.error && console.error.apply(window.console, arguments) : false
         }
         
         window.gssWarn = function() {
            return (germSheets.config.enableLogging && 1 < germSheets.config.logLevel) ? console && console.warn && console.warn.apply(window.console, arguments) : false
         }
         
         window.gssInfo = function() {
            return (germSheets.config.enableLogging && 2 < germSheets.config.logLevel) ? console && console.info && console.info.apply(window.console, arguments) : false
         }
         
         window.gssDebug = function() {
            return (germSheets.config.enableLogging && 2 < germSheets.config.logLevel) ? console && console.debug && console.debug.apply(window.console, arguments) : false
         }
      }else {
         window.gssFatal = window.gssError = window.gssWarn = window.gssInfo = window.gssDebug = undefined
         delete window.gssFatal
         delete window.gssError
         delete window.gssWarn
         delete window.gssInfo
         delete window.gssDebug
      }
   }
   
   
   // expose germSheets
   window.germSheets = window.gss = germSheets
   
})(window)