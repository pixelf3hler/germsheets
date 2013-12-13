/** 
 *  @file a simple XMLHttpRequest wrapper
 *  @version 1.0.2
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author <max@pixelf3hler.de>
 *  @license license.txt
 *  The MIT License
 */
(function(window, undefined) {
   
   var germSheets = window.germSheets || {}
   
   function getXHR() {
      if('XMLHttpRequest' in window) {
          return new XMLHttpRequest()
      }else {
          try {
              return new ActiveXObject('MSXML2.XMLHTTP.3.0')
          }catch(err)
          {
              try
              {
                  return new ActiveXObject('Msxml2.XMLHTTP')
              }catch(err2)
              {
                  return null
              }
          }
      }
   }
   
   function qstring(obj) {
      var p, s = ''
      for(p in obj)
      {
         s += (p + '=' + obj[p] + '&')
      }
      return s.substring(0, s.length-1)
   }
   
   function req(opt) {
      var xhr = getXHR(),
      method = !opt.method ? "post" : opt.method
      
      if(!opt.url) {
         return window.console && window.germSheets.config.enableLogging && console.log("No url defined")
      }
      
      if(xhr) {
         xhr.open(method, opt.url, true)
         
         xhr.responseType = opt.responseType || "text"
         
         if("post" === method.toLowerCase()) xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
         
         xhr.onreadystatechange = function() {
            if(4 == xhr.readyState && 200 == xhr.status) {
               //germSheets.config.enableLogging && console.log(xhr);
               opt.onsuccess && opt.onsuccess(xhr.responseText||xhr.responseXML)
            }
         }
         xhr.onerror = function() {
            germSheets.config.enableLogging && console.log(xhr.responseText);
         }
         xhr.send(!opt.data ? null : qstring(opt.data))
         
         return xhr
         
      }else {
         throw new Error('failed to instantiate XMLHttpRequest')
      }
   }
   
   var 
   http = {
      post: function(url, data, onsuccess) {
         return req({url:url, data:data, method:'post', onsuccess:onsuccess})
      },
      get: function(url, onsuccess) {
         return req({url:url, method:'get', onsuccess:onsuccess})
      }
   }
   
   germSheets.httpRequest = function(url, callback, data, method) {
      url = url || ""
      callback = callback || null
      data = data || null
      method = method || "get"
      
      if(!url) return null
      
      return ("get" === method.toLowerCase()) ? http.get(url, callback) : http.post(url, data, callback)
   }
   
   germSheets.getFunction = function(fnName, callback) {
      // already loaded?
      if(fnName in germSheets.fn) {
         return callback ? callback(germSheets.fn[fnName]) : germSheets.fn[fnName]
      }
      // check cache
      if(germSheets.Cache.hasInStore(fnName)) {
         var fnSource = decodeURIComponent(germSheets.cache(fnName)).split("::")
         if("eval" === fnSource[0]) {
            germSheets.fn[fnName] = eval(fnSource[1])
         }else {
            germSheets.fn[fnName] = Function(fnSource[1])
         }
         return callback ? callback(germSheets.fn[fnName]) : germSheets.fn[fnName]
      }
      
      if(!germSheets.config.useWorker) {
         var // using xhr:
         url = germSheets.config.baseUrl + "core/methods/" + fnName.toLowerCase() + ".js",
         processingInstruction = { eval: true }, rawInstructions = []
         
         if("never" === germSheets.config.cachePolicy) {
            url += '?_=' + new Date().getTime()
         }
         
         try { 
            http.get(url, function(response) {
               // avoid eval if possible.. to trigger just add a commented gss processing instruction in the first line like this:
               /*<?gss eval="false" ?> or //<?gss eval="0" ?>
               replace 0 with 1 if you unneccessarily want to force eval use 
               if you do that, be aware that the rest of the file just contains the function body,
               without the function keyword, name, parenthesis or curlys. Also note that, in order to use any named arguments
               inside the function body, you'll have to call <code>var thisFunction = germSheets.expandArguments(["argName1", "argName2"], arguments, _here_)</code>
               _here_ is like a magic variable in php and contains the function name assigned to the body when loaded. After calling expandArguments and
               and storing its returned value, you can access the arguments as hydrated fields on the functions self-reference that you've just created like so:
               <code>var blub1 = thisFunction.argName1</code> ... or just use the arguments-object like you normally would in a function of uncertain arity 
               i hereby declare it 'good practice' to wrap the loaded function body in conditional statement that checks for a successful call to expandArguments like: 
                  if(f = germSheets.expandArguments(["arg1", "arg2"], arguments, _here_)) {
                     // return something awesome
                  }
                  // return an error message
               */
               
               if("<?gss" === response.substr(2,5)) { 
                  response.replace(/<\?[^>]*(?:\?>|\?|\n|\r\n|\r|"|\u0020)$/m, function(m) {
                     rawInstructions = m.replace(/[a-z\$\-_0-9]*(?=\=)/g, function(m2) {
                        return !isNaN(m2.charCodeAt(0)) ? '"' + m2 + '"' : ""
                     }).split(" ").slice(1, -1)
                     
                     //germSheets.config.enableLogging && console.log("rawInstructions: " + rawInstructions)
                     
                     return m
                  })
                  
                  if(rawInstructions) {
                    processingInstruction = (1 > rawInstructions.length) ? 
                        JSON.parse('{ ' + rawInstructions.join(', ').replace(/\=/g, ':') + ' }') : 
                        JSON.parse('{ ' + rawInstructions.join('').replace(/\=/g, ':') + ' }')
                     
                  }
               }// ? !!(parseInt(response.substr(8, 1))) : true
               
               //germSheets.config.enableLogging && console.log("creating function " + fnName + " using: " + (processingInstruction.eval ? "eval()" : "Function()"), response)
               if(processingInstruction.eval) {
                  var fnString = "(" + response + ")"
                  germSheets.fn[fnName] = eval(fnString)
               }else {
                  fnString = "var _here_ = '" + fnName + "'\n\n" + response
                  germSheets.fn[fnName] = Function(fnString)
               }
               
               // write to cache
               if("always" === germSheets.config.cachePolicy) {
                  germSheets.cache(fnName, encodeURIComponent(fnString))
               }
               
               callback && callback(germSheets.fn[fnName])
               //germSheets.config.enableLogging && console.log(germSheets.fn[fnName]())
            })
         }catch(err) {
            germSheets.config.enableLogging && console.log(err)
         }
      }else {
         var // using a worker: TODO adapt above changes to support processing instructions
         worker = new Worker('core/worker_loadfunction.js')
         url = "methods/" + fnName.toLowerCase() + ".js"
         
         worker.onmessage = function(e) {
            this.terminate()
            germSheets.fn[fnName] =  Function("var _here_ = '" + fnName + "'\n\n" + response) //eval("(" + e.data + ")") //Function(e.data)
            callback && callback(germSheets.fn[fnName])
         }
         
         germSheets.config.enableLogging && console.log("starting new worker")
         worker.postMessage(url)
      }
   }
   
   // should be moved to core
   germSheets.expandArguments = function(keys, vals, fnName) {
      var
      i = 0,
      n = vals.length,
      fn = germSheets.fn[fnName] || function(){}
      
      for(; i<n; i++) {
         fn[keys[i]] = vals[i]
      }
      
      return fn
   }

})(window)