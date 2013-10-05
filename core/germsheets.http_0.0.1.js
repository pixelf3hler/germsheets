/*! germsheets http request utils */
(function(window, document, germSheets, undefined) {

   function getXHR()
   {
      if(!!('XMLHttpRequest' in window))
      {
          return new XMLHttpRequest()
      }else
      {
          try
          {
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
   function qstring(obj)
   {
      var p, s = ''
      for(p in obj)
      {
         s += (p + '=' + obj[p] + '&')
      }
      return s.substring(0, s.length-1)
   }
   
   function req(opt)
   {
      var xhr = getXHR(),
      method = !opt.method ? "post" : opt.method
      
      if(!opt.url) {
         return window.console && window.console.log("No url defined")
      }
      
      if(xhr)
      {
         xhr.open(method, opt.url, true)
         
         xhr.responseType = opt.responseType || "text"
         
         if("post" === method.toLowerCase()) xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
         
         xhr.onreadystatechange = function() {
            if(4 == xhr.readyState && 200 == xhr.status) {
               //console.log(xhr);
               opt.onsuccess && opt.onsuccess(xhr.responseText||xhr.responseXML)
            }
         }
         xhr.onerror = function() {
            console.log(xhr.responseText);
         }
         xhr.send(!opt.data ? null : qstring(opt.data))
         
         return xhr
         
      }else
      {
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
      if(fnName in germSheets.fn) {
         callback(germSheets.fn[fnName])
         return
      }
      if(germSheets.ajaxConfig.useXHR) {
         var // using xhr:
         url = germSheets.ajaxConfig.baseUrl + "core/methods/" + fnName.toLowerCase() + ".js"
         try { 
            http.get(url, function(response) {
               //console.log(response)
               germSheets.fn[fnName] = eval("(" + response + ")")
               callback(germSheets.fn[fnName])
               //echo(germSheets.fn[fnName]())
            })
         }catch(err) {
            console.log(err)
         }
      }else {
         var // using a worker:
         worker = new Worker('core/worker_loadfunction.js')
         url = "methods/" + fnName.toLowerCase() + ".js"
         
         worker.onmessage = function(e) {
            worker.terminate()
            germSheets.fn[fnName] = eval("(" + e.data + ")")
            callback(germSheets.fn[fnName])
         }
         
         echo("starting new worker")
         worker.postMessage(url)
      }
   }
   

})(window, window.document, window.germSheets)