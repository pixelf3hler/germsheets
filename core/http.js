(function(window, undefined) {
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
         //xhr.open('POST', 'http://localhost/muxan/assets/components/leaflet/connectors/leafletmgr.connector.php', true);
         xhr.open(method, opt.url, true)
         //xhr.responseType = 'text';
         if("post" === method.toLowerCase()) xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
         
         xhr.onreadystatechange = function()
         {
            if(4 == xhr.readyState && 200 == xhr.status)
            {
               //console.log(xhr);
               opt.onsuccess && opt.onsuccess(xhr.responseText||xhr.responseXML)
            }
         };
         xhr.onerror = function()
         {
            //console.log(xhr.responseText);
         };
         xhr.send(!opt.data ? null : qstring(opt.data))
      }else
      {
         throw new Error('failed to instantiate XMLHttpRequest')
      }
   }
   
   window.http = {
      post: function(url, data, onsuccess) {
         return req({url:url, data:data, method:'post', onsuccess:onsuccess})
      },
      get: function(url, onsuccess) {
         return req({url:url, method:'get', onsuccess:onsuccess})
      }
   }
   
})(window);