/*<?gss eval=false ?> 
   sets style declarations for position, top, left
   to center an element on x or y, simply set x or y to 'center' or null
*/
if(f = germSheets.expandArguments(["x", "y", "elementSelector"], arguments, _here_)) {
   var 
   out = "absolute;\n",
   x = 0,
   y = 0,
   el = document.querySelector(f.elementSelector),
   bounds = el ? el.getBoundingClientRect() : null,
   screen = { width: window.innerWidth, height: window.innerHeight }
   
   f.x = f.x || "center"
   f.y = f.y || "center"
   
   
   if(!el || !bounds) {
      // seems like there's no matching element for us to measure..
      // that also means that we can't attach inline styles.. so we simply create a new stylerule
      // with auto margin
      x = ("center" === f.x) ? "auto" : f.x
      y = ("center" === f.y) ? "0px" : f.y
      //germSheets.addNewCSSRule(f.elementSelector, {marginTop: y, marginRight: ("auto" === x) ? x : "0px", marginBottom: y, marginLeft: x})
      return "margin-top: " + y + "; margin-right: " + ("auto" === x ? x : "0px") + "; margin-bottom: " + y + "; margin-left: " + x + ";"
   }
   
   
   
   if(0 === bounds.width || 0 === bounds.height) {
      var cln = el.cloneNode(false)
      cln.style.position = "absolute"
      cln.style.visibility = "hidden"
      cln.style.display = "block"
      
      document.body.appendChild(cln)
      
      bounds = cln.getBoundingClientRect()
      
      //gssDebug("methods::absolute element bounds: ", bounds)
      
      cln.remove()
      cln = undefined
   }
   
   if("center" === f.x) {
      x = (screen.width / 2) - (bounds.width / 2)
   }else if(!isNaN(f.x)) {
      x = f.x
   }
   
   if("center" === f.y) {
      y = (screen.height / 2) - (bounds.height / 2)
   }else if(!isNaN(f.y)) {
      y = f.y
   }
   
   out += "top: " + y + "px;\nleft: " + x + "px;\n"
   
   return out
}
return "error expanding arguments in: " + _here_