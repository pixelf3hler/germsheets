/*! germsheets.core_0.0.2.js 
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
      echo("pausing...")
      while(now - start < n) {
         now = +new Date
      }
      echo("paused for: " + n + "ms")
      return n
   }
   
   /* prototype for user defined
      subroutines that replace
      content in style declarations 
      like variables or mixins
   */
   germSheets.gssPrototype = {
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
         var regex = new RegExp(regEsc(this.token + this.identifier + token.END_VAR), "g")
         this.output = input.replace(regex, this.cssText)
         
         return this.output
      }
      
      return this.__constructor(args, node)
      
   }
   germSheets.Variable.prototype = germSheets.gssPrototype
   
   
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
   germSheets.Mixin.prototype = germSheets.gssPrototype
   
   
   germSheets.Method = function(args, node) {
      this.rawArguments = ""
      this.argumentValues = []
      this.js = null
      // <-brighten($green,25);
      this.build = function() {
         
         echo("new Method")
         
         var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020*/g, ''))
         
         while(false !== (tkn = tknzr.nextToken())) {
            ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
            
            if(token.METH === tkn && token.METH2 === ntkn) {
               if("open" === mode) {
                  mode = "token"
                  //echo("switch mode to: " + mode + " at token: " + tkn)
               }
            }
            
            if(token.PAR_OPEN === tkn) {
               if("open" === mode) {
                  mode = "args"
                  //echo("switch mode to: " + mode + " at token: " + tkn)
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
                  //echo("switch mode to: " + mode + " at token: " + tkn)
               }
               this.token += tkn
               continue
            }
            
            if("id" === mode) {
               
               if(token.PAR_OPEN === ntkn) {
                  mode = "open"
                  //echo("switch mode to: " + mode + " at token: " + tkn)
               }
               this.identifier += tkn
               continue
            }
            
            if("args" === mode) {
               this.rawArguments += tkn
               if(token.PAR_CLOSE === ntkn) {
                  mode = "open"
                  //echo("switch mode to: " + mode + " at token: " + tkn)
               }
               continue
            }  
         }
         echo("build complete: " + this.identifier)
         //echo(this)
         
         return this
      }
      
      this.process = function(input, callback) {
         echo("call to process()")
         // only do all that crap if necessary..
         if(-1 === input.indexOf(this.token + this.identifier)) {
            callback(input)
            return
         }
         var siht = this
         /* defined in germsheets.http */
         germSheets.getFunction(this.identifier, function(fn) {
            echo("load complete: " + fn.toString())
            var r = siht._process(input, fn)
            callback(r)
         })
      }
      
      this._process = function(input, processor) {
         echo("call to _process()")
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
   germSheets.Method.prototype = germSheets.gssPrototype
   
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
      
      this.process = function(input, callback) {
         var siht = this
         germSheets.getFunction("skeleton_" + this.identifier, function(fn) {
            var r = siht._process(input, fn)
            callback(r)
         })
      }
      
      this._process = function(input, processor) {
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
   germSheets.Skeleton.prototype = germSheets.gssPrototype
   
   /* css rules
   */
   germSheets.cssPrototype = collapse(germSheets.gssPrototype, {
      __constructor: function(args, node, ruleIndex) { 
         this.gssText = Array.isArray(args) ? args.join("") : args
         this.parentNode = node
         this.ruleIndex = ruleIndex
         return this.build()
      },
      process: function(vars, mixins, methods) {},
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
      build: function() {
         var 
         tkn, ntkn, crIdx = 0, qntm = "", qntmMode = "?",
         mode = "id", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020{2,}|\u21B5*/g, ''))
         
         while(false !== (tkn = tknzr.nextToken())) {
            ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
            
            if(token.CURLY_OPEN === tkn) {
               if("open" === mode) {
                  mode = "css"
                  echo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
            }
            
            if(token.CSSCLASS === tkn || token.CSSID === tkn || token.INLINE_THRU === tkn) {
               if("css" === mode) {
                  mode = "nested"
                  this.childRules[crIdx] = ""
                  // exclude first backtick
                  if(token.INLINE_THRU !== tkn) {
                     this.childRules[crIdx] += tkn
                  }
                  echo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
            }
            
            if(token.CSSEL.test(tkn)) {
               if("css" === mode) {
                  mode = "quantum"
                  qntm = ""
                  echo("switch mode to: " + mode + " at token: " + tkn)
               }
            }
            
            /*if(token.METH === tkn && token.METH2 === ntkn) 
                  methods and mixins are already stored elsewhere..don't
                  bother with them here */
            
            if("id" === mode) { 
               if(token.CURLY_OPEN === ntkn) {
                  mode = "open"
                  echo("switch mode to: " + mode + " at token: " + tkn)
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
                  echo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
               if(token.CURLY_OPEN === tkn) {
                  this.childRules[++crIdx] = qntm.slice()
                  qntm = ""
                  mode = "nested"
                  echo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
               
            }
            
            if("nested" === mode) {
               if(token.INLINE_THRU === tkn) {
                  mode = "css"
                  crIdx++
                  echo("switch mode to: " + mode + " at token: " + tkn)
                  continue
               }
               if(token.CURLY_CLOSE === tkn && token.BANG === ntkn) {
                  if(tknzr.index+1 < tknzr.tokens.length && token.BANG !== tknzr.tokens[tknzr.index+1]) {
                     mode = "css"
                     this.childRules[crIdx++] += tkn
                     echo("switch mode to: " + mode + " at token: " + tkn)
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
                  echo("switch mode to: " + mode + " at token: " + tkn)
                  break
               }
               this.cssText += tkn
               continue
            }  
         }
         
         // TODO: adjusts parsing so that the next lines become unnecessary
         this.cssText = this.cssText.replace(/^[\u0020\u21B5]*|[\u21B5\u0020\!]*$/g, '')
         this.identifier = this.identifier.replace(/^\u0020*|\u0020*$/g, '')
         
         return this //.buildChildRules()
      },
      buildChildRules: function(store) {
         if(!this.childRules || !this.childRules.length) return store || []
         
         store = store || []
         var i = 0, n = this.childRules.length
         
         for(; i<n; i++) {
            store[i] = new germSheets.CSSRule(this.childRules[i], this.parentNode, this.ruleIndex + i + 1)
            store[i].identifier = this.identifier + " " + store[i].identifier
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
      this.process = function(vars, mixins, methods, callback) {
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
         // processing methods works a little different
         if(methods && methods.length) {
            meth = methods[mIdx]
            var 
            methProcessor = function(processed) {
               r = processed
               //echo("methProcessor: " + r)
               meth = (methods.length > mIdx + 1) ? methods[++mIdx] : false
               if(!meth) {
                  siht.output = siht.identifier + " { " + r + " }\n"
                  callback(siht.output, siht.ruleIndex)
               }else {
                  meth.process(r, methProcessor)
               }
            }
            meth.process(r, methProcessor)
         }else {
         
            this.output = r
            callback(r, this.ruleIndex)
         }
      }
      return this.__constructor(args, node, ruleIndex)
   }
   germSheets.CSSRule.prototype = germSheets.cssPrototype
   
   /* merged into CSSRule
   germSheets.CSSId = function(){}
   germSheets.CSSId.prototype = germSheets.cssPrototype
   
   germSheets.CSSClass = function(){}
   germSheets.CSSClass.prototype = germSheets.cssPrototype*/
   
   /* prototype for style node objects
      gss style nodes collect the compiled data and
      pass it on to the compiler to create the final output
   */
   germSheets.nodePrototype = {
      thru: "",
      tmp: "",
      vars: [],
      mixins: [],
      methods: [],
      skeletons: [],
      cssRule: [],
      /*cssElement: [],
      cssId: [],*/
      processed: {
         skeletons: [],
         cssRule: []/*,
         cssId: [],
         cssClass: []*/
      },
      process: function(key, callback) {
         var processorName = "process_" + key
         return (processorName in this) ? this[processorName](callback) : germSheets.error("no processor available for: " + key)
      },
      __constructor: function(args) {
         this.thru = args.thru || ""
         this.vars = args.vars || []
         this.mixins = args.mixins || []
         this.methods = args.methods || []
         this.skeletons = args.skeletons || []
         this.cssRule = args.cssRule || []
         
         /* can't do it inside a for in since
            it has no way of keeping the proper execution order */
         
         this.thru = this.thru.replace(/^\s*|\s*$/gm, '')
         
         this.__build("vars", this.vars)
         this.__build("mixins", this.mixins)
         this.__build("methods", this.methods)
         
         return this
      },
      __build: function(key, data) {
         var builderName = "build_" + key
         return (builderName in this) ? this[builderName](data) : germSheets.error("no build method found for: " + key)
      },
      checkList: {
         varsReady: false,
         mixinsReady: false,
         methodsReady: false,
         cssReady: false
      },
      check: function(key) {
         this.checkList[key + "Ready"] = true
         if("css" !== key) {
            if(this.checkList.varsReady && this.checkList.mixinsReady && this.checkList.methodsReady) {
               this.__build("cssRule")
            }
         }else {
            echo("checklist complete")
         }
         return this
      }
   }
   
   germSheets.GermNode = function(DOMNode, gssData) {
      this.DOMNode = DOMNode
      this._builtVars = []
      this.gssVars = {}
      this.build_vars = function() {
         if(this._builtVars && this._builtVars.length) return this._builtVars;
         echo("start building variables")
         for(var i=0; i<this.vars.length; i++) {
            this._builtVars[i] = new germSheets.Variable(this.vars[i], this)
            this.gssVars[this._builtVars[i].identifier] = this._builtVars[i].cssText
            echo(this._builtVars[i])
         }
         return this.check("vars")
      }
      
      this._builtMixins = []
      this.gssMixins = {} // contains identifiers as property fields..like gssMixins['roundCorners'] => 'border-radius: $radius'
      this.build_mixins = function() {
         if(this._builtMixins && this._builtMixins.length) return this._builtMixins
         echo("start building mixins")
         for(var i=0; i<this.mixins.length; i++) {
            this._builtMixins[i] = new germSheets.Mixin(this.mixins[i], this)
            this.gssMixins[this._builtMixins[i].identifier] = this._builtMixins[i].cssText
            echo(this._builtMixins[i])
         }
         return this.check("mixins")
      }
      
      this._builtMethods = []
      this.build_methods = function() {
         if(this._builtMethods && this._builtMethods.length) return this._builtMethods
         echo("start building methods")
         for(var i=0; i<this.methods.length; i++) {
            this._builtMethods[i] = new germSheets.Method(this.methods[i], this)
            echo(this._builtMethods[i])
         }
         return this.check("methods")
      }
      
      this._builtSkeletons = []
      this.build_skeletons = function() {
         if(this._builtSkeletons && this._builtSkeletons.length) return this._builtSkeletons
         echo("start building methods")
         for(var i=0; i<this.skeletons.length; i++) {
            this._builtSkeletons[i] = new germSheets.Skeleton(this.skeletons[i], this)
            echo(this._builtSkeletons[i])
         }
         return this.check("skeletons")
      }
      
      this._builtCSSRules = []
      this.build_cssRule = function() {
         for(var i=0; i<this.cssRule.length; i++) {
            this._builtCSSRules[i] = new germSheets.CSSRule(this.cssRule[i], this, i)
            //echo(this._builtCSSRules[i])
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
            }
         }
         
         echo("****\n_builtCSSRules")
         this._builtCSSRules.forEach(function(obj) {
            echo(obj)
         })
         
         return this.check("css")
      }
      
      this.completeCallback = null
      this.setCompleteCallback = function(callback) {
         this.completeCallback = callback
      }
      
      this.process_skeletons = function() {
         var siht = this
         for(var i=0; i<this._builtSkeletons.length; i++) {
            var skel = this._builtSkeletons[i]
            skel.process(function(processed, idx) {
               siht.processed.skeletons[idx] = processed
               if(siht._builtSkeletons.length <= idx-1) {
                  echo("process_Skeletons done")
                  siht.completeCallback("\n\n" + this.processed.skeletons.join("\n\n") + "\n\n")
               }
            })
         }
      }
      
      this.process_cssRule = function() {
         var cssRule, siht = this, completed = 0
         
         echo("@process_cssRule")
         for(var i=0; i<this._builtCSSRules.length; i++) {
            cssRule = this._builtCSSRules[i]
            cssRule.process(this._builtVars, this._builtMixins, this._builtMethods, 
               function(processed, idx) {
                  echo("cssrule callback: " + completed)
                  siht.processed.cssRule[completed] = processed // TODO fix ruleIndex
                  if(siht._builtCSSRules.length <= ++completed) {
                     echo("process_cssRule done")
                     siht.completeCallback("\n\n" + siht.processed.cssRule.join("\n\n") + "\n\n")
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
            //echo("@GermNode::addChildOf " + parent.identifier + " at idx: " + cIdx)
            //echo(this._builtCSSRules)
            return childRule
         }
         return null
      }
      
      this.addChildrenOf = function(parent, children) {
         for(var i=0; i<children.length; i++) {
            this.addChildOf(parent, children[i])
         }
         
         //echo(this._builtCSSRules)
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
   germSheets.GermNode.prototype = germSheets.nodePrototype
   
   germSheets.serialize = function(node) {
      return new XMLSerializer().serializeToString(node)
   }
   
   germSheets.run = function(gssNode) {
      var 
      outputNode,
      gssCode = germSheets.serialize(gssNode),
      parser = new germSheets.Parser(gssCode.replace(/^<style type="text\/x-gss">|<\/style>$/g, ""))
      try {
         parser.parse()
      }catch(err) {
         echo(err)
         return
      }
      compiler = new germSheets.Compiler(gssNode, parser.unstore())
      
      gssNode.remove()
      
      echo("start compiling")
      compiler.compile(function(compiledCss) {
         echo("callback@germSheets::run")
         echo(compiledCss)
         outputNode = document.createElement("style")
         outputNode.type = "text/css"
         outputNode.title = "germsheets_0.0.2"
         outputNode.appendChild(document.createTextNode(compiledCss))
         document.getElementsByTagName("head")[0].appendChild(outputNode)
         echo("germSheets compile complete")
      })
      
   }
   
   window.gsCoreDebug = function(node) {
      germSheets.run(node)
   }
   
})(window, window.document, window.germSheets)