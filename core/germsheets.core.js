//goog.require('germsheets.namespace')
//goog.require('germsheets.http')
//goog.require('germsheets.parser')
//goog.require('germsheets.compiler')

/*! germsheets.core.js 
    © 2013 max ɐʇ pixelf3hler · de
    The MIT License
    see license.txt
*/
(function(window, document, germSheets, undefined) {
   
   /*
      gssData structure:
      {
         thru: "",      => unmodified css
         tmp: "",       => the result of the last parser pass as string
         vars: [],      => variable definitions
         mixins: [],    => mixin definitions
         skeletons: [], => skeleton calls
         cssClass: [],  => css class rules
         cssElement: [],=> css element rules
         cssId: []      => css id rules
      }
   */
   var token = germSheets.token
   
   /* escapes strings for use in regexp patterns
   */
   function regEsc(str) {
      return str.replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-]', 'g'), '\\$&')
   }
   
   function collapse(obj1, obj2) {
      var p, r = {}
      for(p in obj1) {
         r[p] = obj1[p]
      }
      for(p in obj2) {
         r[p] = obj2[p]
      }
      return r
   }
   
   /* i've banchmarked this against Array.forEach
      and found out that its a bit faster below 100.000 iterations
      ..maybe consider replacing calls to forEach with it where successive calls
      with only few expected iterations are made...like inside CSSRule.process ..i need better mapping between
      CSSRules and their content
      
      results at 
       50.000 iterations:
         foreach 0.02s
         Array.forEach 0.036s
      100.000 iterations:
         foreach 0.028s
         Array.forEach 0.039s
      250.000 iterations:
         foreach 0.184s
         Array.forEach 0.084s
      500.000 iterations
         foreach 0.216s
         Array.forEach 0.17s
    */
   function foreach(array, callback) {
      var i = 0, n = array.length
      for(; i<n; i++) {
         callback(array[i], i, array)
      }
      return array
   }
   
   /**
      @param args Array
   */
   germSheets.runOn = function(callerNode, methName) {
      callerNode = callerNode || window
      if(methName in germSheets.fn) {
         return germSheets.fn[methName].apply(callerNode, Array.prototype.slice.call(arguments, 2))
      }
      return null
   }
   
   /* pauses execution for n/1000 seconds
   ------*/
   germSheets.pause = function(n) {
      var 
      start = +new Date
      now = start
      gssLog("pausing...")
      while(now - start < n) {
         now = +new Date
      }
      gssLog("paused for: " + n + "ms")
      return n
   }
   
   /* prototype for user defined
      subroutines that replace
      content in style declarations 
      like variables or mixins
   */
   var 
   gssPrototype = {
      /* the raw content 
         a variable might look like: "$green = #7eef48;"
         a mixin: "~roundCorners($radius) {/\u21B5\u21B5/border-radius: $radius;/\u21B5/}"
      */
      gssText: "",
      /* the sanizized identifier
         green or roundCorners
      */
      identifier: "",
      
      /* ~ $ +
      */
      token: "",
      /* the processed content
         #7eef48; or border-radius: 6px;
      */
      cssText: "",
      dirty: true,
      output: "",
      parentNode: null,
      /* replaces occurences
         of this.gssText in input with this.cssText
      */
      process: function(input){},
      /* applies initial values
         provided in the args array
      */
      __constructor: function(args, node) { 
         this.gssText = Array.isArray(args) ? args.join("") : args
         this.parentNode = node || germSheets
         return this.build()
      },
      build: function() {}
   }
   
   
   /* Variables
   -----------------------*/
   germSheets.Variable = function(args, node) {
   
      this.build = function() {
         var tkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020/g, ''))
         while(false !== (tkn = tknzr.nextToken())) {
            // $green=#7eef48;
            if(token.VAR === tkn) {
               this.token = tkn
               if("open" === mode) {
                  mode = "id"
                  continue
               }
            }
            
            if(token.EQ === tkn) {
               if("val" !== mode) {
                  mode = "val"
                  continue
               }
            }
            
            if("id" === mode) {
               this.identifier += tkn
               continue
            }
            
            if("val" === mode) {
               this.cssText += tkn
               if(token.VAR_END === tkn) {
                  this.dirty = false
               }
            }
         }
      }
      this.process = function(input) {
         var regex = new RegExp('(?:' + regEsc(this.token + this.identifier) + ');*', "g")
         this.output = input.replace(regex, this.cssText)
         
         return this.output
      }
      
      return this.__constructor(args, node)
      
   }
   germSheets.Variable.prototype = gssPrototype
   
   
   
   /* Mixins
   -------------*/
   germSheets.Mixin = function(args, node) {
      this.argumentIds = ""
      this.argumentValues = ""
      this.rawCssText = ""
      // ~roundCorners($radius) { border-radius: $radius; }
      this.build = function() {
         var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u21B5/g, ''))
         while(false !== (tkn = tknzr.nextToken())) {
            ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
            if(token.MIX === tkn) {
               if("open" === mode) {
                  this.token = tkn
                  mode = "id"
                  continue
               }
            }
            if(token.PAR_OPEN === tkn) {
               if("open" === mode) {
                  mode = "args"
                  continue
               }
            }
            
            if(token.CURLY_OPEN === tkn) {
               if("open" === mode) {
                  mode = "css"
                  continue
               }
            }
            
            if("id" === mode) {
               if(String.fromCharCode(0x20) === ntkn || token.PAR_OPEN === ntkn) {
                  mode = "open"
               }
               this.identifier += tkn
               continue
            }
            
            if("args" === mode) {
               if(token.PAR_CLOSE === ntkn) {
                  mode = "open"
               }
               this.argumentIds += tkn
               continue
            }
            
            if("css" === mode) {
               if(token.CURLY_CLOSE === tkn) {
                  this.mode = "open"
                  this.dirty = false
                  break
               }
               this.rawCssText += tkn
            }
         }
         this.rawCssText = this.rawCssText.replace(/^\u0020*|\u0020*$/g, '')
         
      }
      /* token:               ~ 
         identifier:          roundCorners 
         argumentIds:         [$radius] 
         rawCssText:          border-radius: $radius;
         input:               .light_green { background-color: <-brighten($green, 25); ~roundCorners(6px); } 
         desired output =>    .light_green { background-color: <-brighten($green, 25); border-radius: 6px; }
         */
      this.process = function(input) {
         // get argument values
         var
         siht = this,
         rgx = new RegExp(regEsc(this.token + this.identifier + '\u0020') + "*\\([^\\)]*\\);", "g")
         
         this.output = input.replace(rgx, function(m) {
            siht.argumentValues = m.substring(m.indexOf(token.PAR_OPEN) + 1, m.lastIndexOf(token.PAR_CLOSE))
            //replace argumentIds with values in rawCssText
            siht.cssText = siht.rawCssText.replace(siht.argumentIds, siht.argumentValues)
            return siht.cssText
         })
         
         return this.output
      }
      
      return this.__constructor(args, node)
   }
   germSheets.Mixin.prototype = gssPrototype
   
   
   
   /* Methods
   --------------*/
   germSheets.Method = function(args, node) {
      this.rawArguments = ""
      this.argumentValues = []
      this.js = null
      // <-brighten($green,25);
      this.build = function() {
         var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020*/g, ''))
         
         while(false !== (tkn = tknzr.nextToken())) {
            ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
            
            if(token.METH === tkn && token.METH2 === ntkn) {
               if("open" === mode) {
                  mode = "token"
                  //gssLog("switch mode to: " + mode + " at token: " + tkn)
               }
            }
            
            if(token.PAR_OPEN === tkn) {
               if("open" === mode) {
                  mode = "args"
                  //gssLog("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
            }
            
            if(token.END_VAR === tkn || token.NUL === ntkn) {
               if("open" === mode) {
                  //this.dirty = false
                  break
               }
            }
            
            if("token" === mode) {
               
               if(token.METH2 === tkn) {
                  mode = "id"
                  //gssLog("switch mode to: " + mode + " at token: " + tkn)
               }
               this.token += tkn
               continue
            }
            
            if("id" === mode) {
               
               if(token.PAR_OPEN === ntkn) {
                  mode = "open"
                  //gssLog("switch mode to: " + mode + " at token: " + tkn)
               }
               this.identifier += tkn
               continue
            }
            
            if("args" === mode) {
               this.rawArguments += tkn
               if(token.PAR_CLOSE === ntkn) {
                  mode = "open"
                  //gssLog("switch mode to: " + mode + " at token: " + tkn)
               }
               continue
            }  
         }
         gssLog("build complete: " + this.identifier)
         //gssLog(this)
         
         return this
      }
      
      this.process = function(input, callback) {
         gssInfo("call to process()")
         // only do all that crap if necessary..
         if(-1 === input.indexOf(this.token + this.identifier)) {
            callback(input)
            return
         }
         var siht = this
         /* defined in germsheets.http */
         germSheets.getFunction(this.identifier, function(fn) {
            gssInfo("load complete: " + fn.toString())
            var r = siht._process(input, fn)
            callback(r)
         })
      }
      
      this._process = function(input, processor) {
         gssInfo("call to _process()")
         var // clean up arguments and get required variable definitions
         tmp = this.rawArguments.split(/\u0020*,\u0020*/),
         requiredVars = [], varInputs = [], varIdx = 0, i = 0, n = tmp.length
         
         for(; i < n; i++) {
            if(token.VAR === tmp[i].charAt(0)) {
               varInputs[varIdx] = tmp[i]
               requiredVars[varIdx++] = this.parentNode.getVariable(tmp[i])
            }else {
               this.argumentValues.push(tmp[i])
            }
         }
         
         // replace var names with actual values and execute
         i = 0
         n = requiredVars.length
         
         for(; i < n; i++) {
            this.argumentValues.push(requiredVars[i].process(varInputs[i]))
         }
         // call method on germSheets.fn
         this.cssText = processor.apply(this, this.argumentValues)
         // generate output
         this.output = input.replace(this.gssText, this.cssText)
         
         return this.output
      }
      return this.__constructor(args, node)
   }
   germSheets.Method.prototype = gssPrototype
   
   
   
   /* Skeletons
   -----------------*/
   germSheets.Skeleton = function(args, node) {
      // +unroll(test,class,2,6,$iteratorBlock);
      this.rawArguments = ""
      this.argumentValues = []
      this.build = function() {
         var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020*/g, ''))
         while(false !== (tkn = tknzr.nextToken())) {
            ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
            
            if(token.SKEL === tkn) {
               if("open" === mode) {
                  mode = "id"
                  this.token = tkn
                  continue
               }
            }
            
            if(token.PAR_OPEN === tkn) {
               if("open" === mode) {
                  mode = "args"
                  continue
               }
            }
            
            if(token.END_VAR === tkn || token.NUL === ntkn) {
               if("open" === mode) {
                  this.dirty = false
                  break
               }
            }
            
            if("id" === mode) {
               this.identifier += tkn
               if(token.PAR_OPEN === ntkn) {
                  mode = "open"
               }
               continue
            }
            
            if("args" === mode) {
               this.rawArguments += tkn
               if(token.PAR_CLOSE === ntkn) {
                  mode = "open"
               }
               continue
            }  
         }
         return this
      }
      
      this.process = function(callback) {
         var siht = this
         germSheets.getFunction("skeleton_" + this.identifier, function(fn) {
            var r = siht._process(fn)
            callback(r)
         })
      }
      
      this._process = function(processor) {
         var // clean up arguments and get required variable definitions
         tmp = this.rawArguments.split(/\u0020*,\u0020*/),
         requiredVars = [], varInputs = [], varIdx = 0, i = 0, n = tmp.length
         
         for(; i < n; i++) {
            if(token.VAR === tmp[i].charAt(0)) {
               varInputs[varIdx] = tmp[i]
               requiredVars[varIdx++] = this.parentNode.getVariable(tmp[i])
               
            }else {
               this.argumentValues.push(tmp[i])
            }
         }
         
         // replace var names with actual values and execute
         i = 0
         n = requiredVars.length
         
         for(; i < n; i++) {
         //gssLog("skeleton::process: " + varInputs[i])
            this.argumentValues.push(requiredVars[i].process(varInputs[i]))
         }
         // call method on germSheets.fn
         this.output = processor.apply(this, this.argumentValues)
         
         return this.output
      }
      
      return this.__constructor(args, node)
   }
   germSheets.Skeleton.prototype = gssPrototype
   
   
   
   /* Inline Expressions
   ----------------------*/
   germSheets.Expression = function(args, node) {
      /* complex: <(.rect[width] + .square[height] * 0.566)px;
         simple: <(1 + Math.random())em; */ 
      this.cssUnit = ""
      this.rawExpression = ""
      this.evaledExpression = ""
      this.cleanExpression = ""
      this.output = ""
      this.cssReferences = []
      this.build = function() {
         var tkn, ntkn, hasRefs = false, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020*/g, ''))
         while(false !== (tkn = tknzr.nextToken())) {
            ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
            
            if(token.METH === tkn && token.PAR_OPEN === ntkn) { 
               if("open" === mode) {
                  mode = "token"
               }
            }
            
            if(token.SQUARE_OPEN === tkn) {
               if("exp" === mode) {
                  hasRefs = true
               }
            }
            
            
            if("token" === mode) {
               this.token += tkn
               if(token.PAR_OPEN === tkn) {
                  mode = "exp"
               }
               continue
            }
            
            if("exp" === mode) {
               this.rawExpression += tkn
               
               if(token.END_VAR === tkn) {
                  this.dirty = false
                  mode = "open"
                  break
               }
               
               continue
            }
            
            /*if("unit" === mode) {
               
               if(token.END_VAR === tkn) {
                  break
               }
               this.cssUnit += tkn
               continue
            }*/
            
         }
         var siht = this
         this.rawExpression = this.rawExpression.replace(/\)?(?:em|px|\%|in|mm|cm|ext|pt|pc)*;$/g, function(m) {
            m = m.replace(/^\s*\)|;\s*$/g, '')
            siht.cssUnit = m
            return ""
         })
         
         if(hasRefs) {
            tknzr.index = 0
            tknzr.tokens.length = 0
            tknzr.tokens = this.rawExpression.split("")
            mode = "open"
            var refIdx = 0
            while(false !== (tkn = tknzr.nextToken())) {
               ntkn = tknzr.index < tknzr.tokens.length ? tknzr.tokens[tknzr.index] : token.NUL
               
               if(token.CSSCLASS === tkn || token.CSSID === tkn || token.CSSEL.test(tkn)) {
                  if("open" === mode) {
                     mode = "cssref"
                     this.cssReferences[refIdx] = tkn
                     continue
                  }
               }
               
               if("cssref" === mode) {
                  this.cssReferences[refIdx] += tkn
                  if(token.SQUARE_CLOSE === tkn) {
                     mode = "open"
                     refIdx++
                  }
                  continue
               }
            }
            
            if(this.cssReferences && this.cssReferences.length) {
               this.buildReferences()
            }
         }
         
         return this
      }
      this._builtReferences = []
      this.buildReferences = function() {
         var i = 0, n = this.cssReferences.length
         for(; i < n; i++) {
            this._builtReferences[i] = new germSheets.CSSReference(this.cssReferences[i], this)
         }
         return this._builtReferences
      }
      
      this.process = function(input) {
         input = input || ""
         this.cleanExpression = this.rawExpression
         if(this._builtReferences && this._builtReferences.length) {
            var siht = this
            this._builtReferences.forEach(function(ref) {
               siht.cleanExpression = ref.process(siht.cleanExpression)
            })
            // if we have refs to css rules, we're also likely to have css units
            // and that would cause errors during evaluation
            this.cleanExpression = this.cleanExpression.replace(/^\u0020|em|px|\%|in|mm|cm|ext|pt|pc|;|\u0020$/g, '')
         }
         
         gssInfo("germSheets.Expression trying to eval: " + this.cleanExpression)
         
         try {
            this.evaledExpression = eval("(" + this.cleanExpression + ")")
         }catch(er) {
            gssError("error evaluating: " + this.cleanExpression + "\nerror: " + er)
            try {
               var fn = Function("(function() { return " + this.cleanExpression + " })")
               this.evaledExpression = fn()
            }catch(err) {
               gssError("error using function cast: " + err)
               this.evaledExpression = this.cleanExpression
            }
         }
         this.cssText = this.evaledExpression + this.cssUnit + token.END_VAR
         this.output = input ? input.replace(this.gssText, this.cssText) : this.cssText
         
         return this.output
      }
      
      return this.__constructor(args, node)
   }
   germSheets.Expression.prototype = gssPrototype
   
   germSheets.CSSReference = function(args, expression) {
      this.expression = expression
      this.rootNode = expression.parentNode
      this.referenceId = ""
      this.referenceProperty = ""
      this.reference = null
      this.gssText = ""
      this.cssText = ""
      
      // .box[width]
      this.build = function(str) {
         var cnt = 0, siht = this
         this.gssText = str.replace(/[a-z\.#\-]*[^\[\]]/g, function(m) {
            if(0 === ++cnt % 2) {
               // 2 4
               siht.referenceProperty = m
            }else {
               // 1 3
               siht.referenceId = m
            }
            return m
         })
         return this
      }
      this.process = function(input) {
         input = input || ""
         this.reference = this.rootNode.getCSSRule(this.referenceId)
         this.cssText = this.reference.getStyleDeclaration(this.referenceProperty)
         
         return input ? input.replace(this.gssText, this.cssText) : this.cssText
      }
      return this.build(args)
   }
/* ------  */
 

 
/* css rules 
-----------------------*/
   var 
   cssPrototype = collapse(gssPrototype, {
      __constructor: function(args, node, ruleIndex) { 
         this.gssText = Array.isArray(args) ? args.join("") : args
         this.parentNode = node
         this.ruleIndex = ruleIndex
         return this.build()
      },
      process: function(vars, mixins, methods, expressions, callback) {},
      /* ul { list-style-type: none; `.nested_rule { display: none; }` .childrule { color: $black;font-family: consolas,monospace; #second_level { color: #fff; }!! }! } 
         
         how to differentiate between style declarations and nested rules: 
         - only execute if mode != 'nested'
         - if the current token is either a . # or ` switch mode to 'nested' discard the backtick. proceed in nested mode.
         - if its a letter and wasn't preceded by a . # or `, switch mode to 'quantum'
         - store quantum tokens in a temp cache obj until you run into a opening curly brace { or a semicolon
         - if its a ; prepend quantum tokens and store in cssText. switch mode to 'css'  
         - if its a { create new child rule entry, prepend quantum tokens and switch mode to 'nested', discard the curly brace
         - in both cases delete quantum tokens afterwards
       */
      containsExpressions: false,
      build: function() {
         var 
         tkn, ntkn, crIdx = 0, qntm = "", qntmMode = "?",
         mode = "id", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020{2,}|\u21B5*/g, ''))
         
         while(false !== (tkn = tknzr.nextToken())) {
            ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
            
            if(token.CURLY_OPEN === tkn) {
               if("open" === mode) {
                  mode = "css"
                  gssInfo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
            }
            
            if(token.METH === tkn && token.PAR_OPEN === ntkn) {
               //if("css" === mode) {
                  this.containsExpressions = true
                  gssInfo("contains expression: " + this.containsExpression)
               //}
            }
            
            if(token.CSSCLASS === tkn || token.CSSID === tkn || token.INLINE_THRU === tkn) {
               if("css" === mode) {
                  mode = "nested"
                  this.childRules[crIdx] = ""
                  // exclude first backtick
                  if(token.INLINE_THRU !== tkn) {
                     this.childRules[crIdx] += tkn
                  }
                  gssInfo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
            }
            
            if(token.CSSEL.test(tkn)) {
               if("css" === mode) {
                  mode = "quantum"
                  qntm = ""
                  gssInfo("switch mode to: " + mode + " at token: " + tkn)
               }
            }
            
            /*if(token.METH === tkn && token.METH2 === ntkn) 
                  methods and mixins are already stored elsewhere..don't
                  bother with them here */
            
            if("id" === mode) { 
               if(token.CURLY_OPEN === ntkn) {
                  mode = "open"
                  gssInfo("switch mode to: " + mode + " at token: " + tkn)
               }
               this.identifier += tkn
               continue
            }
            
            if("quantum" === mode) {
               
               qntm += tkn
               
               if(token.END_VAR === tkn) {
                  this.cssText += qntm.slice()
                  qntm = ""
                  mode = "css"
                  gssInfo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
               if(token.CURLY_OPEN === tkn) {
                  this.childRules[++crIdx] = qntm.slice()
                  qntm = ""
                  mode = "nested"
                  gssInfo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
               
            }
            
            if("nested" === mode) {
               if(token.INLINE_THRU === tkn) {
                  mode = "css"
                  crIdx++
                  gssInfo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
               if(token.CURLY_CLOSE === tkn && token.BANG === ntkn) {
                  if(tknzr.index+1 < tknzr.tokens.length && token.BANG !== tknzr.tokens[tknzr.index+1]) {
                     mode = "css"
                     this.childRules[crIdx++] += tkn
                     gssInfo("switch mode to: " + mode + " at token: " + tkn)
                     continue
                  }                  
                  
               }
               if(token.BANG === tkn && token.BANG === ntkn) {
                  // remove one ! so it all works out with multi nested rules
                  tkn = ""
                  //continue
               }
               
               this.childRules[crIdx] += tkn
               continue
            }
            
            if("css" === mode) {
               if(token.CURLY_CLOSE === tkn && token.BANG !== ntkn) {
                  mode = "open"
                  this.dirty = false
                  gssInfo("switch mode to: " + mode + " at token: " + tkn)
                  break
               }
               this.cssText += tkn
               continue
            }  
         }
         
         // TODO: adjust parsing so that the next lines become unnecessary
         this.cssText = this.cssText.replace(/^[\u0020\u21B5]*|[\u21B5\u0020\!]*$/g, '')
         this.identifier = this.identifier.replace(/^\u0020*|\u0020*$/g, '')
         
         return this //.buildChildRules()
      },
      buildChildRules: function(store) {
         store = store || []
         if(!this.childRules || !this.childRules.length) return store
         
         var i = 0, n = this.childRules.length
         
         for(; i<n; i++) {
            store[i] = new germSheets.CSSRule(this.childRules[i], this.parentNode, this.ruleIndex + 1 + i)
            store[i].identifier = (".:" !== store[i].identifier.substring(0,2)) ? this.identifier + " " + store[i].identifier : this.identifier + store[i].identifier.substring(1)
            if(0 < store[i].childRules.length) {
               store[i].buildChildRules(store)
            }
         }
         return store
      },
      ruleIndex: Number.NaN,
      childRules: []
   })
   
   germSheets.CSSRule = function(args, node, ruleIndex) {
      this.childRules = []
      this.ruleIndex = 0
      this.containsExpressions = false
      this.process = function(vars, mixins, methods, expressions, callback) {
         var 
         siht = this,
         meth = null,
         mIdx = 0,
         r = this.cssText
         
         vars.forEach(function(obj) {
            r = obj.process(r)
         })
         mixins.forEach(function(obj) {
            r = obj.process(r)
         })
         // avoid excessive evals
         if(this.containsExpressions) {
            expressions.forEach(function(obj) {
               r = obj.process(r)
            })
         }
         
         // processing methods works a little different
         if(methods && methods.length) {
            meth = methods[mIdx]
            var 
            methProcessor = function(processed) {
               r = processed
               //gssInfo("methProcessor: " + r)
               meth = (methods.length > mIdx + 1) ? methods[++mIdx] : false
               if(!meth) {
                  siht.output = siht.identifier + " { " + r + " }\n"
                  callback(siht.output, siht.ruleIndex, siht)
               }else {
                  meth.process(r, methProcessor)
               }
            }
            meth.process(r, methProcessor)
         }else {
         
            this.output = r
            callback(r, this.ruleIndex, this)
         }
      }
      this.styleDeclarations = {}
      this.getStyleDeclaration = function(key) {
         if(key in this.styleDeclarations) return this.styleDeclarations[key]
         
         var siht = this, decl = "", rgx = new RegExp(regEsc(key) + ':[^;]*;', 'g')
         this.cssText.replace(rgx, function(m) {
            gssInfo("CSSRule::getStyleDeclaration\n" + m)
            var tmp = m.split(":")
            decl = tmp[1].substring(0, tmp[1].length-1)
            siht.styleDeclarations[tmp[0]] = decl.replace(/^\u0020*|\u0020*$/, '')
            return m
         })
         return decl
      }
      
      return this.__constructor(args, node, ruleIndex)
   }
   germSheets.CSSRule.prototype = cssPrototype
   
   /* ---- */
   
   /* prototype for style node objects
      gss style nodes collect the compiled data and
      pass it on to the compiler to create the final output
   */
   var 
   nodePrototype = {
      thru: "",
      tmp: "",
      vars: [],
      mixins: [],
      methods: [],
      skeletons: [],
      cssRule: [],
      compiledDOMNode: null,
      output:"",
      /*cssElement: [],
      cssId: [],*/
      processed: {
         errors: 2,
         skeletons: [],
         cssRule: []/*,
         cssId: [],
         cssClass: []*/
      },
      process: function() {
         //var processorName = "process_" + key
         //return (processorName in this) ? this[processorName](callback) : gssFatal("no processor available for: " + key)
      },
      __constructor: function(args) {
         this.thru = args.thru || ""
         this.vars = args.vars || []
         this.mixins = args.mixins || []
         this.methods = args.methods || []
         this.expressions = args.expressions || []
         this.skeletons = args.skeletons || []
         this.cssRules = args.cssRule || []
         
         /* can't do it inside a for in since
            it has no way of keeping the proper execution order */
         
         this.thru = this.thru.replace(/^\s*|\s*$/gm, '')
         
         this.__build("vars") //, this.vars)
         this.__build("mixins")//, this.mixins)
         this.__build("methods")//, this.methods)
         this.__build("expressions")//, this.expressions)
         this.__build("skeletons")//, this.skeletons)
         
         return this
      },
      __build: function(key) {
         var builderName = "build_" + key
         return (builderName in this) ? this[builderName]() : gssFatal("no build method found for: " + key)
      },
      checkList: {
         varsReady: false,
         mixinsReady: false,
         methodsReady: false,
         expressionsReady: false,
         skeletonsReady: false,
         cssReady: false
      },
      gssReady: function() {
         return this.checkList.varsReady && this.checkList.mixinsReady && this.checkList.methodsReady && this.checkList.expressionsReady && this.checkList.skeletonsReady
      },
      check: function(key) {
         this.checkList[key + "Ready"] = true
         if("css" !== key) {
            if(this.gssReady()) {
               this.__build("cssRules")
            }
         }else {
            gssLog("checklist complete")
         }
         return this
      }
   }
   
   germSheets.GermNode = function(gssData, gssSourceCode) {
      this.sourceCode = gssSourceCode || ""
      this._builtVars = []
      this.gssVars = {}
      this.build_vars = function() {
         if(this._builtVars && this._builtVars.length) return this._builtVars;
         if(this.vars && this.vars.length) {
            gssLog("start building variables")
            for(var i=0; i<this.vars.length; i++) {
               this._builtVars[i] = new germSheets.Variable(this.vars[i], this)
               this.gssVars[this._builtVars[i].identifier] = this._builtVars[i].cssText
               gssLog(this._builtVars[i])
            }
         }         
         return this.check("vars")
      }
      
      this._builtMixins = []
      this.gssMixins = {} // contains identifiers as property fields..like gssMixins['roundCorners'] => 'border-radius: $radius'
      this.build_mixins = function() {
         if(this._builtMixins && this._builtMixins.length) return this._builtMixins
         if(this.mixins && this.mixins.length) {
            gssLog("start building mixins")
            for(var i=0; i<this.mixins.length; i++) {
               this._builtMixins[i] = new germSheets.Mixin(this.mixins[i], this)
               this.gssMixins[this._builtMixins[i].identifier] = this._builtMixins[i].cssText
               gssLog(this._builtMixins[i])
            }
         }         
         return this.check("mixins")
      }
      
      this._builtMethods = []
      this.build_methods = function() {
         if(this._builtMethods && this._builtMethods.length) return this._builtMethods
         if(this.methods && this.methods.length) {
            gssLog("start building methods")
            for(var i=0; i<this.methods.length; i++) {
               this._builtMethods[i] = new germSheets.Method(this.methods[i], this)
               gssLog(this._builtMethods[i])
            }
         }         
         return this.check("methods")
      }
      
      this._builtExpressions = []
      this.build_expressions = function() {
         if(this._builtExpressions && this._builtExpressions.length) return this._builtExpressions
         if(this.expressions && this.expressions.length) {
            gssLog("start building expressions")
            for(var i=0; i < this.expressions.length; i++) {
               this._builtExpressions[i] = new germSheets.Expression(this.expressions[i], this)
               gssLog(this._builtExpressions[i])
            }
         }         
         return this.check("expressions")
      }
      
      this._builtSkeletons = []
      this.build_skeletons = function() {
         if(this._builtSkeletons && this._builtSkeletons.length) return this._builtSkeletons
         if(this.skeletons && this.skeletons.length) {
            gssLog("start building methods")
            for(var i=0; i<this.skeletons.length; i++) {
               this._builtSkeletons[i] = new germSheets.Skeleton(this.skeletons[i], this)
               gssLog(this._builtSkeletons[i])
            }
         }
         return this.check("skeletons")
      }
      
      
      this._builtCSSRules = []
      this.gssCSSRules = {}
      this.build_cssRules = function() {
         for(var i=0; i<this.cssRules.length; i++) {
            this._builtCSSRules[i] = new germSheets.CSSRule(this.cssRules[i], this, i)
            this.gssCSSRules[this._builtCSSRules[i].identifier] = this._builtCSSRules[i]
            gssLog("gssCssRule: ")
            gssLog(this.gssCSSRules[this._builtCSSRules[i].identifier])
         }
         
         var childRules = []
         this._builtCSSRules.forEach(function(obj) {
            if(0 < obj.childRules.length) {
              obj.buildChildRules(childRules) 
            }
         })
         
         
         if(0 < childRules.length) {
            for(i=0; i<childRules.length; i++) {
               var cIdx = childRules[i].ruleIndex
               this._builtCSSRules.splice(cIdx, 0, childRules[i])
               this.gssCSSRules[childRules[i].identifier] = childRules[i]
            }
         }
         
         
         if(this.cssRules.length !== this._builtCSSRules.length) {
            var obj, removed, prev = {}
            for(i = 0; i<this._builtCSSRules.length; i++) {
               obj = this._builtCSSRules[i]
               
               if(prev === obj || prev.identifier === obj.identifier) {
                  removed = this._builtCSSRules.splice(i--, 1)
                  gssLog("removed CSSRule: " + removed)
                  prev = null
                  removed = undefined
                  continue
               }
               prev = obj
            }
         }
                  
         return this.check("css")
      }
      
      this.completeCallback = function(output) { }
      this.setCompleteCallback = function(callback) {
         this.completeCallback = callback
      }
      this.onComplete = function(output) {
         // destruct...
         this.thru = undefined
         this.vars = undefined
         this.mixins = undefined
         this.methods = undefined
         this.expressions = undefined
         this.skeletons = undefined
         this.cssRules = undefined
         
         if("immediately" === germSheets.config.destructionPolicy) {
            this.gssVars = undefined
            this._builtVars = undefined
            this.gssMixins = undefined
            this._builtMixins = undefined
            this._builtMethods = undefined
            this._builtExpressions = undefined
            this._builtSkeletons = undefined
            this.gssCSSRules = undefined
            this._builtCSSRules = undefined
         }
         
         // output
         
         var
         outputNode = document.createElement("style")
         outputNode.type = "text/css"
         outputNode.title = "germsheets_0.0.2"
         outputNode.appendChild(document.createTextNode(output))
         document.getElementsByTagName("head")[0].appendChild(outputNode)
         
         this.compiledDOMNode = outputNode
         
         gssInfo("*** finished compiling ***")
         
         this.completeCallback(output + "\n/*** code processed in " + germSheets.stats.stopTimer() + " ***/\n")
      }
      
      this.process = function() {
         var siht = this
         this.processSkeletons(function(r) {
            siht.output = "/* Pass-Thru\n------------ */\n" + siht.thru + "\n" + r
            siht.processCSSRules(function(r2) {
               siht.output += "\n/* CSS\n---------- */\n" + r2
               siht.onComplete(siht.output)
            })
            // resume in for onComplete
         })
      }
      
      this.processSkeletons = function(callback) {
         
         if(!this._builtSkeletons || !this._builtSkeletons.length) return callback("")
         
         var siht = this
         
         for(var i=0; i<this._builtSkeletons.length; i++) {
            var skel = this._builtSkeletons[i], completed = 0
            skel.process(function(processed) {
               siht.processed.skeletons[completed] = processed
               if(siht._builtSkeletons.length <= ++completed) {
                  gssInfo("processSkeletons complete callback:")
                  callback("\n/* Skeletons\n---------------------- */\n" + siht.processed.skeletons.join("\n"))
                  
               }
            })
         }
         
      }
      
      this.processCSSRules = function(callback) {
         
         if(!this._builtCSSRules || !this._builtCSSRules.length) return callback("")
         
         var cssRule, siht = this, completed = 0
         gssLog("processing css rules")
         
         for(var i=0; i<this._builtCSSRules.length; i++) {
            cssRule = this._builtCSSRules[i]
            cssRule.process(this._builtVars, this._builtMixins, this._builtMethods, this._builtExpressions,
               function(processed, idx) {
                  gssInfo("cssrule callback: " + completed)
                  siht.processed.cssRule[completed] = processed // TODO fix ruleIndex
                  if(siht._builtCSSRules.length <= ++completed) {
                     gssInfo("process_cssRule done")
                     callback("\n\n" + siht.processed.cssRule.join("\n\n") + "\n\n")
                  }
               }
            )
         }
         
      }
      
      this.addChildOf = function(parent, child) {
         if("string" === typeof(child) || Array.isArray(child)) {
            var 
            cIdx = (parent.ruleIndex || this._builtCSSRules.length - 1) + 1, // parent.ruleIndex could be undefined...
            childRule = new germSheets.CSSRule(child, this, cIdx)
            
            this._builtCSSRules.splice(cIdx, 0, childRule)
            //this.processed.cssRule.splice(cIdx, 0, childRule.process(this._builtVars, this._builtMixins, this._builtMethods))
            //gssLog("@GermNode::addChildOf " + parent.identifier + " at idx: " + cIdx)
            //gssLog(this._builtCSSRules)
            return childRule
         }
         return null
      }
      
      this.addChildrenOf = function(parent, children) {
         for(var i=0; i<children.length; i++) {
            this.addChildOf(parent, children[i])
         }
         
         //gssLog(this._builtCSSRules)
         return this._builtCSSRules
      }
      
      /* merged into process_cssRule
      this.process_cssId = function() {
         for(var i=0; i<this.cssId.length; i++) {
            var cssId = new germSheets.CSSId(this.cssId[i], this)
            this.processed.cssId[i] = cssId.process(this._builtVars, this._builtMixins, this._builtMethods)
         }
         return "\n\n" + this.processed.cssId.join("\n\n") + "\n\n"
      }
      this.process_cssClass = function() {
         for(var i=0; i<this.cssClass.length; i++) {
            var cssClass = new germSheets.CSSClass(this.cssClass[i], this)
            this.processed.cssClass[i] = cssClass.process(this._builtVars, this._builtMixins, this._builtMethods)
         }
         return "\n\n" + this.processed.cssClass.join("\n\n") + "\n\n"
      }*/
      this.getValue = function(key) {
         if(token.VAR === key.charAt(0)) {
            key = key.substring(1)
         }
         return (key in this.gssVars) ? this.gssVars[key] : (key in this.gssMixins) ? this.gssMixins[key] : null
      }
      this.getCSSRule = function(key) {
         //gssLog("getCSSRule: " + key)
         
         if(key in this.gssCSSRules) { 
            return this.gssCSSRules[key] 
         }
         var r = null, i = 0, n = this._builtCSSRules.length
         for(; i < n; i++) {
            if(key === this._builtCSSRules[i].identifier) {
               r = this._builtCSSRules[i]
               break
            }
         }
         
         return r
      }
      this.getVariable = function(key) {
         var r = null, i = 0, n = this._builtVars.length
         if(token.VAR === key.charAt(0)) {
            key = key.substring(1)
         }
         for(; i < n; i++) {
            if(key === this._builtVars[i].identifier) {
               r = this._builtVars[i]
               break
            }
         }
         return r
      }
      
      return this.__constructor(gssData)
   }
   germSheets.GermNode.prototype = nodePrototype
   
   var 
   xmlser = new XMLSerializer()
   germSheets.serialize = function(node) {
      return xmlser.serializeToString(node)
   }
   
   germSheets.run = function(gssNode, isDOMNode) {
      var 
      gssCode = isDOMNode ? germSheets.serialize(gssNode) : gssNode, // regex replaces opening style tags, optional xml comment tokens and <?gss processing instructions
      parser = new germSheets.Parser(gssCode.replace(/^\s*(?:<style[^>]*>|[\r\n\s<\-!\[CDAT\?gss])*|(?:[\r\n\s\?>\-\]]|<\/style>)*$/mg, ""))
      
      gssInfo("** start parser **")
      parser.parse()
      gssInfo("*** parser completed ***")
      
      compiler = new germSheets.Compiler(parser.unstore(), gssCode)
      
      isDOMNode && gssNode.remove()
      
      gssInfo("** start compiling **")
      compiler.compile(function(compiledCss) {
         gssInfo("callback@germSheets::run")
         gssLog(compiledCss)
         
         var excessHeadNodes = document.querySelectorAll('style[type="text/x-gss"]')
         
         foreach(excessHeadNodes, function(itm) {
            itm.remove()
            gssLog("removed DOM node: ", itm)
         })
         
      })
      
   }
   
   germSheets.init = function(src) {
      
      germSheets.stats.startTimer()
      
      src = src ? [src] : document.querySelectorAll('style[type="text/x-gss"]')
      
      foreach(src, function(node) {
         if("[object String]" === Object.prototype.toString.call(node)) {
            // serialized node or url?
            if(/^(?:<style type="text\/x-gss">|(?:<!--)?<\?gss)/im.test(node)) {
               // looks like a node string or code wrapped in <?gss
               gssInfo("started running germSheets " + new Date().toISOString())
               germSheets.run(node, false)
            }else if(/\.gss$/i.test(node)){
               // looks like a .gss file extension..so it might be a url
               germSheets.httpRequest(node, function(response) {
                  gssInfo("started running germSheets " + new Date().toISOString() + "\nsource file: " + node)
                  germSheets.run(response, false)
               })
            }
         }else {
            gssInfo("started running germSheets " + new Date().toISOString())
            germSheets.run(node, true)
         }
      })
   }
   
})(window, window.document, window.germSheets)