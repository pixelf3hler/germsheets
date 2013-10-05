onmessage = function(e) {
   load(e.data)
}

function load(url) {
   var xhr = new XMLHttpRequest()
   
   xhr.open('GET', url, true)
   xhr.onreadystatechange = function() {
      if(4 === xhr.readyState && 200 === xhr.status) {
         postMessage(xhr.responseText)
      }
   }
   xhr.send(null)
}