//goog.provide('germsheets.namespace')

/*! germsheets.namespace.js
    version 1.0.0
  © 2013 max ɐʇ pixelf3hler · de
    The MIT License
    see license.txt
*/
(function(window, undefined) {
   
   function germSheets(config) {
      germSheets.config = germSheets.config || config
   }
   
   germSheets.config = {
      destructionPolicy: "immediately",
      enableLogging: true,
      logLevel: 1
   }
   
   germSheets.version = "1.0.0"
   
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
      CSSEL: new RegExp("^[a-z]"),
      END_CSS: "}",
      DEL: String.fromCharCode(0x7F), // unicode u+007F => http://www.fileformat.gssInfo/gssInfo/unicode/char/7f/index.htm
      // null byte to terminate 
      NUL: String.fromCharCode(0x0),
      LF: String.fromCharCode(0x0A),  //"\\u000A" => \n 10 decimal
      CR: String.fromCharCode(0x0D),//"\\u000D" =>   \r 13 decimal
      RETURN: String.fromCharCode(0x21B5)
   }
   
   germSheets.stats = {
      startTime: "",
      executionTime: "",
      endTime: "",
      startTimer: function() {
         germSheets.stats.startTime = new Date().getTime()
      },
      stopTimer: function() {
         germSheets.stats.endTime = new Date().getTime()
         germSheets.stats.executionTime = ((germSheets.stats.endTime - germSheets.stats.startTime) / 1000).toString() + "s"
         
         return germSheets.stats.executionTime
      }
   }
   
   germSheets.ajaxConfig = {
      baseUrl: "",
      useXHR: true
   }
   
   germSheets.fn = {}
   
   germSheets.SimpleTokenizer = function(str) {
      this.tokens = str.split("")
      this.index = 0
      this.nextToken = function() {
         if(this.tokens.length > this.index) {
            return this.tokens[this.index++]
         }
         return false
      }
   }
   
   window.gssFatal = function(err) {
      throw new Error(err)
   }
   
   window.gssLog = function() {
      return germSheets.config.enableLogging ? console && console.log && console.log.apply(window.console, arguments) : false
   }
   
   window.gssError = function() {
      return (germSheets.config.enableLogging && 1 === germSheets.config.logLevel) ? console && console.error && console.error.apply(window.console, arguments) : false
   }
   
   window.gssInfo = function() {
      return (germSheets.config.enableLogging && 1 < germSheets.config.logLevel) ? console && console.gssInfo && console.gssInfo.apply(window.console, arguments) : false
   }
   
   window.germSheets = window.gss = germSheets
   
})(window)