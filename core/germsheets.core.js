/** 
 *  @file germSheets core objects
 *  @version 1.0.2
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author <max@pixelf3hler.de>
 *  @license license.txt
 *  The MIT License
 */
(function(window, undefined) {
   
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
   var 
   germSheets = window.germSheets || {},
   token = germSheets.token
   
   /* escapes strings for use in regexp patterns
   */
   function regEsc(str) {
      return str.replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-]', 'g'), '\\$&')
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
   
   
   /** @property {function} pause - pauses execution for n/1000 seconds
    *  @param {number} n - the sleeping time in milliseconds
    *  @deprecated
   ------*/
   /*germSheets.pause = function(n) {
      var 
      start = +new Date,
      now = start
      germSheets.config.enableLogging && console.log("pausing...")
      while(now - start < n) {
         now = +new Date
      }
      germSheets.config.enableLogging && console.log("paused for: " + n + "ms")
      return n
   }*/
   
   
   
   /* Interface
   ------------------*/
   germSheets.Element = function(args, node) {
      this.cssText = ""
      this.gssText = Array.isArray(args) ? args.join("") : args
      this.output = ""
      this.identifier = ""
      this.token = ""
      this.parentNode = node
   }
   
   
   /* Variables
   -----------------------*/
   germSheets.Variable = function(args, node) {
      germSheets.Element.call(this, args || [], node || null)
      
      this.isExpression = false
      this.inExpression = false
      this.isMethod = false
      
      return this.build()   
   }
   
   //germSheets.Variable.prototype = Object.create(gssCore)
   germSheets.Variable.prototype.build = function() {         
      var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020/g, ''))
      while(false !== (tkn = tknzr.nextToken())) {
         ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
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
            // add support for storing methods / expressions
            if(token.LT === tkn) {
               if(token.MINUS === ntkn) {
                  this.isMethod = true
                  //germSheets.config.enableLogging && console.log("Variable::this.isMethod", this.isMethod)
               }else if(token.PAR_OPEN === ntkn) {
                  this.isExpression = true
                  //germSheets.config.enableLogging && console.log("Variable::this.isExpression", this.isExpression)
               }else if(token.PLUS === ntkn) {
                  throw new TypeError("Ribs can't be assigned to variables")
               }
            }
             
            /*if(token.SEMICOLON === tkn) {
               this.dirty = false
            }*/
         }
      }
      
      /* variables are the first things that are built
         so i guess that GermNode::getObjects fails at this point
      */
      if(this.isExpression) {
         var ref = this.parentNode.getObjects("Expressions", [this.cssText])
         if(!ref || !ref.length) {
            ref = this.parentNode.newObject("Expression", this.cssText)
         }else {
            ref = ref[0]
         }
         this.cssText = ref.process(this.cssText)
         //germSheets.config.enableLogging && console.log("VariableExpression::cssText", this.identifier, this.cssText)
      }
      
      if(this.isMethod) {
         ref = this.parentNode.getObjects("Methods", [this.cssText])
         if(!ref || !ref.length) {
            ref = this.parentNode.newObject("Method", this.cssText)
         }else {
            ref = ref[0]
         }
         var siht = this
         ref.process(this.cssText, function(refOut) {
            siht.cssText = refOut
            //germSheets.config.enableLogging && console.log("VariableMethod::cssText", this.identifier, this.cssText)
         })
      }
      
   }
   
   germSheets.Variable.prototype.getFullIdentifier = function() {
      return this.token + this.identifier
   }
   
   germSheets.Variable.prototype.process = function(input) {
      var regex = new RegExp(regEsc(this.getFullIdentifier()) + ';*', 'g')
      // remove semicolon if inside an expression
      if(this.inExpression && token.SEMICOLON === this.cssText.charAt(this.cssText.length-1)) {
         //this.cssText = this.cssText.substring(0, this.cssText.length-1)
         this.output = input.replace(regex, this.cssText.substring(0, this.cssText.length-1))
      }else {
         this.output = input.replace(regex, this.cssText)
      }
      return this.output
   }
   
   /* Mixins
   -------------*/
   germSheets.Mixin = function(args, node) {
      germSheets.Element.call(this, args || [], node || null)
      
      this.argumentIds = ""
      this.argumentValues = ""
      this.rawCssText = ""
      
      return this.build()
   }
   
   germSheets.Mixin.prototype.build = function() {
      var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u21B5/g, ''))
      while(false !== (tkn = tknzr.nextToken())) {
         ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
         if(token.TILDE === tkn) {
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
      
      return this
   }
   
   germSheets.Mixin.prototype.getFullIdentifier = function() {
      return this.token + this.identifier
   }
   
   germSheets.Mixin.prototype.process = function(input) {
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
   
   
   /* Methods
   --------------*/
   germSheets.Method = function(args, node) {
      germSheets.Element.call(this, args || [], node || null)
      
      this.rawArguments = ""
      this.argumentValues = []
      this.js = null
      
      return this.build() //gssPrototype.__constructor.call(this, args, node)
   }
   
   germSheets.Method.prototype.build = function() {
      var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020*/g, ''))
      
      while(false !== (tkn = tknzr.nextToken())) {
         ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
         
         if(token.LT === tkn && token.MINUS === ntkn) {
            if("open" === mode) {
               mode = "token"
               //germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            }
         }
         
         if(token.PAR_OPEN === tkn) {
            if("open" === mode) {
               mode = "args"
               //germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
               continue
            }
         }
         
         if(token.SEMICOLON === tkn || token.NUL === ntkn) {
            if("open" === mode) {
               //this.dirty = false
               break
            }
         }
         
         if("token" === mode) {
            
            if(token.MINUS === tkn) {
               mode = "id"
               //germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            }
            this.token += tkn
            continue
         }
         
         if("id" === mode) {
            
            if(token.PAR_OPEN === ntkn) {
               mode = "open"
               //germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            }
            this.identifier += tkn
            continue
         }
         
         if("args" === mode) {
            this.rawArguments += tkn
            if(token.PAR_CLOSE === ntkn) {
               mode = "open"
               //germSheets.config.enableLogging && console.log("switch mode to: " + mode + " at token: " + tkn)
            }
            continue
         }  
      }
      
      germSheets.getFunction(this.identifier, function(fn) {
         germSheets.config.enableLogging && console.log("build complete: %s", fn.toString())
      })
   }
   
   germSheets.Method.prototype.getFullIdentifier = function() {
      return this.token + this.identifier
   }
   
   germSheets.Method.prototype._process = function(input, processor) {
      //germSheets.config.enableLogging && console.log("call to _process()")
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
      
      germSheets.config.enableLogging && console.log("Method %o processed " + input + " to " + this.output, this)
      
      return this.output
   }
   
   germSheets.Method.prototype.process = function(input, callback) {
      //germSheets.config.enableLogging && console.log("call to process(" + input + ")")
      // only do all that crap if necessary..
      if(-1 === input.indexOf(this.getFullIdentifier())) {
         callback(input)
         return
      }
      var siht = this
      /* defined in germsheets.http */
      germSheets.getFunction(this.identifier, function(fn) {
         //germSheets.config.enableLogging && console.log("load complete: " + fn.toString())
         var r = siht._process(input, fn)
         callback(r)
      })
   }
   
   
   /* Skeletons
   -----------------*/
   germSheets.Skeleton = function(args, node) {
      // +unroll(test,class,2,6,$iteratorBlock);
      germSheets.Element.call(this, args || [], node || null)
      this.rawArguments = ""
      this.argumentValues = []
      
      return this.build()
   }
   
   germSheets.Skeleton.prototype.build = function() {
      var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020{2,}/g, ''))
      while(false !== (tkn = tknzr.nextToken())) {
         ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
         
         if(token.PLUS === tkn) {
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
         
         if(token.SEMICOLON === tkn || token.NUL === ntkn) {
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
      // remove inline-thru toggles
      this.rawArguments = this.rawArguments.replace(/`/g, '')
      
      return this
   }
   
   germSheets.Skeleton.prototype.getFullIdentifier = function() {
      return this.token + this.identifier
   }
   
   germSheets.Skeleton.prototype._process = function(processor) {
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
      //germSheets.config.enableLogging && console.log("skeleton::process: " + varInputs[i])
         this.argumentValues.push(requiredVars[i].process(varInputs[i]))
      }
      // call method on germSheets.fn
      this.output = processor.apply(this, this.argumentValues)
      
      return this.output
   }
   
   germSheets.Skeleton.prototype.process = function(callback) {
      var siht = this
      germSheets.getFunction("skeleton_" + this.identifier, function(fn) {
         var r = siht._process(fn)
         callback(r)
      })
   }
   
   
   
   /* Ribs
   -----------------*/
   germSheets.Rib = function(args, node) {
      germSheets.Element.call(this, args || [], node || null)
      
      this.rawArguments = ""
      this.argumentValues = []
      
      this.build()
   }
   
   germSheets.Rib.prototype.build = function() {
      var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText)
      // <+ribId(ribarg1,ribarg2 ...);
      while(false !== (tkn = tknzr.nextToken())) {
         ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
         
         if(token.LT === tkn && token.PLUS === ntkn) {
            if("open" === mode) {
               mode = "token"
            }
         }
         
         if(token.PAR_OPEN === tkn) {
            if("open" === mode) {
               mode = "args"
               // skip parenthesis
               continue
            }
         }
         
         if("token" === mode) {
            this.token += tkn
            if(token.PLUS === tkn) {
               mode = "id"
            }
            continue
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
            if(token.PAR_OPEN === tkn && token.SEMICOLON === ntkn) {
               mode = "open"
               // remove last parenthesis
               this.rawArguments = this.rawArguments.substring(0, this.rawArguments.length-1)
               // done
               break
            }
         }
      }
      // fetch function code immediately to facilitate synchronization when building css declarations
      germSheets.getFunction("rib_" + this.identifier)
   }
   
   germSheets.Rib.prototype.getFullIdentifier = function() {
      return this.token + this.identifier
   }
   
   germSheets.Rib.prototype._process = function(processor) {
      var // get arguments
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
      
      i = 0
      n = requiredVars.length
      for(; i < n; i++) {
         this.argumentValues.push(requiredVars[i].process(varInputs[i]))
      }
      
      this.output = processor.apply(this, this.argumentValues)
      
      return this.output
   }
   
   germSheets.Rib.prototype.process = function(callback) {
      var siht = this
      germSheets.getFunction("rib_" + this.identifier, function(fn) {
         var r = siht._process(fn)
         callback(r)
      })
   }
   
   
   
   
   /* Inline Expressions
   ----------------------*/
   germSheets.Expression = function(args, node) {
      germSheets.Element.call(this, args || [], node || null)
      /* complex: <(.rect[width] + .square[height] * 0.566)px;
         simple: <(1 + Math.random())em; */ 
      this.cssUnit = ""
      this.rawExpression = ""
      this.evaledExpression = ""
      this.cleanExpression = ""
      this.cssReferences = []
      this.gssVarReferences = []
      this.hasReferences = false
      this._builtReferences = []
      
      return this.build() //gssPrototype.__constructor.call(this, args, node)
   }
   germSheets.Expression.prototype.getFullIdentifier = function() {
      return this.gssText.replace(/(?:\(.*\))*;$/g, '')
   }
   germSheets.Expression.prototype.build = function() {
      var tkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssText.replace(/\u0020*/g, ''))
      while(false !== (tkn = tknzr.nextToken())) {
         ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
         
         if(token.LT === tkn && token.PAR_OPEN === ntkn) { 
            if("open" === mode) {
               mode = "token"
            }
         }
         
         if(token.SQUARE_OPEN === tkn || token.VAR === tkn) {
            if("exp" === mode) {
               this.hasReferences = true
            }
         }
         
         if("token" === mode) {
            this.token += tkn
            if(token.PAR_OPEN === tkn) {
               mode = "exp"
            }/*else {
               this.token += tkn
            }*/
            continue
         }
         
         if("exp" === mode) {
            this.rawExpression += tkn
            
            if(token.SEMICOLON === tkn) {
               this.dirty = false
               mode = "open"
               break
            }
         }
         
      }
      var siht = this
      this.rawExpression = this.rawExpression.replace(/\)?(?:em|px|\%|in|mm|cm|ext|pt|pc)*;$/g, function(m) {
         m = m.replace(/^\s*\)|;\s*$/g, '')
         siht.cssUnit = m
         return ""
      })
      
      if(this.hasReferences) {
         tknzr.index = 0
         tknzr.tokens.length = 0
         tknzr.tokens = this.rawExpression.split("")
         mode = "open"
         var refIdx = 0, varIdx = 0
         while(false !== (tkn = tknzr.nextToken())) {
            ntkn = tknzr.index < tknzr.tokens.length ? tknzr.tokens[tknzr.index] : token.NUL
            
            if(token.DOT === tkn || token.HASH === tkn || token.CSSEL.test(tkn)) {
               if("open" === mode) {
                  mode = "cssref"
                  this.cssReferences[refIdx] = tkn
                  continue
               }
            }
            
            if(token.VAR === tkn) {
               if("open" === mode) {
                  mode = "gssref"
                  this.gssVarReferences[varIdx] = tkn
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
            
            if("gssref" === mode) {
               if(token.OP.test(tkn) || token.SEMICOLON === tkn) {
                  mode = "open"
                  varIdx++
               }else {
                  this.gssVarReferences[varIdx] += tkn
               }
            }
         }
         
         if(this.cssReferences && this.cssReferences.length) {
            this.buildCSSReferences()
         }
         
      }
      germSheets.config.enableLogging && console.log("new Expression: %o", this)
      germSheets.config.enableLogging && console.log("varRefs: %o", this.gssVarReferences)
      return this
   }
   
   germSheets.Expression.prototype.buildCSSReferences = function() {
      var i = 0, n = this.cssReferences.length
      for(; i < n; i++) {
         this._builtReferences[i] = new germSheets.CSSReference(this.cssReferences[i], this)
      }
      return this._builtReferences
   }
   
   germSheets.Expression.prototype.process = function(input) {
      input = input || ""
      this.cleanExpression = this.rawExpression
      var siht = this
      
      if(this.gssVarReferences && this.gssVarReferences.length) {
         this.gssVarReferences.forEach(function(v, i) {
            var gssVar = siht.parentNode.getVariable(v)
            gssVar.inExpression = true
            germSheets.config.enableLogging && console.log("processing %o in %o", gssVar, this)
            siht.cleanExpression = gssVar.process(siht.cleanExpression)
         })
      }
      
      if(this._builtReferences && this._builtReferences.length) {
         this._builtReferences.forEach(function(ref) {
            siht.cleanExpression = ref.process(siht.cleanExpression)
         })
         // if we have refs to css rules, we're also likely to have css units
         // and that would cause errors during evaluation
         this.cleanExpression = this.cleanExpression.replace(/^\u0020|em|px|\%|in|mm|cm|ext|pt|pc|;|\u0020$/g, '')
      }
      
      germSheets.config.enableLogging && console.log("germSheets.Expression trying to eval: " + this.cleanExpression)
      
      try {
         this.evaledExpression = eval("(" + this.cleanExpression + ")")
      }catch(er) {
         console.error("error evaluating: " + this.cleanExpression + "\nerror: " + er)
         try {
            var fn = Function("return " + this.cleanExpression)
            this.evaledExpression = fn()
         }catch(err) {
            console.error("error using function cast: " + err)
            this.evaledExpression = this.cleanExpression
         }
      }
      this.cssText = this.evaledExpression + this.cssUnit + token.SEMICOLON
      this.output = input ? input.replace(this.gssText, this.cssText) : this.cssText
      
      return this.output
   }
   
   
   /* represents a reference to a css declaration
   -------------*/
   germSheets.CSSReference = function(args, expression) {
      this.expression = expression
      this.rootNode = expression.parentNode
      this.cssText = ""
      this.gssText = ""
      this.reference = null
      
      return this.build(args, expression)
   }
   germSheets.CSSReference.prototype.build = function(str, expression) {
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
   germSheets.CSSReference.prototype.process = function(input) {
      input = input || ""
      this.reference = this.rootNode.getCSSRule(this.referenceId)
      this.cssText = this.reference.getStyle(this.referenceProperty)
      
      return input ? input.replace(this.gssText, this.cssText) : this.cssText
   }
   
/* ------  */
 
/* css declarations
 ----------------- */
   germSheets.CSSDeclaration = function(args, rule) {

      this.gssText = (Array.isArray(args)) ? args.join('') : args
      this.cssText = ""
      this.parentRule = rule
      this.rootNode = rule.parentNode
      this.varRefs = []
      this.methodRefs = []
      this.mixinRefs = []
      this.expressionRefs = []
      this.ribRefs = []
      this.property = ""
      this.gssValue = ""
      this.vars = []
      this.methods = []
      this.mixins = []
      this.expressions = []
      this.ribs = []
      this.output = ""
         
      return this.build()
   }
   germSheets.CSSDeclaration.prototype.build = function() {
      /* it could be that a declaration only contains a mixin call, without
         referencing a css property..so we have to take that into account.. 
         in that case gssText should be equal to gssValue and property should be either
         the mixin token or the mixin name? the token is probably better..*/
      if(token.TILDE === this.gssText.charAt(0)) {
         this.mixins.push(this.gssText)
         this.property = token.TILDE.slice()
         this.gssValue = this.gssText
         // i think we're done here..since a declarationObject contains only one declaration
         // and mixin calls can't be nested..just fetch the actual mixin object and return this
         this.mixinRefs = this.rootNode.getObjects("Mixins", this.mixins)
         return this
      }
      
      /* a declaration could only contain a rib which can't be assigned to a property.
         thats a similar situation as with mixins except that ribs still need to be built 
         ..that means we can't simply get them from this.rootNode ..but using newObject should work 
         somehow the < disappears ..but since skeletons are already removed before cssrules are parsed we can assume a rib when encountering a + 
         but i should fix that */
      
      if((token.LT === this.gssText.charAt(0) && token.PLUS === this.gssText.charAt(1)) || token.PLUS === this.gssText.charAt(0)) {
         this.gssText = (token.LT !== this.gssText.charAt(0)) ? "<" + this.gssText : this.gssText
         this.ribs.push(this.gssText)
         this.property = token.LT.slice().concat(token.PLUS.slice())
         this.gssValue = this.gssText
         
         this.ribRefs.push(this.rootNode.newObject("Rib", this.gssText))
         return this
      }
      
      // else
      this.property = this.gssText.substring(0, this.gssText.indexOf(":")).replace(/^\s*|\s*$/g, '')
      this.gssValue = this.gssText.substring(this.property.length + 1).replace(/^\s*|\s*$/g, '')
      
      //germSheets.config.enableLogging && console.log("this@declaration::build", this)
      // parse gssValue for references
      // variables, methods and expressions usually assign values to properties and it's desired for expressions to 
      // support nesting as well. Also, there could be more than one reference per declaration (like in shorthand css properties)
      // so, to be sure what we have its best to parse the raw value token by token
      var 
      refIdx = 0, idxReset = false,
      tkn, ltkn, ntkn, mode = "open", tknzr = new germSheets.SimpleTokenizer(this.gssValue)
      
      while(false !== (tkn = tknzr.nextToken())) {
         ltkn = ntkn || tkn
         ntkn = (tknzr.tokens.length > tknzr.index) ? tknzr.tokens[tknzr.index] : token.NUL
         
         if(token.SPACE === tkn) {
            if("exp" !== mode && "meth" !== mode) mode = "open"
         }
         
         if(token.VAR === tkn) {
            if("open" === mode)/*("var" !== mode)*/ {
               mode = "var"
               
               if(idxReset) {
                  refIdx = this.vars.length
                  idxReset = false
               }
               
               this.vars[refIdx] = tkn
               continue
            }
         }
         
         if(token.TILDE === tkn) {
            if("open" === mode) {
               throw new TypeError("germSheets.Mixin can't be assigned to a CSS property")
            }else {
               throw new Error("SyntaxError: germSheets.Mixin doesn't support nesting")
            }
            mode = "exclude"
            continue
         }
         
         if(token.LT === tkn) {
            if(token.MINUS === ntkn) {
               if("open" === mode) {
                  mode = "meth"
                  
                  if(idxReset) {
                     refIdx = this.methods.length
                     idxReset = false
                  }
                  
                  this.methods[refIdx] = tkn
                  continue
               }
            }
            if(token.PAR_OPEN === ntkn) {
               if("open" === mode) { // TODO enable expressions inside css functions to be parsed correctly
                  mode = "exp"
                  
                  if(idxReset) {
                     refIdx = this.expressions.length
                     idxReset = false
                  }
                  
                  this.expressions[refIdx] = tkn
                  continue
               }
            }
         }
         
         if(token.CSSPROP.test(tkn)) {
            if("open" === mode) {
               mode = "css"
               this.cssText += tkn
               continue
            }
         }
         
         if("exclude" === mode) {
            if(token.SEMICOLON === tkn) {
               mode = "open"
               continue
            }
         }
         
         if("var" === mode) {
            /*
               could be either
                  prop: blblb $var;
               or
                  prop: $var bliblib;
            */
            
            this.vars[refIdx] += tkn
            
            if(token.SEMICOLON === tkn) {
               mode = "open"
               idxReset = true
               continue
            }
            
            if(token.SPACE === ntkn || token.OP.test(ntkn)) {
               mode = "open"
               idxReset = true
            }
            continue
         }
         
         if("meth" === mode) {
            this.methods[refIdx] += tkn
            if(token.SEMICOLON === tkn) {
               mode = "open"
               idxReset = true
            }
            continue
         }
         
         if("exp" === mode) {
            this.expressions[refIdx] += tkn
            
            // check nested end sequence ));
            if(token.PAR_CLOSE === tkn && token.PAR_CLOSE === ltkn && token.SEMICOLON === ntkn) {
               mode = "open"
               idxReset = true
               continue
            }
            
            if(token.SEMICOLON === tkn) {
               mode = "open"
               idxReset = true
            }
            
            continue
         }
         
         if("css" === mode) {
            this.cssText += tkn
            if(token.SEMICOLON === tkn) {
               mode = "open"
               idxReset = true
            }
            continue
         }
      }
      
      var siht = this
      
      if(this.vars && this.vars.length) {
         this.varRefs = this.rootNode.getObjects("Vars", this.vars)
      }
      
      if(this.methods && this.methods.length) {
         this.methodRefs = this.rootNode.getObjects("Methods", this.methods)
         if(!this.methodRefs || (this.methodRefs.length !== this.methods.length)) {
            this.methods.forEach(function(itm, idx) {
               //germSheets.config.enableLogging && console.log("new method", itm)
               siht.methodRefs[idx] = siht.rootNode.newObject("Method", itm)
               //germSheets.config.enableLogging && console.log(siht.methodRefs[idx])
            })
         }
      }
      
      if(this.expressions && this.expressions.length) {
         this.expressionRefs = this.rootNode.getObjects("Expressions", this.expressions)
         if(!this.expressionRefs || (this.expressionRefs.length !== this.expressions.length)) {
            this.expressions.forEach(function(itm, idx) {
               //germSheets.config.enableLogging && console.log("new expression", itm)
               siht.expressionRefs[idx] = siht.rootNode.newObject("Expression", itm)
               //germSheets.config.enableLogging && console.log(siht.expressionRefs[idx])
            })
         }
      }
      
      //germSheets.config.enableLogging && console.log("CSSDeclaration::build", this)
      return this
   }
   
   germSheets.CSSDeclaration.prototype.process = function(callback) {
         
      var 
      meth, mIdx = 0
      r = this.gssValue, 
      siht = this
      
      germSheets.config.enableLogging && console.log("starting to process", this)
      
      // ok..now do variables first
      if(this.varRefs && this.varRefs.length) { 
         this.varRefs.forEach(function(ref) {
            r = ref.process(r)
            germSheets.config.enableLogging && console.log("CSSDecl::process variable: %o", ref)
         })
      }
      
      // now we do expressions without references
      if(this.expressionRefs && this.expressionRefs.length) {
         this.expressionRefs.forEach(function(ref) {
            if(!ref.hasReferences) {
               r = ref.process(r)
            }
         })
      }
      
      // now let's expand method calls
      if(this.methodRefs && this.methodRefs.length) {
         meth = this.methodRefs[mIdx]
         
         var 
         methProcessor = function(processed) {
            r = processed
            //germSheets.config.enableLogging && console.log("methProcessor: " + r)
            meth = (siht.methodRefs.length > mIdx + 1) ? siht.methodRefs[++mIdx] : false
            if(!meth) {
               //siht.output = siht.identifier + " { " + r.replace(/;/g, '; ') + " }\n"
               //callback(siht.output, siht.ruleIndex, siht)
               siht.finishProcessing(r, callback)
            }else {
               meth.process(r, methProcessor)
            }
         }
         meth.process(r, methProcessor)
      }else {
         this.finishProcessing(r, callback)
      }
      
      /* continue in this.finishProcessing
      */
      
   }
   
   germSheets.CSSDeclaration.prototype.finishProcessing = function(input, callback) {
      // we're here because we've just finished fetching
      // method outputs asynchronously..that leaves us with mixins
      // and expressions that hold references..
      // ..ribs also need to be processed asynchronously..so i guess its best to do that at the end
      var r = input
      
      if(this.mixinRefs && this.mixinRefs.length) {
         this.mixinRefs.forEach(function(ref) {
            r = ref.process(r)
         })
      }
      
      if(this.expressionRefs && this.expressionRefs.length) {
         this.expressionRefs.forEach(function(ref) {
            if(ref.hasReferences) {
               r = ref.process(r)
            }
         })
      }
      
      if(this.ribRefs && this.ribRefs.length) {
         var siht = this, ribIdx = 0, rib = this.ribRefs[0],
         ribProcessor = function(processed) {
            r = processed
            rib = (siht.ribRefs.length > ribIdx + 1) ? siht.ribRefs[++ribIdx] : false
            if(!rib) {
               siht.output = r
               callback(siht.output)
            }else {
               rib.process(ribProcessor)
            }
         }
         rib.process(ribProcessor)
      }else {
         this.output = (token.TILDE === this.property) ? r + token.SPACE : this.property + ": " + r + token.SPACE
         
         germSheets.config.enableLogging && console.log("final output of %o " + this.output, this)
         
         callback(this.output)
      }
   }
 
/* css rules 
-----------------------*/
   /** 
    * prototype for css rule representations
    * @private
    * @abstract
    * @todo adapt to new parsing schema
   ---*/
   germSheets.CSSRule = function(args, node, ruleIndex) {
      this.identifier = args.identifier || ""
      this.childRules = args.childRules || []
      this.declarations = args.declarations || []
      this.gssText = Array.isArray(args.parsedTokens) ? args.parsedTokens.join("") : args.parsedTokens
      this.cssText = args.cssText || ""
      
      this.styleDeclarations = {}
      this._builtDeclarations = []
      
      //germSheets.config.enableLogging && console.log("************************* new cssPrototype *******************", this, args)
      
      /* old schema */
      //this.gssText = Array.isArray(args) ? args.join("") : args
      this.parentNode = node
      this.ruleIndex = args.ruleIndex
      
      return this.build()
      
   }
   
   germSheets.CSSRule.prototype.build = function() {
      // now we just need to iterate over this.declarations, build them and get the required gssObject references
      if(this._builtDeclarations && this._builtDeclarations.length) return this
      if(!this.declarations || !this.declarations.length) return this
      
      var i = 0, n = this.declarations.length
      for(; i < n; i++) {
         
         this._builtDeclarations[i] = new germSheets.CSSDeclaration(this.declarations[i], this)
         this.styleDeclarations[this._builtDeclarations[i].property] = this._builtDeclarations[i]
         
         germSheets.config.enableLogging && console.log("new CSSDeclaration: %o", this._builtDeclarations[i])
      }
      
      this.dirty = (this.declarations.length !== this._builtDeclarations.length)
      
      return this
   }
   
   germSheets.CSSRule.prototype.process = function(callback) {
      if(!this._builtDeclarations || !this._builtDeclarations.length) {
         germSheets.config.enableLogging && console.log("something weird must have happened @CSSRule::build or CSSReference::build", this)
         return callback("error@germSheets.CSSRule::build no declarations found")
      }
      /* iterate declarations and collect the processed output */
      var 
      decIdx = 0,
      r = "", 
      dec = this._builtDeclarations[decIdx],
      siht = this
      
      var aggregator = function(input) {
         r += input
         dec = (siht._builtDeclarations.length > decIdx + 1) ? siht._builtDeclarations[++decIdx] : false
         if(!dec) {
            siht.output = siht.identifier + " { " + r + " }\n"
            //germSheets.config.enableLogging && console.log("CSSRule::output", siht.output)
            callback(siht.output, r)
         }else {
            dec.process(aggregator)
         }
      }
      
      // kick off subroutine
      dec.process(aggregator)
   }
   
   /** returns a CSS property value 
       @method
       @public */
   germSheets.CSSRule.prototype.getStyle = function(key) {
      //germSheets.config.enableLogging && console.log("getStyle", key)
      if(key in this.styleDeclarations) {
         var r = this.styleDeclarations[key]
      }else {
         for(var i=0; i < this._builtDeclarations.length; i++) {
            if(key === this._builtDeclarations[i].property) {
               r = this._builtDeclarations[i]
            }
         }
      }
      //germSheets.config.enableLogging && console.log("getStyle", r)
      return !r.cssText ? r.gssValue : r.cssText
   }
   
   /** returns a CSSDeclaration instance 
       @method
       @public */
   germSheets.CSSRule.prototype.getStyleDeclaration = function(key) {
      if(key in this.styleDeclarations) return this.styleDeclarations[key]
      
      var dec, r = null, i = 0, n = this._builtDeclarations.length
      
      for(; i < n; i++) {
         dec = this._builtDeclarations[i]
         if(key === dec.property) {
            r = dec
            break
         }
      }
      
      return r
   }
   
   /** get this._builtDeclarations
    *  @method
    *  @public
    *  @returns {array}
    */
   germSheets.CSSRule.prototype.getStyleDeclarations = function() {
      return (this._builtDeclarations && this._builtDeclarations.length) ? this._builtDeclarations : null
   }
   
   
   
   /* GermNode
   --------- */
   germSheets.GermNode = function(gssData, gssSourceCode) {
      this.thru = gssData.thru || ""
      this.vars = gssData.vars || []
      this.mixins = gssData.mixins || []
      this.methods = gssData.methods || []
      this.expressions = gssData.expressions || []
      this.skeletons = gssData.skeletons || []
      /* new schema */
      this.cssRuleData = gssData.cssRuleData || []
      
      this.sourceCode = gssSourceCode
      
      this.compiledDOMNode = null
      
      this.id = "gssnode_" + Date.now()
      
      this.output = ""
      this.processed = {
         errors: 2,
         skeletons: [],
         cssRule: []
      }
      
      this._builtVars = []
      this._builtMixins = []
      this._builtMethods = []
      this._builtExpressions = []
      this._builtSkeletons = []
      this._builtCSSRules = []
      this._queuedCSSRules = []
      
      this.gssVars = {}
      this.gssMixins = {}
      this.gssCSSRules = {}
      
      this.checkList = {
         varsReady: false,
         mixinsReady: false,
         methodsReady: false,
         expressionsReady: false,
         skeletonsReady: false,
         cssReady: false
      }
      
      /* can't do it inside a for in since
         it has no way of keeping the proper execution order */
      
      this.thru = this.thru.replace(/^\s*|\s*$/gm, '')
      this.buildVars() //, this.vars)
      this.buildMixins()
      this.buildMethods()
      this.buildExpressions()
      this.buildSkeletons() //, this.skeletons)
      
      
      return this
      
   }
   //germSheets.GermNode.prototype = nodePrototype
   germSheets.GermNode.prototype.gssReady = function() {
      return this.checkList.varsReady && this.checkList.mixinsReady && this.checkList.methodsReady && this.checkList.expressionsReady && this.checkList.skeletonsReady
   }
   
   germSheets.GermNode.prototype.check = function(key) {
      this.checkList[key + "Ready"] = true
      if("css" !== key) {
         if(this.gssReady()) {
            
            this.buildCSSRules()
         }
      }else {
         germSheets.config.enableLogging && console.log("checklist complete")
      }
      return this
   }
   
   germSheets.GermNode.prototype.buildVars = function() {
      if(this._builtVars && this._builtVars.length) return this._builtVars;
      if(this.vars && this.vars.length) {
         germSheets.config.enableLogging && console.log("start building variables")
         for(var i=0; i<this.vars.length; i++) {
            this._builtVars[i] = new germSheets.Variable(this.vars[i], this)
            this.gssVars[this._builtVars[i].identifier] = this._builtVars[i].cssText
            germSheets.config.enableLogging && console.log(this._builtVars[i])
         }
      }         
      return this.check("vars")
   }
   
   germSheets.GermNode.prototype.buildMixins = function() {
      if(this._builtMixins && this._builtMixins.length) return this._builtMixins
      if(this.mixins && this.mixins.length) {
         germSheets.config.enableLogging && console.log("start building mixins")
         for(var i=0; i<this.mixins.length; i++) {
            this._builtMixins[i] = new germSheets.Mixin(this.mixins[i], this)
            this.gssMixins[this._builtMixins[i].identifier] = this._builtMixins[i].cssText
            germSheets.config.enableLogging && console.log(this._builtMixins[i])
         }
      }         
      return this.check("mixins")
   }
   
   germSheets.GermNode.prototype.buildMethods = function() {
      if(this._builtMethods && this._builtMethods.length) return this._builtMethods
      if(this.methods && this.methods.length) {
         germSheets.config.enableLogging && console.log("start building methods")
         for(var i=0; i<this.methods.length; i++) {
            this._builtMethods[i] = new germSheets.Method(this.methods[i], this)
            germSheets.config.enableLogging && console.log(this._builtMethods[i])
         }
      }         
      return this.check("methods")
   }
   
   germSheets.GermNode.prototype.buildExpressions = function() {
      if(this._builtExpressions && this._builtExpressions.length) return this._builtExpressions
      if(this.expressions && this.expressions.length) {
         germSheets.config.enableLogging && console.log("start building expressions")
         for(var i=0; i < this.expressions.length; i++) {
            this._builtExpressions[i] = new germSheets.Expression(this.expressions[i], this)
            germSheets.config.enableLogging && console.log(this._builtExpressions[i])
         }
      }         
      return this.check("expressions")
   }
   
   germSheets.GermNode.prototype.buildSkeletons = function() {
      if(this._builtSkeletons && this._builtSkeletons.length) return this._builtSkeletons
      if(this.skeletons && this.skeletons.length) {
         germSheets.config.enableLogging && console.log("start building methods")
         for(var i=0; i<this.skeletons.length; i++) {
            this._builtSkeletons[i] = new germSheets.Skeleton(this.skeletons[i], this)
            germSheets.config.enableLogging && console.log(this._builtSkeletons[i])
         }
      }
      return this.check("skeletons")
   }
   
   germSheets.GermNode.prototype.buildCSSRules = function() {
      for(var i=0; i<this.cssRuleData.length; i++) {
         this._builtCSSRules[i] = new germSheets.CSSRule(this.cssRuleData[i], this)
         this.gssCSSRules[this._builtCSSRules[i].identifier] = this._builtCSSRules[i]
      }
      //germSheets.config.enableLogging && console.log("builtCSSRules: ", this._builtCSSRules)
      
      return this.check("css")
   }
   
   germSheets.GermNode.prototype.completeCallback = function(output) { }
   germSheets.GermNode.prototype.setCompleteCallback = function(callback) {
      this.completeCallback = callback
   }
   germSheets.GermNode.prototype.onComplete = function(output) {
      // destruct...
      this.thru = undefined
      this.vars = undefined
      this.mixins = undefined
      this.methods = undefined
      this.expressions = undefined
      this.skeletons = undefined
      this.cssRules = undefined
      this.cssRuleData = undefined
      
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
      
      var // output
      d = window.document,
      outputNode = d.createElement("style")
      outputNode.type = "text/css"
      outputNode.title = "germsheets_0.0.2"
      outputNode.appendChild(d.createTextNode(output))
      d.getElementsByTagName("head")[0].appendChild(outputNode)
      
      this.compiledDOMNode = outputNode
      
      if("never" !== germSheets.config.cachePolicy) {
         // cache output
         var tmp = germSheets.cache(germSheets.clientId)
         germSheets.cache(germSheets.clientId, (tmp ? tmp + this.id + ',' : this.id + ','))
         germSheets.cache(this.id, output)
      }
      
      this.completeCallback(output + "\n/*<!--** code processed in " + germSheets.stats.stopTimer() + " **-->*/\n")
   }
   
   germSheets.GermNode.prototype.process = function() {
      var siht = this
      this.processSkeletons(function(r) {
         siht.output = "/* Pass-Thru\n------------ */\n" + siht.thru + "\n" + r
         siht.processCSSRules(function(r2) {
            if(!siht._queuedCSSRules || !siht._queuedCSSRules.length) {
               siht.output += "\n/* CSS\n---------- */\n" + r2
               siht.onComplete(siht.output)
            }else {
               siht.processQueuedCSSRules(function(r3) {
                  siht.output += "\n/* CSS\n---------- */\n" + r3
                  siht.onComplete(siht.output)
               })
            }
         })
      })
   }
   
   germSheets.GermNode.prototype.processSkeletons = function(callback) {
      
      if(!this._builtSkeletons || !this._builtSkeletons.length) return callback("")
      
      var siht = this
      
      for(var i=0; i<this._builtSkeletons.length; i++) {
         var skel = this._builtSkeletons[i], completed = 0
         skel.process(function(processed) {
            siht.processed.skeletons[completed] = processed
            if(siht._builtSkeletons.length <= ++completed) {
               germSheets.config.enableLogging && console.log("done processing skeletons")
               callback("\n/* Skeletons\n---------------------- */\n" + siht.processed.skeletons.join("\n"))
            }
         })
      }
   }
   
   germSheets.GermNode.prototype.processCSSRules = function(callback) {
      if(!this._builtCSSRules || !this._builtCSSRules.length) return callback("")
      
      var cssRule, siht = this, completed = 0, i = 0, n = this._builtCSSRules.length
      
      for(; i < n; i++) {
         cssRule = this._builtCSSRules[i]
         cssRule.process(function(processed) {
               germSheets.config.enableLogging && console.log("cssrule callback: " + completed)
               siht.processed.cssRule[completed] = processed
               
               if(siht._builtCSSRules.length <= ++completed) {
                  germSheets.config.enableLogging && console.log("done processing css rules")
                  callback("\n\n" + siht.processed.cssRule.join("\n\n") + "\n\n")
               }
            }
         )
      }
   }
   
   germSheets.GermNode.prototype.processQueuedCSSRules = function(callback) {
      if(!this._queuedCSSRules || !this._queuedCSSRules.length) return callback("")
      
      var rule, r = "", siht = this, completed = 0, i = 0, n = this._queuedCSSRules.length
      
      for(; i < n; i++) {
         rule = this._queuedCSSRules[i]
         /* now we need to process the queued rule and check if a matching selector already exists
            if there is one we append the processed declarations to that rule
            if there is none we just append the new rule to this.processed.cssRule
            return joined processed cssRules
         */
         rule.process(function(processed, decsOnly) {
            //germSheets.config.enableLogging && console.log("queued cssrule callback: " + completed)
            
            if(siht._queuedCSSRules.length <= ++completed) {
               if(false !== siht.selectorExists(rule.identifier)) {
                  // get matching processed rule and append decsOnly
                  var procRule = (function(key, decs) {
                     var sel, rl, j = 0, k = siht.processed.cssRule.length
                     for(; j < k; j++) {
                        rl = siht.processed.cssRule[j]
                        sel = rl.substring(0, rl.indexOf(' {'))
                        if(key === sel) {
                           rl = rl.replace(/(?:\u0020*\}\n*)$/g, function(m) {
                              return " " + decs + "}\n"
                           })
                           break
                        }
                     }
                     
                     //rl = rl.replace(/undefined\u0020*/g, '')
                     siht.processed.cssRule[j] = rl
                     //germSheets.config.enableLogging && console.log("inner update processed rule", siht.processed.cssRule[j])
                     return rl
                     
                  })(rule.identifier, decsOnly)
               }else {
                  siht.processed.cssRule.push(processed)
               }
               germSheets.config.enableLogging && console.log("done processing queued cssrules")
               callback("\n\n" + siht.processed.cssRule.join("\n\n") + "\n\n")
            }
         })
      }
   }
   
   /** checks if an existing rules identifier matches key 
    *  @returns {(number|boolean)} - the index of the existing rule on success, false on failure
    */
   germSheets.GermNode.prototype.selectorExists = function(key) {
      if(key in this.gssCSSRules) return this._builtCSSRules.indexOf(this.gssCSSRules[key])
      
      var i = 0, n = this._builtCSSRules.length, r = false
      for(; i < n; i++) {
         if(key === this._builtCSSRules[i].identifier) {
            r = i
            break
         }
      }
      return r
   }
   
   
   germSheets.GermNode.prototype.addCSSRule = function(rule) {
      if(!rule) return null
      
      /* just try it like this first..could generate unpredictable output, 
         since we're probably already inside the processCSSRules loop
         if that doesn't work, just store added rules in a new list..say this._addedCSSRules
         or something..and just process those after the main routine finishes
      */
      //germSheets.config.enableLogging && console.log("GermNode::addCSSRule at", rule, this._builtCSSRules.length)
      
      this._queuedCSSRules[this._queuedCSSRules.length] = rule
      
      return rule
   }
   
   /** 
         factory function for creating gssObjects from string
         should be a static method on germSheets
         @method
         @public
         @param {string} key - the name of the constructor function to call
         @param {string} args - arguments for the constructor function referenced by `key`
   */
   germSheets.GermNode.prototype.newObject = function(key, args) {
      if(!(key in germSheets)) return null
      
      return new germSheets[key](args, this)
   }
   
   /**
    * @todo add routine without using a referenceList
    */
   germSheets.GermNode.prototype.getObjects = function(key, referenceList) {
      var 
      r = [], refValue = "",
      trunk = this["_built" + key],
      j = 0, k = trunk.length,
      i = 0, n = referenceList.length
      
      germSheets.config.enableLogging && console.log("GermNode::getObjects", "key: " + key + " trunk: ", trunk)
      
      for(i = 0; i < n; i++) {
         refValue = Array.isArray(referenceList[i]) ? referenceList[i].join("").replace(/(?:\(.*\))*;$/g, '') : referenceList[i].replace(/(?:\(.*\))*;$/g, '')
         for(j = 0; j < k; j++) {
            germSheets.config.enableLogging && console.log("matching: " + refValue, "against: " + trunk[j].getFullIdentifier(), "from: _built" + key)
            if(trunk[j].getFullIdentifier() === refValue) {
               r[r.length] = trunk[j]
               germSheets.config.enableLogging && console.log("matched: ", trunk[j])
               break
            }
         }
      }
      return r
   }
   
   germSheets.GermNode.prototype.getValue = function(key) {
      if(token.VAR === key.charAt(0)) {
         key = key.substring(1)
      }
      return (key in this.gssVars) ? this.gssVars[key] : (key in this.gssMixins) ? this.gssMixins[key] : null
   }
   
   germSheets.GermNode.prototype.getCSSRule = function(key) {
      //germSheets.config.enableLogging && console.log("getCSSRule: " + key)
      
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
   
   germSheets.GermNode.prototype.getVariable = function(key) {
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
   
   /**
    * used to serialize style nodes, if neccessary 
    * @private
    */
   var 
   xmlser = new XMLSerializer()
   germSheets.serialize = function(node) {
      return xmlser.serializeToString(node)
   }
   
   
   /**
    * returns a string representation of a given hash, as specified by the expander parameter
    * @public
    * @method
    * @param {object} obj - a hash that should be turned into a string
    * @param {string} expander - the name of the expander function to use. defaults to CSS (kinda like JSON, but with unquoted, de-pascalcased propertynames)
    * @param {string} delimiter - optional parameter specifying the char to use as delimiter in the returned string. Defaults to ';'
    * @returns {string}
    */
   germSheets.expandObject = function(obj, expander, delimiter) {
      if(!obj) return ""
      expander = expander || "CSS"
      delimiter = delimiter || ","
      
      var p, cssp, cssv, r = ""
      
      if("CSS" === expander) {
         //r = JSON.stringify(obj).replace(/^(?:\{|\[)*|(?:\}|\])*$/g, '')
         for(p in obj) {
            cssp = p.replace(/[A-Z]/g, function(m) {
               return "-" + m.toLowerCase()
            })
            cssv = obj[p]
            r += cssp + ": " + cssv + token.SEMICOLON + delimiter
         }
         germSheets.config.enableLogging && console.log("germSheets::expandObject", r)
      }/*else {
         // TODO: implement xml / query string expander
      }*/
      
      return r.substring(0, r.length-1)
   }
   
   /**
    * adds a GermNode to the global list of nodes
    * @public
    * @method
    * @param {germSheets.GermNode} germNode - the node to add
    * @returns {void}
    */
   germSheets.addNode = function(germNode) {
      if(!germSheets.nodes || !germSheets.nodes.length) {
         germSheets.nodes = []
      }
      
      germSheets.nodes.push(germNode)
   }
   
   
   /**
    * creates a new germSheets.CSSRule and appends it to the current node
    * @public
    * @method
    * @param {string} selector - the 'identifier' field of the new rule
    * @param {object} declarations - a hash of style declarations for the new rule
    * @returns {germSheets.CSSRule}
    */
   germSheets.addNewCSSRule = function(selector, declarations) {
      var // concat everything into string
      ruleCSSText = germSheets.expandObject(declarations),
      germNode = germSheets.nodes[germSheets.nodes.length - 1],
      decArray = ruleCSSText.split(","),
      ruleGSSText = selector + " { " + ruleCSSText + " }",
      cssRule = new germSheets.CSSRule({
         identifier: selector,
         declarations: decArray,
         childRules: null,
         parsedTokens: ruleGSSText,
         cssText: ruleCSSText
      }, germNode)
      
      //germSheets.config.enableLogging && console.log("germSheets::addNewCSSRule", cssRule)
      
      return germNode.addCSSRule(cssRule)
   }
   
   /**
    * @property {function} run - collects the parsed source and passes it on to the compiler
    * @param {object} gssNode - the source node. May or may not be serialized
    * @param {boolean} isDOMNode - indicates if the first parameter is already serialized or not
    * @returns {void}
    */
   germSheets.run = function(gssNode, isDOMNode) {
      var
      compiler,
      gssCode = isDOMNode ? germSheets.serialize(gssNode) : gssNode, // regex replaces opening style tags, optional xml comment tokens and <?gss processing instructions
      parser = new germSheets.Parser(gssCode.replace(/^\s*(?:<style[^>]*>|[\r\n\s<\-!\[CDAT\?gss])*|(?:[\r\n\s\?>\-\]]|<\/style>)*$/mg, ""))
      
      germSheets.config.enableLogging && console.log("** start parser **")
      
      parser.parse()
      
      germSheets.config.enableLogging && console.log("*** parser completed ***")
      
      compiler = new germSheets.Compiler(parser.unstore(), gssCode)
      
      germSheets.addNode(compiler.germNode)
      
      isDOMNode && gssNode.remove()
      
      germSheets.config.enableLogging && console.log("** start compiling **")
      compiler.compile(function(compiledCss) {
         germSheets.config.enableLogging && console.log("compiler output: ", compiledCss)
         
         if('__gssdebug' in window) window.__gssdebug(compiledCss)
         
         var excessHeadNodes = document.querySelectorAll('style[type="text/x-gss"]')
         
         foreach(excessHeadNodes, function(itm) {
            itm.remove()
            germSheets.config.enableLogging && console.log("removed DOM node: ", itm)
         })
         
      })
      
   }
   
   /**
    * @method
    * @property {function} source - gathers the source and kicks off the parser
    * @param {object} src - either a dom node reference, a serialized dom node or a url to fetch the source from
    * @returns {void}
    */
   germSheets.source = function(src) {
      
      if(!germSheets.config) {
         // get default config
         germSheets.configure(null)
         germSheets.config.enableLogging && console.log(germSheets.config)
      }
      
      if(germSheets.getClientId()) {
         if(germSheets.Cache.hasInStore(germSheets.clientId)) {
            // the cache entry should be a comma seperated list of keys
            var keys = germSheets.cache(germSheets.clientId).split(",")
            if(keys && keys.length) {
               var d = window.document
               keys.forEach(function(k) {
                  var // create style nodes from cache
                  cachedCss = germSheets.cache(k)
                  if(cachedCss) {
                     cssNode = d.createElement("style")
                     cssNode.setAttribute("title", k)
                     cssNode.appendChild(d.createTextNode(cachedCss))
                     d.getElementsByTagName("head")[0].appendChild(cssNode)
                  }                  
               })
               return
            }
         }
      }else {
         germSheets.clientId = germSheets.createUid()
         germSheets.Cache.setCookie("gssClientId", germSheets.clientId)
      }
      
      src = src ? [src] : document.querySelectorAll('style[type="text/x-gss"]')
      
      germSheets.stats.startTimer()
      
      foreach(src, function(node) {
         if("[object String]" === Object.prototype.toString.call(node)) {
            // serialized node or url?
            if(/^(?:<style type="text\/x-gss">|(?:<!--)?<\?gss)/im.test(node)) {
               // looks like a node string or code wrapped in <?gss
               germSheets.run(node, false)
            }else if(/\.gss$/i.test(node)){
               // looks like a .gss file extension..so it might be a url
               germSheets.httpRequest(node, function(response) {
                  germSheets.run(response, false)
               })
            }
         }else {
            germSheets.run(node, true)
         }
      })
   }
   
})(window)