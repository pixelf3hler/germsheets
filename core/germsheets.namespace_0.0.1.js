/*! import first */
(function(window, undefined) {
   
   function germSheets() {
   
   }
   
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
      CSSEL: new RegExp("^\\w", "i"),
      END_CSS: "}",
      DEL: String.fromCharCode(0x7F), // unicode u+007F => http://www.fileformat.info/info/unicode/char/7f/index.htm
      // null byte to terminate 
      NUL: String.fromCharCode(0x0),
      LF: String.fromCharCode(0x0A),  //"\\u000A" => \n 10 decimal
      CR: String.fromCharCode(0x0D),//"\\u000D" =>   \r 13 decimal
      RETURN: String.fromCharCode(0x21B5)
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
   
   germSheets.error = function(err) {
      throw new Error(err)
   }
   
   window.germSheets = window.gss = germSheets
   
})(window)