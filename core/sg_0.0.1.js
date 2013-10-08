/*! germsheets v0.0.1 */
(function(window, undefined)
{

var mode = {
    method: false,
    mixin: false,
    variable: false,
    rule: false,
    nested: false,
    skeleton: false,
    iterblock: false,
    comment: false,
    passthrough: false
}, GOLDEN_RATIO = 1.61803399, // used for line height / line width in skeleton_paragraphs, *recommendedLineHeight() and *recommendedLineWidth()
SIXTEEN2NINE = {v:0.5625, h:1.77777778},
instructions = [], sgFooter = "\n\n/* <!-- generated with germsheets --> */\n\n";
cchar = "", pchar = "", nchar = "",
srcNodes = [], processedNodes = [],
cfg = {autoRun:true, autoLoad_960gs:false, autoLoad_germsUi:false, autoLoad_unsemantic:false, avoidFouc:true, rootElementId:"germsheets"};

function foreach(array, callback) {
    for(var i=0; i<array.length; i++) {
        callback(array[i], i, array);
    }
}

function debug(err) {
    return window.console && console.log && console.log(err);
}

function chopString(str) {
    return !String.prototype.trim ? str.replace(/^\s+|\s+$/g, '') : str.trim();
}

var doc = {
    u: document,
    head: document.getElementsByTagName('head')[0],
    body: document.getElementsByTagName('body')[0],
    $id: function(id){ return document.getElementById(id); },
    $el: function(tagName,all){ return (false === all) ? document.getElementsByTagName(tagName)[0] : document.getElementsByTagName(tagName); },
    $css: function(className,all){ return (false === all) ? document.getElementsByClassName(className)[0] : document.getElementsByClassName(className); },
    newEl: function(tagName) { return document.createElement(tagName); },
    newEvent: function(eventName, eventType) {
        var e = document.createEvent(eventName);
        e.init(eventType);
        return e; 
    },
    eventOn: function(eventTarget, eventName, eventType) {
        var e = doc.newEvent(eventName, eventType);
        return eventTarget.dispatchEvent(e); 
    }
};

function sg(styleNodes) {
    // cleanup
    foreach(styleNodes, function(el,i) {
        if(el.type == "text/x-sg") {
            el.id = "sg_style_node_" + i;
            srcNodes.push({id:el.id, content:el.innerHTML});
            //debug(sgNodes[sgNodes.length-1]); .replace(/\s/g, '')
        }
    });
    // parse and process
    foreach(srcNodes, function(el,i) {
        var node = el.content.replace(/\s{2,}/g, "").split(""), midx = 0, cidx = 0, mixidx = 0, ridx = 0, cridx = 0, sidix = 0,
        j = 0, n = node.length, match = new SGNode({methods:[], variables:[], mixins:[], rules:[], skeletons:[], passthrough:[], node:el});
        
        //match.passthrough = el.content.replace(/%%(.*)[^%]*%%/g, function(m) {});
        
        debug("raw input:\n" + el.content + "\nclean input:\n" + node.join("") + "\n");
        
        // check for instructions
        if(("<" !== node[0]) && ("!" !== node[1])) {
            node.unshift("<","!","-","-");
        }
        
        if(("-" !== node[node.length-2]) && (">" !== node[node.length-1])) {
            node.push("-", "-", ">");
        }
        
        if("@" === node[4]) {
            var k = 0, ins = node.slice(4, node.indexOf(";")+1).join("");
            debug("-------------------------------------------  " + ins);
            instructions = (-1 !== ins.indexOf(",")) ? ins.split(",") : [ins];
            for(;k<instructions.length;k++) {
               executeInstruction(instructions[k]);
            }
            k = undefined;
            ins = undefined;
        }
        
        for(;j<n;j++)
        {
            cchar = node[j];
            pchar = (0 < j) ? node[j-1] : "";
            nchar = (n != j+1) ? node[j+1] : "";
            
            /* remove comments */
            if(true === mode.comment) {
                if("*" !== cchar) {
                    node[j] = "";
                }else if("/" === nchar) {
                    node[j] = node[j+1] = "";
                    mode.comment = false;
                }
                continue;
            }
            
            if(("/" === cchar) && ("*" === nchar)) {
                mode.comment = true;
                node[j] = "";
                continue;
            }
            
            if(true === mode.passthrough) {
               if(("%" !== cchar) && ("%" !== nchar)) {
                  match.passthrough.push(cchar);
               }else {
                  match.passthrough.push(cchar);
                  node[j] = node[j+1] = "";
                  mode.passthrough = false;
               }
               continue;
            }
             
            if(true === mode.rule) {
                if(true === mode.nested) {
                    if("}" !== cchar)
                    {
                        match.rules[ridx].childRules[cridx].chars.push(cchar);
                        match.rules[ridx].chars.push(cchar);
                    }else
                    {
                        match.rules[ridx].childRules[cridx].chars.push(cchar);
                        match.rules[ridx].chars.push(cchar);
                        match.rules[ridx].childRules[cridx].endIndex = j;
                        //match.rules[ridx].childRules[cridx].build();
                        mode.nested = false;
                    }
                    continue;
                    //debug("nested: " + cchar);
                }/*else
                {*/
                 if("}" !== cchar) {   
                     match.rules[ridx].chars.push(cchar);
                 }else {
                     match.rules[ridx].chars.push(cchar);
                     match.rules[ridx].endIndex = j;
                     match.rules[ridx].build();
                     mode.rule = false;
                 }
                //}
                
                //debug("rule: " + mode.rule + "\n" + cchar);
            }
            
            if(true === mode.method) {
                //debug("method: " + pchar + " " + cchar + " " + nchar);
                if(";" !== cchar) {
                    match.methods[midx].chars.push(cchar);
                    //debug("method: " + match.methods[i].chars.join(""));
                }else
                {
                    match.methods[midx].chars.push(cchar);
                    match.methods[midx].endIndex = j;
                    // i'm pretty sure that kills the akward double trailing
                    //node[j] = "";
                    mode.method = false;
                }
                continue;
            }
            
            if(true === mode.variable) {
               if(true === mode.iterblock) {
                  match.variables[cidx].chars.push(cchar);
                  node[j] = "";
                  //debug("inline block: " + cchar);
                  if("`" === cchar) {
                     mode.iterblock = false;
                     //debug("inline block end "+cchar);
                  }
                  continue;
               }/*else {*/
               if(";" !== cchar) {
                  match.variables[cidx].chars.push(cchar);
                  node[j] = "";
                  //debug("variable: " + match.variables[match.variables.length-1].chars.join(""));
               }else {
                  match.variables[cidx].chars.push(cchar);
                  match.variables[cidx].endIndex = j;
                  match.variables[cidx].build();
                  node[j] = "";
                  mode.variable = false;
               }
            }
            
            if(true === mode.mixin) {
                if("}" !== cchar)
                {
                    match.mixins[mixidx].chars.push(cchar);
                    node[j] = "";
                }else
                {
                    match.mixins[mixidx].chars.push(cchar);
                    match.mixins[mixidx].endIndex = j;
                    match.mixins[mixidx].build();
                    node[j] = "";
                    mode.mixin = false;
                }
                continue;
            }
            
            if(true === mode.skeleton) {
               if(";" !== cchar) {
                  match.skeletons[sidx].chars.push(cchar);
               }else {
                  match.skeletons[sidx].chars.push(cchar);
                  match.skeletons[sidx].endIndex = j;
                  //match.skeletons[sidx].build();
                  mode.skeleton = false;
               }
               continue;
            }
            
            if(("*" === cchar) && ("/" !== pchar) && ("/" !== nchar) && (":" !== nchar))
            {
                midx = match.methods.length || 0;
                //debug("midx: " + midx);
                match.methods[midx] = new SGMethod({
                    startIndex: j,
                    endIndex: 0,
                    chars: [cchar]
                });
                mode.method = true;
                continue;
            }
            // only store variables
            // when not in method, mixin or rule mode
            if(("$" === cchar) && (false === mode.method) && (false === mode.rule) && (false === mode.mixin) && (false === mode.skeleton))
            {
                cidx = match.variables.length || 0;
                //debug("cidx: " + cidx);
                match.variables[cidx] = new SGVariable({
                    startIndex: j,
                    endIndex: 0,
                    chars: [cchar]
                });
                mode.variable = true;
                node[j] = "";
                continue;
            }
            
            if(("`" === cchar) && (true === mode.variable)) {
               mode.iterblock = match.variables[cidx].isIteratorBlock = true;
               //debug("inline block start " + cchar);
               continue;
            }
            
            // only store mixins when not in
            // rule mode
            if(("~" === cchar) && (false === mode.rule))
            {
                mixidx = match.mixins.length || 0;
                match.mixins[mixidx] = new SGMixin({
                    startIndex: j,
                    endIndex: 0,
                    chars: [cchar]
                });
                mode.mixin = true;
                node[j] = "";
                continue;
            }
            
            if("+" === cchar)
            {
               sidx = match.skeletons.length || 0;
               match.skeletons[sidx] = new SGSkeleton({
                  startIndex: j,
                  endIndex: 0,
                  chars: [cchar]
               });
               mode.skeleton = true;
               continue;
            }
            
            if(("." === cchar) || ("#" === cchar && false === mode.mixin && false === mode.variable && false === mode.skeleton)) {
                if(true === mode.rule) {
                    cridx = match.rules[ridx].childRules.length || 0;
                    match.rules[ridx].childRules[cridx] = new SGRule({
                        startIndex: j,
                        endIndex: 0,
                        chars: [cchar]
                    });
                    mode.nested = true;
                }else {
                    ridx = match.rules.length || 0;
                    match.rules[ridx] = new SGRule({
                        startIndex: j,
                        endIndex: 0,
                        chars: [cchar]
                    });
                    mode.rule = true;
                }
                continue;
            }
            
            if(("%" === cchar) && ("%" === nchar)) {
               node[j] = node[j+1] = "";
               mode.passthrough = true;
            }
            
        }
        match.node.content = node.join("");
        debug("preprocessed node:\n")
        debug(match);
        processedNodes.push(match.process());
    });
    if(true === cfg.avoidFouc) {
      var ivObj, rootEl = doc.$id(cfg.rootElementId), opct = 0;
      rootEl.style.display = "block";
      rootEl.style.opacity = "0.0";
      
      ivObj = window.setInterval(function() {
         opct += 6;
         rootEl.style.opacity = (opct / 100).toString();
         //debug(rootEl.style.opacity);
         if(100 <= opct) {
            window.clearInterval(ivObj);
            rootEl.style.opacity = "1.0";
            debug("rootEl hidden? " + ("none" == rootEl.style.display ? "yes" : "no"));
         }
      }, 1000/18);
    }
}

function tick(target, callback, delay) {
   
      return window.setInterval(function() {
         callback.call(target);
      }, delay);
}

function cleanContent(str)
{
   str = chopString(str);
   //debug(str.substring(0,4) + "\n" + str.substring(str.length-3));
   if("<!--" == str.substring(0,4))
   {
      str = str.substring(4);
   }
   if("-->" == str.substring(str.length-3))
   {
      str = str.substring(0, str.length-3);
   }
   return "\n" + chopString(str) + "\n";
}

function escapeInArray(arr)
{
   var r = [], i=0, n=arr.length, toEscape="*(){}^-+,./$";
   for(;i<n;i++)
   {
      if(-1 === toEscape.indexOf(arr[i]))
      {
         r[i] = arr[i];
      }else
      {
         r[i] = "\\" + arr[i];
      }
   }
   return r.join("");
}

function escapeInString(str)
{
   return escapeInArray(str.split(""));
}

/** @param {string} */
function executeInstruction(instruction) {
   var instr = (";" === instruction.charAt(instruction.length-1)) ? instruction.substring(1, instruction.length - 1) : instruction.substring(1),
   out = "";
   //debug("instruction: " + instr);
   try {
      out = eval("(instruction_" + instr + ")");
   }catch(err) {
      debug("error@executeInstruction:\n" + err);
      out = executeIllegal(instr);
   }
   return out;
}

function executeIllegal(methodString)
{
    var tmp = methodString.split("("),
    methName = tmp[0], methArgs = tmp[1];
    
    if(1 === methArgs.length)
    {
        return sg[methName]();
    }else
    {
        tmp = methArgs.split(",");
        tmp[tmp.length-1] = tmp[tmp.length-1].substring(0, tmp[tmp.length-1].length - 1);
        
        return sg[methName].apply(window, tmp);
    }
}

function mergeObjects(obj1, obj2) {
   for(var p in obj2) {
      obj1[p] = obj2[p];
   }
   return obj1;
}

instruction_configure = sg.instruction_configure = function(config) {
   cfg = mergeObjects(cfg, config);
   //debug("\n------- configure ----------\n");
   //debug(cfg);
   if(true === cfg.avoidFouc && !!cfg.rootElementId) {
      doc.$id(cfg.rootElementId).style.display = "none";
      debug("rootEl hidden? " + ("none" == doc.$id(cfg.rootElementId).style.display ? "yes" : "no"));
   }
};

instruction_include = sg.instruction_include = function(url) {
   var re = "";
   http.get(url, function(result) {
      //debug(result);
      re = result;
   });
   return re;
};

/**
    represents a sg style node
*/
function SGNode(obj)
{
    this.node = obj.node;
    this.methods = obj.methods;
    this.variables = obj.variables;
    this.mixins = obj.mixins;
    this.rules = obj.rules;
    this.skeletons = obj.skeletons;
    this.passthrough = obj.passthrough;
    this.processedElement = null;
    this.sourceElement = null;
    
    
    this.process = function()
    {
        var outString = "", t = this;
        
        /*foreach(this.methods, function(m)
        {   
            m = m.build(t.variables);
            outString = m.process(t.node.content);
        });
        foreach(this.variables, function(c)
        {
            outString = c.process(outString, false);
        });
        foreach(this.mixins, function(m)
        {
            debug(outString);
            outString = m.process(outString);
        });*/
        
        foreach(this.rules, function(r)
        {
            outString += "\n" + r.process(t.methods, t.variables, t.mixins) + "\n";
        });
        
        foreach(this.skeletons, function(s)
        {
            s = s.build(t.variables);
            outString = s.process(outString) + "\n" + outString;
        });
        outString = this.passthrough.join("") + "\n" + outString;
        //debug("outString: " + outString);
        return this.output(outString);
    };
    this.output = function(srcString)
    {
        this.processedElement = doc.newEl('style');
        this.sourceElement = doc.$id(this.node.id);
        var sgCode = cleanContent(srcString);
        //debug(sgCode);
        this.processedElement.innerHTML = "/* <!-- germsheets v0.0.1 --> */\n" + sgCode;
        doc.head.replaceChild(this.processedElement, this.sourceElement);
        
        return this;
    };
    return this;
}

/* SGObjects
---------------------------------------------------------------------*/

/**
   SGObject prototype
*/
var SGObject = {
   // parsed chars, not procesed {Array}
   chars: [],
   startIndex: 0,
   endIndex: 0,
   getToken: function(){ return (0 < this.chars.length) ? this.chars[0] : ""; },
   identifier: ""
};
/**
    a sg rule
*/
function SGRule(obj)
{
    for(var p in obj)
   {
      this[p] = obj[p];
   }
   this.childRules = [];
   this.transformedContent = "";
   this.processedContent = "";
   this.build = function()
   {
      this.transformedContent = chopString(this.chars.join(""));
      this.identifier = chopString(this.transformedContent.substring(0, this.transformedContent.indexOf("{")));
      
      if(this.childRules && 0 < this.childRules.length)
      {
          var regex, cr, pseudo, crstr = "",
          i = 0, n = this.childRules.length;
          
          for(;i<n;i++)
          {
             cr = this.childRules[i];
             crstr = escapeInArray(cr.chars);
             regex = new RegExp(crstr, "g");
             debug("regex child rule: " + regex);
             debug("SGRule.transformedContent\n" + this.transformedContent);
             this.transformedContent = this.transformedContent.replace(regex, 
                 function(m) {
                    cr.transformedContent = m;
                    debug("cr.transformedContent " + cr.transformedContent);
                    return "";
                 }
             );
             if(0 === cr.transformedContent.indexOf(".:")) {
               // nested pseudo class
               pseudo = true;
               cr.transformedContent = cr.transformedContent.substring(1);
             }
             
             this.transformedContent += "\n" + this.identifier + (!pseudo ? " " : "") + chopString(cr.transformedContent);
             debug("SGRule.transformedContent " + this.transformedContent);
          }
          
      }
      
      return this;
   };
   this.process = function(methods, variables, mixins)
   {
      var t = this;
      this.processedContent = this.transformedContent;
      /*foreach(skeletons, function(s)
      {
         t.processedContent = s.process(t.processedContent);
      });*/
      foreach(methods, function(m)
      {
         m = m.build(variables);
         t.processedContent = m.process(t.processedContent);
      });
      foreach(variables, function(c)
      {
         t.processedContent = c.process(t.processedContent, false);
      }); 
      foreach(mixins, function(mx)
      {
         t.processedContent = mx.process(t.processedContent);
      });
      //debug(t.processedContent);
      //this.processedContent = this.processedContent.replace(/\s*/g, "");
      //this.processedContent = this.processedContent.replace(/&/g, " ");
      this.processedContent = this.processedContent.replace(/[\{\};:\.]/g, function(m)
      {
         return ("{" === m) ? " {\n\t" : (";" === m) ? ";\n\t" : ("." === m) ? " ." : m; //(":" === m) ? ": " : "}\n";
      });
      return (" " == this.processedContent.charAt(0)) ? this.processedContent.substring(1) : this.processedContent;
   };
   return this;
}
SGRule.prototype = SGObject;
/**
   represents a sg variable
*/
function SGVariable(obj)
{
   // on construct:
   // startIndex, chars[cchar], endIndex
   for(var p in obj)
   {
      this[p] = obj[p];
   }
   this.isIteratorBlock = false;
   // call when completely parsed
   // to build this.identifier and this.value
   this.build = function()
   {
      if(this.chars && (0 < this.chars.length))
      {
         var tmp = this.chars.join("").split("=");
         this.identifier = chopString(tmp[0]);
         this.value = chopString(tmp[1]);
         // remove ; or ``;
         if(true === this.isIteratorBlock)
         {
            this.value = this.value.substring(1, this.value.length-2).replace(/;\s?/g, ";\n\t");
         }else
         {
            this.value = this.value.substring(0, this.value.length-1);
         }
         
      }
      //debug("SGVariable.build");
      //debug(this);
      return this;
   };
   
   // replaces occurences of this.id
   // with this.value in srcString
   this.process = function(srcString, inMethod)
   {
      var s = escapeInString(this.identifier),
      regex = (true === inMethod) ? new RegExp(s, "g") : new RegExp(s + ";", "g");
      //debug("cons process: " + this.value);
      return srcString.replace(regex, this.value);
   };
   
   return this;
}
SGVariable.prototype = SGObject;

// a sg method
function SGMethod(obj)
{
   for(var p in obj)
   {
      this[p] = obj[p];
   }
   // the value returned from calling eval or executeIllegal
   this.transformedContent = "";
   // parse chars to identifier, args
   /** @param {Array} variables */
   this.build = function(variables)
   {
      var mstr = this.chars.join(""),
      i = 0, n = variables.length;
      // remove token and semicolon
      mstr = mstr.substring(1, mstr.length-1);
      
      // replace variables before execution
      for(;i<n;i++)
      {
         if(-1 !== mstr.indexOf(variables[i].identifier))
         {
            // mitsuketa
            mstr = variables[i].process(mstr, true);
         }
      }
      // try to eval
      try
      {
        this.transformedContent = eval("(" + mstr + ")");
      }catch(err)
      {
        // ILLEGAL
        this.transformedContent = executeIllegal(mstr);
      }
      //debug("SGMethod.build");
      //debug(this);
      return this;
   };
   
   this.process = function(srcString)
   {
      var s = escapeInArray(this.chars),
      regex = new RegExp(s, "g");
      //debug(regex);
      return srcString.replace(regex, this.transformedContent);
   };
   
   return this;
}
SGMethod.prototype = SGObject;

/*
~roundCorners($radius)
{
    border-radius: $radius;
}
~fontMixin()
{
    font-family: 'sans-serif';
    color: #ffffff;
}
*/

function SGMixin(obj)
{
    for(var p in obj)
    {
        this[p] = obj[p];
    }
    
    this.argIds = [];
    this.argVals = [];
    this.value = "";
    this.processedContent = "";
    this.build = function()
    {
        if(this.chars && 0 < this.chars.length)
        {
            var s = this.chars.join(""), args;
            this.identifier = s.substring(0, s.indexOf("("));
            args = s.substring(s.indexOf("(") + 1, s.indexOf(")"));
            //debug("argIds: " + this.argIds);
            if(-1 !== args.indexOf(","))
            {
                this.argIds = args.split(",");
            }else
            {
                this.argIds = [args];
            }
            this.value = s.substring(s.indexOf("{") + 1, s.indexOf("}"));
        }
        return this;
    };
    /*
        .pink
        {
            ~roundCorners(6px); => border-radius: 6px;
            background-color: $pink;;
        }
    */
    this.process = function(srcString)
    {
        var s = escapeInString(this.identifier) + "(?:\\(*[\\w\\s,]*[^\\)]\\);)?";
        //escapeInString(this.identifier + "(" + ("array" == this.argIds.getType() ? this.argIds.join("") : this.argIds) + ")");
        regex = new RegExp(s, "g");
        debug("SGMixin:\n");
        debug(regex);
        this.processedContent = this.value;
        var t = this;
        srcString = srcString.replace(regex, function(m)
        {
            debug(m);
            // extract args, if any
            var args = (-1 !== m.indexOf("(")) ? m.substring(m.indexOf("(")+1, m.indexOf(")")) : "";
            
            if("" !== args)
            {
                var tmp = args.split(","), o = "";
                for(var i=0; i<tmp.length; i++)
                {
                    debug(t.argIds[i] + "\n" + tmp[i]);
                    t.processedContent = t.processedContent.replace(t.argIds[i], tmp[i]);
                }
                //debug("processed " + t.processedContent);
            }else
            {
                t.processedContent = t.value;   
            }
            return m.replace(m, t.processedContent);
        });
        //debug(srcString);
        return srcString;
    };
}
SGMixin.prototype = SGObject;

function SGSkeleton(obj)
{
   for(var p in obj) {
      this[p] = obj[p];
   }
   this.args = [];
   this.transformedContent = "";
   this.build = function(variables) {
      var str = this.chars.join(""), i = 0;
      this.identifier = str.substring(0, str.indexOf("("));
      this.args = str.substring(str.indexOf("(") + 1, str.indexOf(")"));
      //debug("skeleton args: " + this.args);
      if(variables) {
         for(;i<variables.length;i++) {
            if(-1 !== this.args.indexOf(variables[i].identifier)) {
               this.args = variables[i].process(this.args, true);
            }
         }
      }
      //debug("skeleton args after: " + this.args);
      var methstr = "skeleton_" + this.identifier.substring(1) + "(" + this.args + ")";
      //debug("methstr " + methstr);
      try {
         this.transformedContent = eval("(" + methstr + ")");
      }catch(err) {
         this.transformedContent = executeIllegal(methstr);
      }
      
      return this;
   };
   this.process = function(srcString) {
      /*var s = escapeInArray(this.chars),
      regex = new RegExp(s, "g");
      debug(regex);
      debug("srcString " + srcString);
      return srcString.replace(regex, this.transformedContent);*/
      return this.transformedContent;
   };
}
SGSkeleton.prototype = SGObject;

/* skeletons
-------------------------*/

skeleton_margins = sg.skeleton_margins = function(from, to, onlyEven)
{
   var out = "";
   if(Array.isArray(from))
   {
      to = from[1];
      onlyEven = from[2];
      from = from[0];
   }
   
   if(onlyEven) {
      for(;from<=to;from++) {
         if(0 === from % 2) out += "\n.m_" + from + " {\n\tmargin: " + from + "px;\n\t}\n";
      }
   }else {
      for(;from<=to;from++) {
         out += "\n.m_" + from + " {\n\tmargin: " + from + "px;\n\t}\n";
      }
   }
   
   return out;
};

skeleton_paddings = sg.skeleton_paddings = function(from, to, onlyEven)
{
   var out = "";
   if(Array.isArray(from))
   {
      to = from[1];
      onlyEven = from[2];
      from = from[0];
   }
   if(onlyEven) {
      for(;from<=to;from++) {
         if(0 === from % 2) out += "\n.pad_" + from + " {\n\tpadding: " + from + "px;\n\t}\n";    
      }
   }else {
      for(;from<=to;from++) {
         out += "\n.pad_" + from + " {\n\tpadding: " + from + "px;\n\t}\n";
      }
   }
   return out;
};
/**
   generates paragraph classes called .par_n where `n` is replaced
   by the current font size. Starts at `from`, stops at (including) `to`.
   Calculates line-height based on font size and a ratio. Can optionally
   calculate the optimal line width or apply an adjusted line height based
   on a given fixed width.
*/
skeleton_paragraphs = sg.skeleton_paragraphs = function(from, to, fontFamily, setWidth, ratio) { 
   var out = "", ra = 0.0;
   ratio = !ratio ? "gold" : ratio.toLowerCase();
   if(isNaN(parseFloat(ratio))) {
      // constant value
      if('gold' === ratio) {
         ra = GOLDEN_RATIO;
         //debug("gold: " + ra);
      }else if('pi' === ratio)
      {
         ra = Math.PI;
      }
   }else
   {
      ra = parseFloat(ratio);
   }
   setWidth = ("true" === setWidth) ? true : setWidth;
   from = parseInt(from);
   to = parseInt(to);
   // improve
   fontFamily = (-1 !== fontFamily.indexOf(" ")) ? fontFamily.split(" ").join(",") : fontFamily;
   var fs, lh;
   if(true === setWidth) {
      var w;
      //debug("from " + from + " to: " + to);
      for(;from<=to;from++) {
         fs = from;
         lh = Math.round(fs * ra);
         w = Math.pow(lh,2);
         //debug(fs + "\n" + lh + "\n" + w + "\n" + ra);
         // see 
         // http://www.pearsonified.com/2011/12/golden-ratio-typography.php
         w = Math.pow(fs*ra,2) * (1 + 2 * ra * (lh/fs - ra));
         out += "\n.par_" + fs + " {\n\tfont-family: " + fontFamily + ";\n\tfont-size: " + fs + "px;\n\tline-height: " + lh + "px;\n\twidth: " + Math.round(w) + "px;\n\t}\n";
      }
   }else if(!isNaN(parseInt(setWidth))){
      setWidth = parseInt(setWidth);
      for(;from<=to;from++) {
         fs = from;
         /* 
            also from 
            http://www.pearsonified.com/2011/12/golden-ratio-typography.php 
         */
         ratio = ra - (1/(2*ra)) * (1 - setWidth/Math.pow(fs*ra, 2));
         lh = Math.round(fs * ratio);
         
         //debug("\nfont size\n" + fs + "\nadjusted ratio\n" + ratio + "\nline height\n" + lh);
         out += "\n.par_" + fs + " {\n\tfont-family: " + fontFamily + ";\n\tfont-size: " + fs + "px;\n\tline-height: " + lh + "px;\n\twidth: " + setWidth + "px;\n\t}\n";
      }
   }else
   {
      for(;from<=to;from++)
      {
         out += "\n.par_" + from + " {\n\tfont: " + from + "px/" + ra.toFixed(2) + " " + fontFamily + ";\n\t}\n";
      }
      // 
   }
   return out;
};
/**
   unrolls a user defined skeleton
   [i] is replaced with the current iteration 
*/
skeleton_unroll = sg.skeleton_unroll = function(ident, type, from, to, content) {
   var out = "", token = ("class" == type) ? "." : "#";
   for(;from<=to;from++) {
      out += "\n" + token + ident + "_" + from + " {\n\t" + content.replace(/\[i\]/g, from) + ";\n\t}\n";
   }
   return out;
};

skeleton_960gs = sg.skeleton_960gs = function(cols, loadReset, loadText) {
   cols = !cols ? 12 : cols;
   var steps = (12 == cols) ? [
      {s:"body", t:"min-width: 960px;"},
      {s:".container_12", t:"margin-left: auto;margin-right: auto;width: 960px;"},
      {s:".grid_[i]", t:"display: inline;float: left;margin-left: 10px;margin-right: 10px;", iter:true},
      {s:".push_[i], .pull_[i]", t:"position: relative;", iter:true},
      {s:".alpha", t:"margin-left: 0;"},
      {s:".omega", t:"margin-right: 0;"},
      {s:".container_12 .grid_[i]", t:"width: [1===i ? 60 : 12===i ? 940 : 60 + 80 * (i-1)]px", iter:true, complex:true},
      {s:".container_12 .prefix_[i]", t:"padding-left: [80 * i]px", iter: true, stopAt:15, complex:true},
      {s:".container_12 .suffix_[i]", t:"padding-right: [80 * i]px", iter: true, stopAt:15, complex:true},
      {s:".container_12 .push_[i]", t:"left: [80 * i]px", iter:true, stopAt:15, complex:true},
      {s:".container_12 .pull_[i]", t:"left: -[80 * i]px", iter:true, stopAt:15, complex:true},
      {s:".clear", t:"clear: both;display: block;overflow: hidden; visibility: hidden;width: 0;height: 0;"},
      {s:".clearfix:before, .clearfix:after, .container_12:before, .container_12:after", t:"content: '.';display: block;overflow: hidden;visibility: hidden;font-size: 0;line-height: 0;width: 0;height: 0;"},
      {s:".clearfix:after, .container_12:after", t:"clear: both;"},
      {s:".clearfix, .container_12", t:"zoom: 1;"}
   ] : [
      {s:"body", t:"min-width: 960px;"},
      {s:".container_16", t:"margin-left: auto;margin-right: auto;width: 960px;"},
      {s:".grid_[i]", t:"display: inline;float: left;margin-left: 10px;margin-right: 10px;", iter:true},
      {s:".push_[i], .pull_[i]", t:"position: relative;", iter:true},
      {s:".alpha", t:"margin-left: 0;"},
      {s:".omega", t:"margin-right: 0;"},
      {s:".container_16 .grid_[i]", t:"width: [1===i ? 40 : 16===i ? 940 : 40 + 60 * (i-1)]px", iter:true, complex:true},
      {s:".container_16 .prefix_[i]", t:"padding-left: [60 * i]px", iter: true, stopAt:15, complex:true},
      {s:".container_16 .suffix_[i]", t:"padding-right: [60 * i]px", iter: true, stopAt:15, complex:true},
      {s:".container_16 .push_[i]", t:"left: [60 * i]px", iter:true, stopAt:15, complex:true},
      {s:".container_16 .pull_[i]", t:"left: -[60 * i]px", iter:true, stopAt:15, complex:true},
      {s:".clear", t:"clear: both;display: block;overflow: hidden; visibility: hidden;width: 0;height: 0;"},
      {s:".clearfix:before, .clearfix:after, .container_16:before, .container_16:after", t:"content: '.';display: block;overflow: hidden;visibility: hidden;font-size: 0;line-height: 0;width: 0;height: 0;"},
      {s:".clearfix:after, .container_16:after", t:"clear: both;"},
      {s:".clearfix, .container_16", t:"zoom: 1;"}
   ], out = "/* <!-- 960 Grid System ~ Core CSS. Learn more ~ http://960.gs/  Licensed under GPL and MIT. --> */\n\n";
   
   out += expandGrid(steps, cols);
   
   return out + sgFooter;
};

skeleton_960squares = sg.skeleton_960squares = function(cols, load960gs, loadCore) {
   cols = !cols ? 12 : cols;
   var steps = (12 == cols) ? [
         {s:".box", t:"margin-top: 10px;margin-bottom: 10px;"},
         {s:".square_[i]", t:"margin-top: 10px;margin-bottom: 10px;", iter:true},
         {s:".container_12 .square_[i]", t:"height: [1===i ? 60 : 12===i ? 940 : 60 + 80 * (i-1)]px;", iter:true, complex:true},
         {s:".trap > *",t:"margin: 0;"},
         {s:".trap > *:nth-child(even)", t:"margin-top: 20px;margin-bottom: 20px;"},
         {s:".trap > *:first-child", t:"margin-top: 0 !important;"},
         {s:".trap > *:last-child", t:"margin-bottom: 0 !important;"}
      ] : [
         {s:".box", t:"margin-top: 10px;margin-bottom: 10px;"},
         {s:".square_[i]", t:"margin-top: 10px;margin-bottom: 10px;", iter:true},
         {s:".container_16 .square_[i]", t:"height: [1===i ? 40 : 16===i ? 940 : 40 + 60 * (i-1)]px;", iter:true, complex:true},
         {s:".trap > *",t:"margin: 0;"},
         {s:".trap > *:nth-child(even)", t:"margin-top: 20px;margin-bottom: 20px;"},
         {s:".trap > *:first-child", t:"margin-top: 0 !important;"},
         {s:".trap > *:last-child", t:"margin-bottom: 0 !important;"}
      ], out = !load960gs ? "" : skeleton_960gs(cols);
   
   if(!loadCore) {
      steps = steps.splice(1, 2);
      //debug(steps);
   }
   
   out += "\n\n/* <!-- GermSquares " + cols + " --> */\n\n" + expandGrid(steps, cols);
   
   return out + sgFooter;
};

skeleton_960tall = sg.skeleton_960tall = function(cols, load960gs, loadCore) {
   cols = !cols ? 12 : cols;
   var steps = (12 == cols) ? [
         {s:".box", t:"margin-top: 10px;margin-bottom: 10px;"},
         {s:".tall_[i]", t:"margin-top: 10px;margin-bottom: 10px;", iter:true},
         {s:".container_12 .tall_[i]", t:"height: [(1===i ? 60 : 12===i ? 940 : 60 + 80 * (i-1)) * 2]px;", iter:true, complex:true},
         {s:".trap > *", t:"margin: 0;"},
         {s:".trap > *:nth-child(even)", t:"margin-top: 20px;margin-bottom: 20px;"},
         {s:".trap > *:first-child", t:"margin-top: 0 !important;"},
         {s:".trap > *:last-child", t:"margin-bottom: 0 !important;"}
      ] : [
         {s:".box", t:"margin-top: 10px;margin-bottom: 10px;"},
         {s:".tall_[i]", t:"margin-top: 10px;margin-bottom: 10px;", iter:true},
         {s:".container_16 .tall_[i]", t:"height: [(1===i ? 40 : 16===i ? 940 : 40 + 60 * (i-1)) * 2]px;", iter:true, complex:true},
         {s:".trap > *", t:"margin: 0;"},
         {s:".trap > *:nth-child(even)", t:"margin-top: 20px;margin-bottom: 20px;"},
         {s:".trap > *:first-child", t:"margin-top: 0 !important;"},
         {s:".trap > *:last-child", t:"margin-bottom: 0 !important;"}
      ], out = !load960gs ? "" : skeleton_960gs(cols);
      
   if(!loadCore) {
     steps = steps.splice(1, 2);
   }
   
   out += "\n\n/* <!-- +960tall --> */\n\n" + expandGrid(steps, cols);
   
   return out + sgFooter;
};

skeleton_960wide = sg.skeleton_960wide = function(cols, load960gs, loadCore) {
   cols = !cols ? 12 : cols;
   var steps = (12 == cols) ? [
         {s:".box", t:"margin-top: 10px;margin-bottom: 10px;"},
         {s:".wide_[i]", t:"margin-top: 10px;margin-bottom: 10px;", iter:true},
         {s:".container_12 .wide_[i]", t:"height: [(1===i ? 60 : 12===i ? 940 : 60 + 80 * (i-1)) / 2]px;", iter:true, complex:true},
         {s:".trap > *", t:"margin: 0;"},
         {s:".trap > *:nth-child(even)", t:"margin-top: 20px;margin-bottom: 20px;"},
         {s:".trap > *:first-child", t:"margin-top: 0 !important;"},
         {s:".trap > *:last-child", t:"margin-bottom: 0 !important;"}
      ] : [
         {s:".box", t:"margin-top: 10px;margin-bottom: 10px;"},
         {s:".wide_[i]", t:"margin-top: 10px;margin-bottom: 10px;", iter:true},
         {s:".container_16 .wide_[i]", t:"height: [(1===i ? 40 : 16===i ? 940 : 40 + 60 * (i-1)) / 2]px;", iter:true, complex:true},
         {s:".trap > *", t:"margin: 0;"},
         {s:".trap > *:nth-child(even)", t:"margin-top: 20px;margin-bottom: 20px;"},
         {s:".trap > *:first-child", t:"margin-top: 0 !important;"},
         {s:".trap > *:last-child", t:"margin-bottom: 0 !important;"}
      ], out = !load960gs ? "" : skeleton_960gs(cols);
      
   if(!loadCore) {
      steps = steps.splice(1, 2);
   }
   
   out += "\n\n/* <!-- +960wide --> */\n\n" + expandGrid(steps, cols);
   
   return out + sgFooter;
   
};

skeleton_960sixteenToNine = sg.skeleton_960sixteenToNine = function(cols, load960gs, loadCore) {
   cols = !cols ? 12 : cols;
   var steps = (12 == cols) ? [
         {s:".box", t:"margin-top: 10px;margin-bottom: 10px;"},
         {s:".16to9_[i]", t:"margin-top: 10px;margin-bottom: 10px;", iter:true},
         {s:".container_12 .16to9_[i]", t:"height: [Math.floor((1===i ? 60 : 12===i ? 940 : 60 + 80 * (i-1)) * SIXTEEN2NINE.v)]px;", iter:true, complex:true},
         {s:".trap > *", t:"margin: 0;"},
         {s:".trap > *:nth-child(even)", t:"margin-top: 20px;margin-bottom: 20px;"},
         {s:".trap > *:first-child", t:"margin-top: 0 !important;"},
         {s:".trap > *:last-child", t:"margin-bottom: 0 !important;"}
      ] : [
         {s:".box", t:"margin-top: 10px;margin-bottom: 10px;"},
         {s:".16to9_[i]", t:"margin-top: 10px;margin-bottom: 10px;", iter:true},
         {s:".container_16 .16to9_[i]", t:"height: [Math.floor((1===i ? 40 : 16===i ? 940 : 40 + 60 * (i-1)) * SIXTEEN2NINE.v)]px;", iter:true, complex:true},
         {s:".trap > *", t:"margin: 0;"},
         {s:".trap > *:nth-child(even)", t:"margin-top: 20px;margin-bottom: 20px;"},
         {s:".trap > *:first-child", t:"margin-top: 0 !important;"},
         {s:".trap > *:last-child", t:"margin-bottom: 0 !important;"}
      ], out = !load960gs ? "" : skeleton_960gs(cols);
      
   if(!loadCore) {
      steps = steps.splice(1, 2);
   }
   
   out += "\n\n/* <!-- +960sixteenToNine " + cols + " --> */\n\n" + expandGrid(steps, cols);
   
   return out + sgFooter;
};

skeleton_boxes = sg.skeleton_boxes = function(pkg, cols, load960gs) {
   pkg = !pkg ? "all" : pkg;
   cols = !cols ? 12 : cols;
   var out = !load960gs ? "" : skeleton_960gs(cols), pkgs = ["square", "tall", "wide", "sixteenToNine"];
   
   if("all" === pkg) {
      out += "\n\n/* <!-- +boxes " + cols + " --> */\n\n";
      foreach(pkgs, function(p) {
         try {
            
            out += eval("(" + "skeleton_960" + p + "(" + cols + ", false, false)" + ")");
         }catch(err) {
            debug("eval error: " + err);
            out += sg["skeleton_960" + p](cols, false, false);
         }
      });
   }else {
      try {
            out += eval("(" + "skeleton_960" + pkg + "(" + cols + ", false, true)" + ")");
         }catch(err) {
            debug("eval error: " + err);
            out += sg["skeleton_960" + pkg](cols, false, false);
            
         }
   }
   //debug(cols);
   return out + sgFooter;
};

function expandGrid(compressed, cols) {
   cols = !cols ? 12 : cols;
   var i, out = "";
   foreach(compressed, function(step) {
      if(!step.iter) {
         out += "\n" + step.s + " {\n\t" + step.t.replace(/;\s?/g, ";\n\t") + "\n\t}\n";
      }else {
         var r, t, n = !step.stopAt ? cols : step.stopAt;
         if(!step.complex) {
            for(i=1;i<=n;i++) {
               out += (i < n) ? ("\n" + step.s.replace(/\[i\]/g, i) + ",") : ("\n" + step.s.replace(/\[i\]/g, i) + " {\n\t" + step.t.replace(/;\s?/g, ";\n\t") + "\n\t}\n");
            }
         }else {
            for(i=1;i<=n;i++) {
               t = step.t.substring(step.t.indexOf("[") + 1, step.t.lastIndexOf("]"));
               //debug("t: " + t);
               try {
                  r = eval("(" + t + ")");
               }catch(err) {
                  debug("--- error@skeleton_960gs ---\n");
                  debug(err);
               }
               out += "\n" + step.s.replace(/\[i\]/g, i) + " {\n\t" + step.t.replace("[" + t + "]", r) + "\n\t}\n";
            }
         }
      }
   });
   return out;
}

/* methods
------------------------------*/

recommendedLineHeight = sg.recommendedLineHeight = function(fontSize, lineWidth) 
{
   return !lineWidth ? Math.round(fontSize * GOLDEN_RATIO) + "px" : Math.round(fontSize * (GOLDEN_RATIO - (1 / (2 * GOLDEN_RATIO)) * (1 - lineWidth / Math.pow(fontSize * GOLDEN_RATIO, 2)))) + "px";
};

recommendedLineWidth = sg.recommendedLineWidth = function(fontSize, lineHeight)
{
   return Math.round(Math.pow(fontSize * GOLDEN_RATIO, 2) * (1 + 2 * GOLDEN_RATIO * (lineHeight / fontSize - GOLDEN_RATIO)));
};

/**
   generates a random color
*/
randomColor = sg.randomColor = function(format)
{
    var i = 0, r = "", hexvals = "0123456789abcdef";
    if("hex" == format)
    {
        r = "#";
        for(; i<6; i++)
        {
            r += hexvals.charAt(Math.round(Math.random() * (hexvals.length-1)));
        }
    }else
    {
        r = "rgb(";
        for(i=0;i<3;i++)
        {
            r += Math.round(Math.random() * 255).toString() + ',';
        }
        r = r.substring(0, r.length-1) + ")";
        
    }
    return r + ";";
};

/**
    brightens a color by a specified percentage
*/
brighten = sg.brighten = function(color, n)
{
    //debug("brighten::color " + color);
    //var rgb, hex;
    if(Array.isArray(color))
    {
        n = color[1];
        color = color[0];
    }
    if("rgb" == color.substr(0,3))
    {
        //rgb = new RGBColor(color);
        return new RGBColor(color).brighten(n);//rgb.brighten(n);
    }else if("#" == color.charAt(0))
    {
        //hex = new HexColor(color);
        return new HexColor(color).brighten(n);//hex.brighten(n);
    }
};

darken = sg.darken = function(color, n)
{
    //var rgb, hex;
    if("array" === color.getType())
    {
        n = color[1];
        color = color[0];
    }
    if("rgb" == color.substr(0,3))
    {
        //rgb = new RGBColor(color);
        return new RGBColor(color).darken(n); //rgb.darken(n);
    }else if("#" == color.charAt(0))
    {
        //hex = new HexColor(color);
        return new HexColor(color).darken(n); //hex.darken(n);
    }
};

/* constructor functions
----------------------------------------------------------------*/

function HexColor(colorString)
{
    this.r = parseInt(colorString.substr(1,2), 16);
    this.g = parseInt(colorString.substr(3,2), 16);
    this.b = parseInt(colorString.substr(5,2), 16);
    //debug("HexColor: " + colorString + " => " + this.r + " " + this.g + " " + this.b);
    this.rgb = new RGBColor("rgb(" + this.r + "," + this.g + "," + this.b + ")");
    
    this.brighten = function(percent)
    {
        var re = "#", t = this;
        foreach("rgb".split(""),
            function(el,i){
                t[el] = t.rgb.brightenChannel(el, percent);
                re += 255 < t[el] ? "ff" : t[el].toString(16);
            }
        );
        //debug("HexColor::brighten(" + percent + ") => " + re);
        return re;
    };
    this.darken = function(percent)
    {
        var re = "#";
        foreach("rgb".split(""),
            function(el,i){
                this[el] = this.rgb.darkenChannel(el, percent);
                re += this[el].toString(16);
            }
        );
        return re;
    };
    return this;
}

function RGBColor(colorString)
{
    var tmp = colorString.split('(')[1].split(',');
    tmp[2] = tmp[2].substring(0,tmp[2].length-1);
    this.r = parseInt(tmp[0], 10);
    this.g = parseInt(tmp[1], 10);
    this.b = parseInt(tmp[2], 10);
    tmp = undefined;
    //debug("RGBColor " + colorString + " => " + this.r + " " + this.g + " " + this.b);
    this.brighten = function(percent)
    {
        var re = [];
        foreach("rgb".split(""),
            function(el,i){
                this[el] = this.brightenChannel(el, percent);
                re[i] = this[el];
            }
        );
        return "rgb(" + re.join(",") + ")";
    };
    this.darken = function(percent)
    {
        var re = [];
        foreach("rgb".split(""),
            function(el,i){
                this[el] = this.darkenChannel(el, percent);
                re[i] = this[el];
            }
        );
        return "rgb(" + re.join(",") + ")";
    };
    this.brightenChannel = function(channel, percent)
    {
        var oldVal = this[channel],
        mod = (oldVal / 100) * percent,
        newVal = oldVal + mod;
        //debug("RGBColor::brightenChannel(" + channel + ", " + percent + ") =>\noldVal " + oldVal + "\nmod " + mod + "\nnewVal " + newVal);
        return Math.round(newVal);
    };
    this.darkenChannel = function(channel, percent)
    {
        var oldVal = this[channel],
        mod = (oldVal / 100) * percent,
        newVal = oldVal - mod;
        return Math.round(newVal);
    };
    
    return this;
}


// expose
window.sg = window.germSheets = sg;

// execute
if(true === cfg.autoRun) {
   sg(doc.$el('style', true));
}
})(window);