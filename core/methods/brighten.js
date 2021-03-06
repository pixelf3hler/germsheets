/*<?gss eval=false ?> 
    brighten.js
    brightens a given css color value (rgb(255,255,255) or #ffffff) using the supplied percentage parameter. 
    keeps the hue by redistributing channel values gt 255. 
    see lighten.js and dim.js for other implementations with a similar effect.
    © 2013 max ɐʇ pixelf3hler · de
    The MIT License
    see license.txt
*/
if(f = germheets.expandArguments(["cssColor", "percent"], arguments, _here_)) {
   var
   _brighten = function(r,g,b) {
      var 
      threshold = 255.999,
      maxVal = Math.max(r, g, b),
      sum = r + g + b
      
      if(threshold >= maxVal) return [Math.floor(r), Math.floor(g), Math.floor(b)]
      if(3 * threshold <= sum) return [Math.floor(threshold), Math.floor(threshold), Math.floor(threshold)]
      
      var 
      x = (3 * threshold - sum) / (3 * maxVal - sum),
      grey = threshold - x * maxVal
      
      return [Math.floor(grey + x * r), Math.floor(grey + x * g), Math.floor(grey + x * b)]
   },
   mod = 1 + f.percent / 100,
   channelValues = ("rgb" === f.cssColor.substring(0,3)) ? f.cssColor.substring(f.cssColor.indexOf("(") + 1, f.cssColor.length-1).split(/\u0020*,\u0020*/) : [parseInt(f.cssColor.substr(1,2), 16), parseInt(f.cssColor.substr(3,2), 16), parseInt(f.cssColor.substr(5,2), 16)],
   r = _brighten(parseInt(channelValues[0]) * mod, parseInt(channelValues[1]) * mod, parseInt(channelValues[2]) * mod)
   
   return 'rgb(' + r.join(',') + ');'
}
return "error expanding arguments in: " + _here_