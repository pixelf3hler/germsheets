/** 
 *  @file main parsing routine
 *  @version 1.0.2
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author <max@pixelf3hler.de>
 *  @license license.txt
 *  The MIT License
 */
(function(window, undefined) {

var
germSheets = window.germSheets || {},
token = germSheets.token

/** @deprecated */
function collapseArrays() {
   gssWarn("*** collapseArrays is deprecated. Just use [].concat(..) instead ***")
   var r = [], i = 0, n = arguments.length
   for(; i < n; i++) {
      
      if(Array.isArray(arguments[i])) {
         r = r.concat(arguments[i])
      }
   }
   return r
}

germSheets.SimpleTokenizer = function(str) {
   this.tokens = str.split("")
   this.index = 0
   
   return this
}

germSheets.SimpleTokenizer.prototype.nextToken = function() {
   if(this.tokens.length > this.index) {
      return this.tokens[this.index++]
   }
   return false
}


germSheets.Tokenizer = function(str) {
   this.rawInput = str
   this.tokens = (function(s) {
      //remove unneeded whitespace..that means either 0 or more at the beginning,
      // or 0 or more at the end of each line
      s = s.replace(/^\u0020*|\u0020*$/mg, "")
      // replace linebreaks with a visible glyph
      // for easier debugging
      germSheets.config.enableLogging && console.log("Tokens after whitespace removal:\n" + s)
      s = s.replace(/\n|\r\n|\r/g, token.RETURN)
      germSheets.config.enableLogging && console.log("Tokens after newline replace:\n" + s)
      
      return s.split("")
   })(str)
   this.index = 0
   
   return this
}

germSheets.Tokenizer.prototype.nextToken = function() {
   if(this.tokens.length > this.index) {
      return this.tokens[this.index++]
   }
   return false
}

germSheets.Tokenizer.prototype.markTokenForRemoval = function() {
   this.tokens[this.index-1] = token.DEL
}

germSheets.Tokenizer.prototype.removeMarkedTokens = function() {
   for(var i=0, n=this.tokens.length; i<n; i++) {
      if(token.DEL === this.tokens[i]) {
         this.tokens.splice(i, 1)
         i -= 1
      }
   }
   return this.tokens
}

germSheets.Tokenizer.prototype.reset = function() {
   this.index = 0
   
   return this
}



germSheets.Parser = function(gss) {
   this.source = gss
   this.store = {
      thru: "",
      tmp: "",
      vars: [],
      mixins: [],
      skeletons: [],
      expressions: [],
      cssClass: [],
      cssElement: [],
      cssId: [],
      cssRules: []
   }
   this.tknzr = null
   this.pass = 0
   /* passthru block gets extracted with a regex
      1st   removes comments
      2nd   extracts pretty much everything except method calls and expressions
      3rd   extracts calls to build-in gss methods like <-brighten or <-recommendedLineHeight
      ***** css rule storage moved to 2nd pass  //3rd   stores css rules (identified by class, id or element selectors)
      FINAL   moved to germsheets.compiler_0.0.1.js **** processes the css rules stored in pass 2 using the definitions from pass 2 and prepends the output of
               skeleton calls if any.. the compiler should also resolve and execute gss method calls
      */
   this.passes = ["Comments", "GSS", "Declarations"] //"Methods"]
   this.mode = 0
   this.modes = { open: 0, comment: 1, commentline: 10, commentblock: 11, expression: 12, variable: 2, mixin: 3, skeleton: 4, cssclass: 5, cssid: 6, cssel: 7, method: 8, thru: 9 }
   
   return this
}

germSheets.Parser.prototype.parse = function() {
   this.tknzr = this.tknzr || new germSheets.Tokenizer(this.parseThru(this.source))
   
   while(this.pass < this.passes.length) {
      var parseMethod = "parse" + this.passes[this.pass]
      this.pass = this[parseMethod]()
   }
   
   return this
}

germSheets.Parser.prototype.parseThru = function() {
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
germSheets.Parser.prototype.parseComments = function() {
   var tkn, ntkn, endCommentBlock = false
   germSheets.config.enableLogging && console.log("start removing comments")
   while(false !== (tkn = this.tknzr.nextToken())) {
      ntkn = (this.tknzr.index < this.tknzr.tokens.length) ? this.tknzr.tokens[this.tknzr.index] : token.NUL
      
      if(token.FWD_SLASH === tkn && token.FWD_SLASH === ntkn) {
         if(this.modes.commentline !== this.mode) {
            this.mode = this.modes.commentline
            germSheets.config.enableLogging && console.log("switch mode to: commentline")
         } 
         
      }
      
      if(token.FWD_SLASH === tkn && token.ASTERISK === ntkn) {
         if(this.modes.commentblock !== this.mode) {
            this.mode = this.modes.commentblock
            germSheets.config.enableLogging && console.log("switch mode to: commentblock")
         }
         
      }
      
      if(this.mode === this.modes.commentline) {
         if(token.RETURN === tkn) {
            this.mode = 0
         }
         ////germSheets.config.enableLogging && console.log("marked line comment token: " + tkn)
         this.tknzr.markTokenForRemoval()
         continue
      }
      
      if(this.mode === this.modes.commentblock) {
         
         if(endCommentBlock && token.FWD_SLASH === tkn) { 
            endCommentBlock = false
            this.mode = 0
            germSheets.config.enableLogging && console.log("switch mode to open")
            
         }
         
         if(token.ASTERISK === tkn && token.FWD_SLASH === ntkn) { 
            endCommentBlock = true
         }
         
         //germSheets.config.enableLogging && console.log("marked commentblock token: " + tkn)
         this.tknzr.markTokenForRemoval()
         //continue
      }
   }
   this.tknzr.removeMarkedTokens()
   this.tknzr.reset()
   this.store.tmp = this.tknzr.tokens.join("")
   
   //germSheets.config.enableLogging && console.log(this.store.tmp)
   
   return ++this.pass
}
/**
   2nd pass
*/
germSheets.Parser.prototype.parseGSS = function() {
   var ltkn, tkn, ntkn, varIdx = 0, mixIdx = 0, skelIdx = 0,
       cssClsIdx = 0, cssIdIdx = 0, cssElIdx = 0, inlineThruMode = false
   germSheets.config.enableLogging && console.log("start parsing gss")
   while(false !== (tkn = this.tknzr.nextToken())) {
      ltkn = ntkn || tkn
      ntkn = (this.tknzr.index < this.tknzr.tokens.length) ? this.tknzr.tokens[this.tknzr.index] : token.NUL
      
      // toggle inlineThruMode
      if(token.INLINE_THRU === tkn) {
         inlineThruMode = !inlineThruMode
      }
      
      if(token.DOT === tkn) {
         if(this.mode === this.modes.open) {
            this.mode = this.modes.cssclass
            germSheets.config.enableLogging && console.log("switch mode to: cssclass")
            this.store.cssClass[cssClsIdx] = []
         }
      }
      
      if(token.HASH === tkn) {
         if(this.mode === this.modes.open) {
            this.mode = this.modes.cssid
            germSheets.config.enableLogging && console.log("switch mode to: cssid")
            this.store.cssId[cssIdIdx] = []
         }
      }
      
      if(token.CSSEL.test(tkn)) {
         if(this.mode === this.modes.open) {
            this.mode = this.modes.cssel
            germSheets.config.enableLogging && console.log("switch mode to: cssel")
            this.store.cssElement[cssElIdx] = []
         }
      }
      
      /* extract method calls in a separate pass
      if(token.LT === tkn && token.MINUS === ntkn) {
         if(this.mode !== this.modes.method) {
            this.mode = this.modes.method
         }
      }*/
      
      if(token.VAR === tkn) {
         if(this.mode === this.modes.open) {
            this.mode = this.modes.variable
            germSheets.config.enableLogging && console.log("switch mode to: variable")
            this.store.vars[varIdx] = []
         }
      }
      
      if(token.TILDE === tkn) {
         if(this.mode === this.modes.open) {
            this.mode = this.modes.mixin
            germSheets.config.enableLogging && console.log("switch mode to: mixin")
            this.store.mixins[mixIdx] = []
         }
      }
      
      if(token.PLUS === tkn && token.LT !== ltkn) {
         if(this.mode === this.modes.open) {
            this.mode = this.modes.skeleton
            germSheets.config.enableLogging && console.log("switch mode to: skeleton")
            this.store.skeletons[skelIdx] = []
         }
      }
      
      if(this.modes.cssclass === this.mode) {
         
         this.store.cssClass[cssClsIdx].push(tkn)
         
         if(!inlineThruMode) {
            if(token.CURLY_CLOSE === tkn && token.BANG !== ntkn) {
               this.mode = 0
               cssClsIdx += 1
               germSheets.config.enableLogging && console.log("switch mode to: open")
            }
         }
         continue
      }
      
      if(this.modes.cssid === this.mode) {
         
         this.store.cssId[cssIdIdx].push(tkn)
         
         if(!inlineThruMode) {
            if(token.CURLY_CLOSE === tkn && token.BANG !== ntkn) {
               this.mode = 0
               germSheets.config.enableLogging && console.log("finished parsing: %s", this.store.cssId[cssIdIdx].join(""))
               cssIdIdx += 1
               germSheets.config.enableLogging && console.log("switch mode to: open")
            }
         }
         continue
      }
      
      if(this.modes.cssel === this.mode) {
         
         this.store.cssElement[cssElIdx].push(tkn)
         
         if(!inlineThruMode) {
            if(token.CURLY_CLOSE === tkn && token.BANG !== ntkn) {
               this.mode = 0
               cssElIdx += 1
               germSheets.config.enableLogging && console.log("switch mode to: open")
            }
         }
         continue
      }
      
      if(this.modes.variable === this.mode) {
         
         this.store.vars[varIdx].push(tkn)
         
         if(!inlineThruMode) {
            if(token.SEMICOLON === tkn) {
               this.mode = 0
               varIdx += 1
               germSheets.config.enableLogging && console.log("switch mode to: open")
            }
         }
         
         this.tknzr.markTokenForRemoval()
         
         continue
      }
      
      if(this.modes.mixin === this.mode) {
      
         this.store.mixins[mixIdx].push(tkn)
         
         if(token.CURLY_CLOSE === tkn) {
            this.mode = 0
            mixIdx += 1
            germSheets.config.enableLogging && console.log("switch mode to: open")
         }
         
         this.tknzr.markTokenForRemoval()
         
         continue
      }
      
      if(this.modes.skeleton === this.mode) {
         
         this.store.skeletons[skelIdx].push(tkn)
         
         if(!inlineThruMode) {
            if(token.SEMICOLON === tkn) {
               this.mode = 0
               skelIdx += 1
               germSheets.config.enableLogging && console.log("switch mode to: open")
            }
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
   
   //germSheets.config.enableLogging && console.log(this.store.tmp)
   
   varIdx = mixIdx = skelIdx = cssClsIdx = cssIdIdx = cssElIdx = inlineThruMode = undefined
   
   return ++this.pass
}


var // internal
_copyChildRulesToRef = function(childrules, ref) {
   var i = 0, n = childrules.length
   for(; i < n; i++) {
      var cr = childrules[i]
      germSheets.config.enableLogging && console.log("_copyChildRulesToRef: %s", cr)
      if(cr.childRules && cr.childRules.length) {
         _copyChildRulesToRef(cr.childRules, ref)
      }else {
         ref.push(cr)
      }
   }
},
_buildChildRulesToRef = function(childrules, parent, ref) {
   var i = 0, n = childrules.length
   for(; i < n; i++) {
      var 
      childRuleIdx = (0 === parent.ruleIndex - parseInt(parent.ruleIndex)) ? parseFloat(parent.ruleIndex + "." + (1 + i)) : parseFloat(parent.ruleIndex + ((1+i) / 10)),
      childRule = this._parseDeclarations(childrules[i], childRuleIdx)
      germSheets.config.enableLogging && console.log("childRuleIdx@_buildChildRulesToRef: " + childRuleIdx)
      childRule.identifier = (".:" === childRule.identifier.substr(0,2)) ? parent.identifier + childRule.identifier.substring(1) : parent.identifier + " " + childRule.identifier
      ref.push(childRule) //[this.store.cssRules.length] = childRule
      if(childRule.childRules && childRule.childRules.length) {
         _buildChildRulesToRef.call(this, childRule.childRules, childRule, ref)
      }
   }
}

germSheets.Parser.prototype.parseDeclarations = function() {
   var 
   tkn, 
   ntkn,
   cssrules = [].concat(this.store.cssElement.slice(), this.store.cssId.slice(), this.store.cssClass.slice()),
   i = 0, 
   n = cssrules.length
   
   var childRules = []
   for(; i < n; i++) {
      var rlData = this._parseDeclarations(cssrules[i], i)
      this.store.cssRules[i] = rlData
      //germSheets.config.enableLogging && console.log("rlData@parseDeclarations: %o", rlData)
      if(rlData.childRules && rlData.childRules.length) {
         //childRules[i] = rlData.childRules
         childRules[i] = []
         _copyChildRulesToRef(rlData.childRules, childRules[i])
      }
   }
   
   if(childRules && childRules.length) {
      //germSheets.config.enableLogging && console.log("childRules: %o", childRules)
      n = childRules.length
      var k, j, parentRule
      
      for(i = 0; i < n; i++) {
         if(!childRules[i] || (undefined === childRules[i])) continue
         
         k = childRules[i].length
         parentRule = this.store.cssRules[i]
         
         _buildChildRulesToRef.call(this, childRules[i], parentRule, this.store.cssRules)
         
         /*for(j = 0; j < k; j++) {
            var 
            childRuleIdx = parseFloat(parentRule.ruleIndex + "." + (1 + j)),
            childRule = this._parseDeclarations(childRules[i][j], childRuleIdx)
            childRule.identifier = (".:" === childRule.identifier.substr(0,2)) ? parentRule.identifier + childRule.identifier.substring(1) : parentRule.identifier + " " + childRule.identifier
            this.store.cssRules.push(childRule) //[this.store.cssRules.length] = childRule
            germSheets.config.enableLogging && console.log("storing childRule: %o", childRule)
         }*/
      }
      // sort on ruleIndex
      this.store.cssRules.sort(function(a,b) {
         var 
         aInt = parseInt(a.ruleIndex), bInt = parseInt(b.ruleIndex),
         aDec = a.ruleIndex % 1, bDec = b.ruleIndex % 1
         ////germSheets.config.enableLogging && console.log(a.ruleIndex, aInt, aDec, b.ruleIndex, bInt, bDec)
         if(aInt === bInt) {
            return aDec < bDec ? -1 : 1
         }
         return aInt < bInt ? -1 : 1
      })
   }
   
   // at this point, all rules should be inside store.cssRules
   // parent rules are preceding their children, each cssText property only holds the strings that actually belong to that rule
   // plus some return glyphs and exclamation marks which are removed with regexps
   // time to extract single declarations (using a regexp...i really like using regexps)
   
   this.store.cssRules.forEach(function(itm) {
      //germSheets.config.enableLogging && console.log("before cleanup", itm.cssText)
      // moved cleanup to subroutine
      //itm.cssText = itm.cssText.replace(/^[\u0020\u21B5]*|[\u21B5!]*|[\u21B5\u0020\!]*$/g, '')
      //itm.identifier = itm.identifier.replace(/^\u0020*|\u0020*$/g, '')
      //germSheets.config.enableLogging && console.log("after cleanup", itm.cssText)
      itm.cssText.replace(/[^;]*;/g, function(m) {
         //germSheets.config.enableLogging && console.log("declaration: ", m)
         itm.declarations.push(m)
      })
   })
   
   return ++this.pass
}

germSheets.Parser.prototype._parseDeclarations = function(tokens, ruleIdx) {
   this.tknzr.tokens = tokens
   this.mode = this.modes.open
   
   var mode = "id", crIdx = 0, qntm = "",
   ruleData = { declarations: [], cssText: "", parsedTokens: tokens, identifier: "", childRules: [], ruleIndex: ruleIdx }
   
   while(false !== (tkn = this.tknzr.nextToken())) {
      ntkn = (this.tknzr.index < this.tknzr.tokens.length) ? this.tknzr.tokens[this.tknzr.index] : token.NUL
      
      if(token.CURLY_OPEN === tkn) {
         if("open" === mode) {
            mode = "css"
            germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            continue
         }
      }
      
      if(token.DOT === tkn || token.HASH === tkn || token.INLINE_THRU === tkn) {
         if("css" === mode) {
            mode = "nested"
            ruleData.childRules[crIdx] = ""
            // exclude first backtick
            if(token.INLINE_THRU !== tkn) {
               ruleData.childRules[crIdx] += tkn
            }
            germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            continue
         }
      }
      // token.CSSEL is a regexp
      if(token.CSSEL.test(tkn)) {
         if("css" === mode) {
            mode = "quantum"
            qntm = ""
            germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
         }
      }
      
      if("id" === mode) { 
         if(token.CURLY_OPEN === ntkn) {
            mode = "open"
            germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
         }
         ruleData.identifier += tkn
         continue
      }
      
      if("quantum" === mode) {
         
         qntm += tkn
         
         if(token.SEMICOLON === tkn) {
            ruleData.cssText += qntm.slice()
            qntm = ""
            mode = "css"
            germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            continue
         }
         if(token.CURLY_OPEN === tkn) {
            ruleData.childRules[++crIdx] = qntm.slice()
            qntm = ""
            mode = "nested"
            germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            continue
         }
         
      }
      
      if("nested" === mode) {
         if(token.INLINE_THRU === tkn) {
            mode = "css"
            crIdx++
            germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            continue
         }
         if(token.CURLY_CLOSE === tkn && token.BANG === ntkn) {
            if(this.tknzr.index+1 < this.tknzr.tokens.length && token.BANG !== this.tknzr.tokens[this.tknzr.index+1]) {
               mode = "css"
               ruleData.childRules[crIdx++] += tkn
               germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
               continue
            }                  
            
         }
         if(token.BANG === tkn && token.BANG === ntkn) {
            // remove one ! so it all works out with multi nested rules
            this.tknzr.markTokenForRemoval()//tkn = ""
            //continue
         }
         
         ruleData.childRules[crIdx] += tkn
         continue
      }
      
      if("css" === mode) {
         if(token.CURLY_CLOSE === tkn && token.BANG !== ntkn) {
            mode = "open"
            
            germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            break
         }
         ruleData.cssText += tkn
         continue
      }
   }
   
   this.tknzr.removeMarkedTokens()
   this.tknzr.reset()
   
   ruleData.identifier = ruleData.identifier.replace(/^\u0020*|\u0020*$/g, '')
   ruleData.cssText = ruleData.cssText.replace(/^[\u0020\u21B5]*|[\u21B5!]*|[\u21B5\u0020\!]*$/g, '')
   
   germSheets.config.enableLogging && console.log("ruleData@_parseDeclarations: %o", ruleData)
   
   return ruleData
}

/**   returns a copy of the parsed data and undefines the local cache
 *    @public
 *    @method
 *    @returns {object}
 */
germSheets.Parser.prototype.unstore = function() {
   var p,
   r = {
      thru: this.store.thru.slice(),
      vars: this.store.vars.slice(),
      mixins: this.store.mixins.slice(),
      //methods: this.store.methods.slice(),
      skeletons: this.store.skeletons.slice(),
      expressions: this.store.expressions.slice(),
      cssRuleData: this.store.cssRules.slice()
   }
   
   germSheets.config.enableLogging && console.log("parser::unstore")
   germSheets.config.enableLogging && console.log(r)
   
   for(p in this.store) {
      this.store[p] = undefined
      delete this.store[p]
   }
   
   return r
}

})(window)