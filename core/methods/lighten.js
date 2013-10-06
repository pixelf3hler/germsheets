/*! lighten.js
 
RGB to HSL   
Convert the RBG values to the range 0-1
Find min and max values of R, B, G, say Xmin and Xmax
Let L = (Xmax + Xmin) / 2
If Xmax and Xmin are equal, S is defined to be 0, and H is undefined but in programs usually written as 0
Otherwise, test L:
If L < 1/2, S=(Xmax - Xmin)/(Xmax + Xmin)
Else, S=(Xmax - Xmin)/(2 - Xmax - Xmin)
Now find H:
If R=Xmax, H = (G-B)/(Xmax - Xmin)
If G=Xmax, H = 2 + (B-R)/(Xmax - Xmin)
If B=Xmax, H = 4 + (R-G)/(Xmax - Xmin)
If H < 0 set H = H + 6. Notice that H ranges from 0 to 6. RGB space is a cube, and HSL space is a double hexacone, where L is the principal diagonal of the RGB cube. 
Thus corners of the RGB cube; red, yellow, green, cyan, blue, and magenta, become the vertices of the HSL hexagon. 
Then the value 0-6 for H tells you which section of the hexgon you are in. H is most commonly given as in degrees, so to convert H = H*60.0 
(If H is negative, add 360 to complete the conversion.)


HSL to RGB
If S=0, define R, G, and B all to L
Otherwise, test L:
If L < 1/2, temp2=L*(1+S)
Else, temp2=L+S - L*S
Let temp1 = 2 * L - temp2
Convert H to the range 0-1
For each of R, G, B, compute another temporary value, temp3, as follows:
for R, temp3=H+1/3; if temp3 > 1, temp3 = temp3 - 1
for G, temp3=H
for B, temp3=H-1/3; if temp3 < 0, temp3 = temp3 + 1
For each of R, G, B, do the following test:
If temp3 < 1/6, color=temp1+(temp2-temp1)*6*temp3
Else if temp3 < 1/2, color=temp2
Else if temp3 < 2/3, color=temp1+(temp2-temp1)*(2/3 - temp3)*6
Else color=temp1
Scale back to the range 0-255

*/
(function() {
   return function lighten(cssColor, percent) {
      var
      mod = 1 + percent / 100,
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
         re[i] = parseInt(255 * rgb[i])
      }
      return 'rgb(' + re.join(',') + ');'
   }
})()