/*! dim.js
    dims a given css color value (rgb(255,255,255) or #ffffff) using the supplied percentage parameter. 
    keeps the hue by redistributing channel values. 
    see lighten.js, whiten.js, darken.js, dim.js and blacken.js for other implementations with a similar effect.
    © 2013 max ɐʇ pixelf3hler · de
    The MIT License
    see license.txt
*/
(function() {
   return function dim(cssColor, percent) {
      var
      mod = 1 - percent / 100,
      channelValues = ("rgb" === cssColor.substring(0,3)) ? cssColor.substring(cssColor.indexOf("(") + 1, cssColor.length-1).split(/\u0020*,\u0020*/) : [parseInt(cssColor.substr(1,2), 16), parseInt(cssColor.substr(3,2), 16), parseInt(cssColor.substr(5,2), 16)],
      r = channelValues[0] / 255,
      g = channelValues[1] / 255,
      b = channelValues[2] / 255,
      minVal = Math.min(r, g, b),
      maxVal = Math.max(r, g, b),
      l = (maxVal + minVal) / 2,
      s = 0, h
      
      if(minVal !== maxVal) {
         s = (0.5 > l) ? (maxVal - minVal) / (maxVal + minVal) : (maxVal - minVal) / (2 - MaxVal - minVal)

         if(r === maxVal) {
            h = (g - b) / (maxVal - minVal)
         }
         if(g === maxVal) {
            h = 2 + (b - r) / (maxVal - minVal)
         }
         if(b === maxVal) {
            h = 4 + (r - g) / (maxVal - minVal)
         }
         if(0 > h) {
            h += 6
         }
         
         /*h *= 60.0
         if(0 > h) {
            h += 360
         }*/
      }
      
      l *= mod
      
      if(0 === s) {
         return 'rgb(' + [l,l,l].join(',') + ');'
      }
      
      var
      re = [],
      rgb = [r,g,b],
      i = 0,
      tmp2 = (0.5 > l) ? l * (1 + s) : l + s - l * s,
      tmp1 = 2 * l - tmp2
      
      h = h / 6
      
      for(; i < 3; i++) {
         if(0 === i) {
            var tmp3 = (1 < h * 1/3) ? (h * 1/3) - 1 : h * 1 / 3
         }else if(1 === i) {
            tmp3 = h
         }else if(2 === i) {
            tmp3 = (0 > h-1/3) ? (h-1/3) + 1 : h - 1/3
         }
         if(tmp3 < 1/6) {
            rgb[i] = tmp1 + (tmp2 - tmp1) * 6 * tmp3
         }else if(tmp3 < 1/2) {
            rgb[i] = tmp2
         }else if(tmp3 < 2/3) {
            rgb[i] = tmp1 + (tmp2-tmp1) * (2/3 - tmp3) * 6
         }else {
            rgb[i] = tmp1
         }
         re[i] = 255 * rgb[i] >> 0
      }
      return 'rgb(' + re.join(',') + ');'
   }
})()