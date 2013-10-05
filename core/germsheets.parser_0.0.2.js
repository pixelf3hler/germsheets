/* germsheets v0.0.2 */
(function(window, document, germSheets, undefined) {
var
token = germSheets.token || {
   VAR: "$",
   END_VAR: ";",
   MIX: "~",
   END_MIX_DECL: "}",
   END_MIX_CALL: ";",
   SKEL: "+",
   END_SKEL: ";",
   COMB: "/",
   COMB2: "*",
   COML: "/",
   COML2: "/",
   INLINE_THRU: "`",
   THRU2: "%",
   CSSCLASS: ".",
   CSSPSEUDO: ":",
   CSSID: "#",
   CSSEL: new RegExp("^\\w", "i"),
   END_CSS: "}",
   DEL: String.fromCharCode(0x7F), // unicode u+007F => http://www.fileformat.info/info/unicode/char/7f/index.htm
   // null byte to terminate 
   NUL: String.fromCharCode(0x0),
   LF: String.fromCharCode(0x0A),  //"\\u000A",  // 10 decimal
   CR: String.fromCharCode(0x0D),//"\\u000D",   // 13 decimal
   RETURN: String.fromCharCode(0x21B5)
}/*,
gssParser = {
   source:"",
   tknzr: null,
   pass: 0,
   passes: [],
   mode: 0,
   modes: {},
   parse: function(){},
   parse_thru: function(){}
}*/

function collapseArrays() {
   var r = [], i = 0, n = arguments.length
   for(; i < n; i++) {
      
      if(Array.isArray(arguments[i])) {
         r = r.concat(arguments[i])
      }
   }
   return r
}

Tokenizer = germSheets.Tokenizer = function(str) {
   this.rawInput = str
   this.tokens = (function(s) {
      //remove unneeded whitespace..that means either 0 or more at the beginning,
      // 1 or more followed by another one
      // or 0 or more at the end
      s = s.replace(/^\u0020*|\u0020*$/mg, "")
      // replace linebreaks with a visible glyph
      // for easier debugging
      echo("Tokens after whitespace removal:\n" + s)
      s = s.replace(/\n|\r\n|\r/g, token.RETURN)
      echo("Tokens after newline replace:\n" + s)
      
      return s.split("")
   })(str)
   this.index = 0
   
   this.nextToken = function() {
      if(this.tokens.length > this.index) {
         return this.tokens[this.index++]
      }
      return false
   }
   this.markTokenForRemoval = function() {
      this.tokens[this.index-1] = token.DEL
   }
   this.removeMarkedTokens = function() {
      for(var i=0, n=this.tokens.length; i<n; i++) {
         if(token.DEL === this.tokens[i]) {
            this.tokens.splice(i, 1)
            i -= 1
         }
      }
      return this.tokens
   }
   this.reset = function() {
      this.index = 0
      
      return this
   }
   return this
}

Parser = germSheets.Parser = function(gss) {
   this.source = gss
   this.store = {
      thru: "",
      tmp: "",
      vars: [],
      mixins: [],
      skeletons: [],
      methods: [],
      cssClass: [],
      cssElement: [],
      cssId: []
   }
   this.tknzr = null
   this.pass = 0
   /* passthru block gets extracted with a regex
      1st   removes comments
      2nd   extracts pretty much everything except method calls
      3rd   extracts calls to build-in gss methods like <-brighten or <-recommendedLineHeight
      ***** css rule storage moved to 2nd pass  //3rd   stores css rules (identified by class, id or element selectors)
      FINAL   moved to germsheets.compiler_0.0.1.js **** processes the css rules stored in pass 2 using the definitions from pass 2 and prepends the output of
               skeleton calls if any.. the compiler should also resolve and execute gss method calls
      */
   this.passes = ["Comments", "GSS", "Methods"]
   this.mode = 0
   this.modes = { open: 0, comment: 1, commentline: 10, commentblock: 11, variable: 2, mixin: 3, skeleton: 4, cssclass: 5, cssid: 6, cssel: 7, method: 8, thru: 9 }
   
   this.parse = function() {
      this.tknzr = this.tknzr || new Tokenizer(this.parseThru(this.source))
      
      while(this.pass < this.passes.length) {
         var parseMethod = "parse" + this.passes[this.pass]
         this.pass = this[parseMethod]()
      }
      
      return this
   }
   this.parseThru = function() {
      var 
      siht = this,
      tmp = siht.source.replace(/%%(?:.|\n|\r\n|\r)+%%/g, 
         function(m) {
            siht.store.thru = m.replace(/^%%|%%$/g, '')
            return ""
         }
      )
      return tmp
   }
   /**
      1st pass removes comments...the name is a bit misleading
   */
   this.parseComments = function() {
      var tkn, ntkn, endCommentBlock = false
      echo("start removing comments")
      while(false !== (tkn = this.tknzr.nextToken())) {
         ntkn = (this.tknzr.index < this.tknzr.tokens.length) ? this.tknzr.tokens[this.tknzr.index] : token.NUL
         
         if(token.COML === tkn && token.COML2 === ntkn) {
            if(this.modes.commentline !== this.mode) {
               this.mode = this.modes.commentline
               echo("switch mode to: commentline")
            } 
            
         }
         
         if(token.COMB === tkn && token.COMB2 === ntkn) {
            if(this.modes.commentblock !== this.mode) {
               this.mode = this.modes.commentblock
               echo("switch mode to: commentblock")
            }
            
         }
         
         if(this.mode === this.modes.commentline) {
            if(token.RETURN === tkn) {
               this.mode = 0
            }
            ////echo("marked line comment token: " + tkn)
            this.tknzr.markTokenForRemoval()
            continue
         }
         
         if(this.mode === this.modes.commentblock) {
            
            if(endCommentBlock && token.COMB === tkn) { 
               endCommentBlock = false
               this.mode = 0
               echo("switch mode to open")
               
            }
            
            if(token.COMB2 === tkn && token.COMB === ntkn) { 
               endCommentBlock = true
            }
            
            //echo("marked commentblock token: " + tkn)
            this.tknzr.markTokenForRemoval()
            //continue
         }
      }
      this.tknzr.removeMarkedTokens()
      this.tknzr.reset()
      this.store.tmp = this.tknzr.tokens.join("")
      
      //echo(this.store.tmp)
      
      return ++this.pass
   }
   /**
      2nd pass
   */
   this.parseGSS = function() {
      var tkn, ntkn, varIdx = 0, mixIdx = 0, skelIdx = 0,
          cssClsIdx = 0, cssIdIdx = 0, cssElIdx = 0, inlineThruMode = false
      echo("start parsing gss")
      while(false !== (tkn = this.tknzr.nextToken())) {
         ntkn = (this.tknzr.index < this.tknzr.tokens.length) ? this.tknzr.tokens[this.tknzr.index] : token.NUL
         
         // toggle inlineThruMode
         if(token.INLINE_THRU === tkn) {
            inlineThruMode = !inlineThruMode
         }
         
         if(token.CSSCLASS === tkn) {
            if(this.mode === this.modes.open) {
               this.mode = this.modes.cssclass
               echo("switch mode to: cssclass")
               this.store.cssClass[cssClsIdx] = []
            }
         }
         
         if(token.CSSID === tkn) {
            if(this.mode === this.modes.open) {
               this.mode = this.modes.cssid
               echo("switch mode to: cssid")
               this.store.cssId[cssIdIdx] = []
            }
         }
         
         if(token.CSSEL.test(tkn)) {
            if(this.mode === this.modes.open) {
               this.mode = this.modes.cssel
               echo("switch mode to: cssel")
               this.store.cssElement[cssElIdx] = []
            }
         }
         
         /* extract method calls in a separate pass
         if(token.METH === tkn && token.METH2 === ntkn) {
            if(this.mode !== this.modes.method) {
               this.mode = this.modes.method
            }
         }*/
         
         if(token.VAR === tkn) {
            if(this.mode === this.modes.open) {
               this.mode = this.modes.variable
               echo("switch mode to: variable")
               this.store.vars[varIdx] = []
            }
         }
         
         if(token.MIX === tkn) {
            if(this.mode === this.modes.open) {
               this.mode = this.modes.mixin
               echo("switch mode to: mixin")
               this.store.mixins[mixIdx] = []
            }
         }
         
         if(token.SKEL === tkn) {
            if(this.mode === this.modes.open) {
               this.mode = this.modes.skeleton
               echo("switch mode to: skeleton")
               this.store.skeletons[skelIdx] = []
            }
         }
         
         if(this.modes.cssclass === this.mode) {
            
            this.store.cssClass[cssClsIdx].push(tkn)
            
            if(!inlineThruMode) {
               if(token.END_CSS === tkn && token.BANG !== ntkn) {
                  this.mode = 0
                  cssClsIdx += 1
                  echo("switch mode to: open")
               }
            }
            continue
         }
         
         if(this.modes.cssid === this.mode) {
            
            this.store.cssId[cssIdIdx].push(tkn)
            
            if(!inlineThruMode) {
               if(token.END_CSS === tkn && token.BANG !== ntkn) {
                  this.mode = 0
                  cssIdIdx += 1
                  echo("switch mode to: open")
               }
            }
            continue
         }
         
         if(this.modes.cssel === this.mode) {
            
            this.store.cssElement[cssElIdx].push(tkn)
            
            if(!inlineThruMode) {
               if(token.END_CSS === tkn && token.BANG !== ntkn) {
                  this.mode = 0
                  cssElIdx += 1
                  echo("switch mode to: open")
               }
            }
            continue
         }
         
         if(this.modes.variable === this.mode) {
            
            this.store.vars[varIdx].push(tkn)
            
            if(!inlineThruMode) {
               if(token.END_VAR === tkn) {
                  this.mode = 0
                  varIdx += 1
                  echo("switch mode to: open")
               }
            }
            
            this.tknzr.markTokenForRemoval()
            
            continue
         }
         
         if(this.modes.mixin === this.mode) {
         
            this.store.mixins[mixIdx].push(tkn)
            
            if(token.END_MIX_DECL === tkn) {
               this.mode = 0
               mixIdx += 1
               echo("switch mode to: open")
            }
            
            this.tknzr.markTokenForRemoval()
            
            continue
         }
         
         if(this.modes.skeleton === this.mode) {
            
            this.store.skeletons[skelIdx].push(tkn)
            
            if(token.END_SKEL === tkn) {
               this.mode = 0
               skelIdx += 1
               echo("switch mode to: open")
            }
            
            this.tknzr.markTokenForRemoval()
            
            continue
         }
         
      }
      
      this.tknzr.removeMarkedTokens()
      this.tknzr.reset()
      
      // clean up for final pass
      this.store.tmp = this.tknzr.tokens.join("").replace(/^[\u21B5<!\-\[CDAT]*|[\u21B5>\-\]]*$/g, '')
      
      this.tknzr.tokens = this.store.tmp.split('')
      
      //echo(this.store.tmp)
      
      varIdx = mixIdx = skelIdx = cssClsIdx = cssIdIdx = cssElIdx = inlineThruMode = undefined
      
      return ++this.pass
   }
   
   /* parse method calls
      moved to a separate pass to keep the main pass tidy and readable
      since method calls should only appear in css rule definitions this pass only requires
      a portion of the raw input
   ---*/
   
   this.parseMethods = function() {
      var tkn, ntkn, methIdx = 0
      this.mode = this.modes.open
      echo("start parsing methods")
      while(false !== (tkn = this.tknzr.nextToken())) {
         ntkn = (this.tknzr.index < this.tknzr.tokens.length) ? this.tknzr.tokens[this.tknzr.index] : token.NUL
         
         if(token.METH === tkn && token.METH2 === ntkn) {
            if(this.mode !== this.modes.method) {
               this.mode = this.modes.method
               this.store.methods[methIdx] = []
            }
         }
         
         if(this.modes.method === this.mode) { 
            this.store.methods[methIdx].push(tkn)
            
            if(token.END_VAR === tkn) {
               this.mode = 0
               methIdx += 1
               echo("switch mode to: open")
            }
            continue
         }
      }
      
      echo("vars: ")
      this.store.vars.forEach(function(obj) {
         echo(obj.join("") + "\n***\n")
      })
      echo("mixins: ")
      this.store.mixins.forEach(function(obj) {
         echo(obj.join("") + "\n***\n")
      })
      echo("methods: ")
      this.store.methods.forEach(function(obj) {
         echo(obj.join("") + "\n***\n")
      })
      echo("cssClass: ")
      this.store.cssClass.forEach(function(obj) {
         echo(obj.join("") + "\n***\n")
      })
      echo("cssElement: ")
      this.store.cssElement.forEach(function(obj) {
         echo(obj.join("") + "\n***\n")
      })
      echo("cssId: ")
      this.store.cssId.forEach(function(obj) {
         echo(obj.join("") + "\n***\n")
      })
      
      this.tknzr.reset()
      
      return ++this.pass
   }
   
   this.unstore = function() {
      var p,
      r = {
         thru: this.store.thru.slice(),
         vars: this.store.vars.slice(),
         mixins: this.store.mixins.slice(),
         methods: this.store.methods.slice(),
         cssRule: collapseArrays(this.store.cssElement.slice(), this.store.cssId.slice(), this.store.cssClass.slice())
      }
      echo("parser::unstore")
      echo(r)
      
      for(p in this.store) {
         delete this.store[p]
      }
      
      return r
   }
   
   return this
}
//Parser.prototype = gssParser

/*window.gsDebug = function(str) {
   str = str.replace(/^<style type="text\/x-gss">|<\/style>$/g, "")
   var parser = new germSheets.Parser(str)
   parser.parse()
   
   //document.getElementById("debug_out").innerHTML = '<p>' + parser.store.thru + '<br>' + parser.store.tmp + '</p>'
}*/


})(window, window.document, window.germSheets)